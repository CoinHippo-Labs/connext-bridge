import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { Contract, constants, utils } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { BiMessageError, BiMessageCheck, BiMessageDetail, BiChevronDown, BiChevronUp } from 'react-icons/bi'

import SelectChain from '../select/chain'
import Wallet from '../wallet'
import Balance from '../balance'
import Image from '../image'
import Alert from '../alerts'
import { number_format, equals_ignore_case } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

const ABI = [
  // Read-Only Functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  // Authenticated Functions
  'function transfer(address to, uint amount) returns (boolean)',
  'function mint(address account, uint256 amount)',
  'function deposit() payable',
  'function withdraw(uint256 amount)',
]

export default (
  {
    token_id = 'test',
    faucet_amount =
      Number(
        process.env.NEXT_PUBLIC_FAUCET_AMOUNT
      ) ||
      1000,
    contract_data,
    className = '',
    titleClassName = '',
  },
) => {
  const dispatch = useDispatch()
  const {
    chains,
    assets,
    rpc_providers,
    wallet,
    balances,
  } = useSelector(state =>
    (
      {
        chains: state.chains,
        assets: state.assets,
        rpc_providers: state.rpc_providers,
        wallet: state.wallet,
        balances: state.balances,
      }
    ),
    shallowEqual,
  )
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    rpcs,
  } = { ...rpc_providers }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    chain_id,
    provider,
    address,
    signer,
  } = { ...wallet_data }
  const {
    balances_data,
  } = { ...balances }

  const [collapse, setCollapse] = useState(true)
  const [data, setData] = useState(null)
  const [minting, setMinting] = useState(null)
  const [mintResponse, setMintResponse] = useState(null)
  const [withdrawing, setWithdrawing] = useState(null)
  const [withdrawResponse, setWithdrawResponse] = useState(null)
  const [trigger, setTrigger] =
    useState(
      moment()
        .valueOf()
    )

  useEffect(
    () => {
      if (
        chain_id &&
        address
      ) {
        let {
          chain,
        } = { ...data }
        const {
          id,
        } = {
          ...(
            (chains_data || [])
              .find(c =>
                c?.chain_id === chain_id
              )
          ),
        }

        chain =
          id ||
          chain

        setData(
          {
            ...data,
            address:
              data ?
                data.address :
                address,
            chain,
          }
        )
      }
    },
    [chain_id, address],
  )

  useEffect(
    () => {
      setMintResponse(null)
      setWithdrawResponse(null)
    },
    [data],
  )

  const mint = async () => {
    setMinting(true)
    setMintResponse(null)

    if (is_wrapped) {
      setWithdrawing(false)
      setWithdrawResponse(null)
    }

    try {
      const asset_data = (assets_data || [])
        .find(a =>
          a?.id === token_id
        )
      const {
        contracts,
      } = { ...asset_data }

      const _contract_data =
        contract_data ||
        (contracts || [])
          .find(c =>
            c?.chain_id === chain_id
          )
      const {
        contract_address,
        decimals,
        wrapped,
      } = { ..._contract_data }

      const contract =
        new Contract(
          contract_address,
          ABI,
          signer,
        )

      const _address =
        is_wrapped ?
          wrapped?.contract_address ||
          contract_address :
          data?.address ||
          address

      const _amount =
        utils.parseUnits(
          (is_wrapped ?
            data?.amount :
            faucet_amount
          )
          .toString(),
          is_wrapped ?
            'ether' :
            decimals ||
            18,
        )

      const gasLimit = 500000

      console.log(
        is_wrapped ?
          '[wrap]' :
          '[mint]',
        is_wrapped ?
          /*{
            to: _address,
            value: _amount,
            overrides: {
              gasLimit,
            },
          }*/
          {
            value: _amount,
          } :
          {
            address: _address,
            amount: _amount,
          },
      )

      /*
      const wrap_request =
        is_wrapped &&
        await signer
          .populateTransaction(
            {
              to: _address,
              value: _amount,
              gasLimit,
            },
          )
      */

      const response =
        is_wrapped ?
          /*
          await signer
            .sendTransaction(
              wrap_request,
            )
          */
          await contract
            .deposit(
              {
                value: _amount,
                gasLimit,
              },
            ) :
          await contract
            .mint(
              _address,
              _amount,
            )

      const {
        hash,
      } = { ...response }

      const receipt =
        await signer.provider
          .waitForTransaction(
            hash,
          )

      const {
        status,
      } = { ...receipt }

      setMintResponse(
        {
          status:
            !status ?
              'failed' :
              'success',
          message:
            !status ?
              `Failed to ${
                is_wrapped ?
                  'wrap' :
                  'faucet'
              }` :
              `${
                is_wrapped ?
                  'Wrap' :
                  'Faucet'
              } Successful`,
          ...response,
        }
      )

      if (status) {
        getBalances(chain)
      }
    } catch (error) {
      let message = 
        error?.reason ||
        error?.data?.message ||
        error?.message

      console.log(
        `[${
          is_wrapped ?
            'wrap' :
            'mint'
        } error]`,
        {
          error,
        },
      )

      const code =
        _.slice(
          (message || '')
            .toLowerCase()
            .split(' ')
            .filter(s => s),
          0,
          2,
        )
        .join('_')

      if (message?.includes('gas required exceeds')) {
        message = 'Insufficient balance when trying to wrap.'
      }

      switch (code) {
        case 'user_rejected':
          break
        default:
          setMintResponse(
            {
              status: 'failed',
              message,
              code,
            }
          )
          break
      }
    }

    setMinting(false)

    if (is_wrapped) {
      setTrigger(
        moment()
          .valueOf()
      )
    }
  }

  const withdraw = async () => {
    setWithdrawing(true)
    setWithdrawResponse(null)
    setMinting(false)
    setMintResponse(null)

    try {
      const asset_data = (assets_data || [])
        .find(a =>
          a?.id === token_id
        )
      const {
        contracts,
      } = { ...asset_data }

      const _contract_data =
        contract_data ||
        (contracts || [])
          .find(c =>
            c?.chain_id === chain_id
          )
      const {
        wrapped,
      } = { ..._contract_data }
      let {
        contract_address,
        decimals,
      } = { ...wrapped }

      contract_address =
        contract_address ||
        _contract_data?.contract_address

      decimals =
        decimals ||
        _contract_data?.decimals ||
        18

      const contract =
        new Contract(
          contract_address,
          ABI,
          signer,
        )

      const _amount =
        utils.parseUnits(
          (
            data?.amount ||
            0
          )
          .toString(),
          'ether',
        )

      const gasLimit = 500000

      console.log(
        '[unwrap]',
        {
          amount: _amount,
        },
      )

      const response =
        await contract
          .withdraw(
            _amount,
          )

      const {
        hash,
      } = { ...response }

      const receipt =
        await signer.provider
          .waitForTransaction(
            hash,
          )

      const {
        status,
      } = { ...receipt }

      setWithdrawResponse(
        {
          status:
            !status ?
              'failed' :
              'success',
          message:
            !status ?
              'Failed to unwrap' :
              'Unwrap Successful',
          ...response,
        }
      )

      if (status) {
        getBalances(chain)
      }
    } catch (error) {
      let message = 
        error?.reason ||
        error?.data?.message ||
        error?.message

      console.log(
        '[unwrap error]',
        {
          error,
        },
      )

      const code =
        _.slice(
          (message || '')
            .toLowerCase()
            .split(' ')
            .filter(s => s),
          0,
          2,
        )
        .join('_')

      if (message?.includes('gas required exceeds')) {
        message = 'Insufficient balance when trying to unwrap.'
      }

      switch (code) {
        case 'user_rejected':
          break
        default:
          setWithdrawResponse(
            {
              status: 'failed',
              message,
              code,
            }
          )
          break
      }
    }

    setWithdrawing(false)
    setTrigger(
      moment()
        .valueOf()
    )
  }

  const getBalances = chain => {
    const getBalance = async (
      chain_id,
      contract_data,
    ) => {
      const {
        contract_address,
        next_asset,
        wrapable,
      } = { ...contract_data }

      const provider = rpcs?.[chain_id]

      if (
        address &&
        provider
      ) {
        const {
          symbol,
          image,
        } = {
          ...(
            assets_data
              .find(a =>
                (a?.contracts || [])
                  .findIndex(c =>
                    c?.chain_id === chain_id &&
                    equals_ignore_case(
                      c?.contract_address,
                      contract_address,
                    )
                  ) > -1
              )
          ),
        }

        const contracts =
          _.concat(
            {
              ...contract_data,
              contract_address: constants.AddressZero,
              symbol,
              image,
            },
            {
              ...contract_data,
            },
            next_asset &&
            {
              ...contract_data,
              ...next_asset,
            },
          )
          .filter(c => c?.contract_address)

        const balances = []

        for (const contract of contracts) {
          const {
            contract_address,
            decimals,
          } = { ...contract }

          let balance

          if (contract_address === constants.AddressZero) {
            balance =
              await provider
                .getBalance(
                  address,
                )
          }
          else {
            const contract =
              new Contract(
                contract_address,
                [
                  'function balanceOf(address owner) view returns (uint256)',
                ],
                provider,
              )

            balance =
              await contract
                .balanceOf(
                  address,
                )
          }

          if (
            balance ||
            !(
              (balances_data?.[`${chain_id}`] || [])
                .findIndex(c =>
                  equals_ignore_case(
                    c?.contract_address,
                    contract_address,
                  )
                ) > -1
            )
          ) {
            balances
              .push(
                {
                  ...contract,
                  amount:
                    balance &&
                    utils.formatUnits(
                      balance,
                      decimals ||
                      18,
                    ),
                }
              )
          }
        }

        if (balances.length > 0) {
          dispatch(
            {
              type: BALANCES_DATA,
              value: {
                [`${chain_id}`]: balances,
              },
            }
          )
        }
      }
    }

    const {
      chain_id,
    } = {
      ...(
        (chains_data || [])
          .find(c =>
            c?.id === chain
          )
      ),
    }

    const contracts_data =
      (assets_data || [])
        .map(a => {
          const {
            contracts,
          } = { ...a }

          return {
            ...a,
            ...(
              (contracts || [])
                .find(c =>
                  c?.chain_id === chain_id
                )
            ),
          }
        })
        .filter(a => a?.contract_address)
        .map(a => {
          const {
            next_asset,
          } = { ...a };
          let {
            contract_address,
          } = {  ...a }

          contract_address = contract_address.toLowerCase()

          if (next_asset?.contract_address) {
            next_asset.contract_address = next_asset.contract_address.toLowerCase()
          }

          return {
            ...a,
            contract_address,
            next_asset,
          }
        })

    contracts_data
      .forEach(c =>
        getBalance(
          chain_id,
          c,
        )
      )
  }

  const asset_data = (assets_data || [])
    .find(a =>
      a?.id === token_id
    )

  let {
    symbol,
  } = { ...asset_data }

  const {
    wrapped,
    wrapable,
  } = { ...contract_data }

  symbol =
    wrapped?.symbol ||
    symbol

  const is_wrapped =
    wrapped ||
    wrapable

  const fields =
    is_wrapped ?
      [
        {
          label: 'Amount',
          name: 'amount',
          type: 'number',
          placeholder: 'Amount to wrap / unwrap',
        },
      ] :
      [
        {
          label: 'Chain',
          name: 'chain',
          type: 'select-chain',
          placeholder: 'Select chain to faucet',
        },
        {
          label: 'Recipient Address',
          name: 'address',
          type: 'text',
          placeholder: 'Faucet token to an address',
        },
      ]

  const {
    chain,
  } = { ...data }

  const chain_data = (chains_data || [])
    .find(c =>
      is_wrapped ?
        c?.chain_id === contract_data?.chain_id :
        c?.id === chain
    )
  const {
    provider_params,
    image,
    explorer,
  } = { ...chain_data }
  const {
    nativeCurrency,
  } = { ..._.head(provider_params) }
  const {
    url,
    transaction_path,
  } = { ...explorer }

  const native_balance = (balances_data?.[chain_data?.chain_id] || [])
    .find(b =>
      equals_ignore_case(
        b?.contract_address,
        constants.AddressZero,
      )
    )

  const native_amount = native_balance?.amount

  const wrapped_balance = (balances_data?.[chain_data?.chain_id] || [])
    .find(b =>
      equals_ignore_case(
        b?.contract_address,
        wrapped?.contract_address ||
        contract_data?.contract_address,
      )
    )

  const wrapped_amount = wrapped_balance?.amount

  const callResponse =
    mintResponse ||
    withdrawResponse

  const {
    status,
    message,
    hash,
  } = { ...callResponse }

  const hasAllFields =
    fields.length ===
    fields
      .filter(f =>
        data?.[f.name]
      )
      .length

  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  const disabled =
    minting ||
    withdrawing

  const wrap_disabled =
    !!(
      is_wrapped &&
      native_amount &&
      data?.amount &&
      (
        Number(native_amount) < Number(data.amount) ||
        Number(data.amount) <= 0
      )
    )

  const unwrap_disabled =
    !!(
      is_wrapped &&
      wrapped_amount &&
      data?.amount &&
      (
        Number(wrapped_amount) < Number(data.amount) ||
        Number(data.amount) <= 0
      )
    )

  return (
    asset_data &&
    (
      <div
        className={
          className ||
          'w-full max-w-md bg-white dark:bg-slate-900 rounded border dark:border-slate-800 flex flex-col items-center justify-center space-y-2 mx-auto p-3 sm:p-6'
        }
      >
        <button
          onClick={() => setCollapse(!collapse)}
          className={`w-full flex items-center justify-center text-base font-semibold space-x-1.5 ${titleClassName}`}
        >
          {
            !signer &&
            (
              <span className="whitespace-nowrap text-xs sm:text-base font-medium">
                Connect wallet to
              </span>
            )
          }
          <span className="tracking-wider whitespace-nowrap text-xs sm:text-base font-medium">
            {is_wrapped ?
              <>
                Wrap or unwrap {symbol}
              </> :
              'Faucet'
            }
          </span>
          {collapse ?
            <BiChevronDown
              size={18}
            /> :
            <BiChevronUp
              size={18}
            />
          }
        </button>
        {
          !collapse &&
          (
            <div className="w-full">
              {
                is_wrapped &&
                signer &&
                (
                  <div className="form-element mt-2">
                    <div className="form-label text-slate-600 dark:text-slate-200 font-medium">
                      Balance
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Balance
                        chainId={
                          contract_data?.chain_id ||
                          chain_id
                        }
                        asset={token_id}
                        contractAddress={constants.AddressZero}
                        decimals={
                          nativeCurrency?.decimals ||
                          18
                        }
                        symbol={
                          nativeCurrency?.symbol ||
                          asset_data?.symbol
                        }
                        trigger={trigger}
                        className="bg-slate-100 dark:bg-slate-800 rounded py-1.5 px-2.5"
                      />
                      <Balance
                        chainId={
                          contract_data?.chain_id ||
                          chain_id
                        }
                        asset={token_id}
                        contractAddress={
                          wrapped?.contract_address ||
                          contract_data?.contract_address
                        }
                        decimals={
                          wrapped?.decimals ||
                          contract_data?.decimals ||
                          18
                        }
                        symbol={
                          wrapped?.symbol ||
                          contract_data?.symbol
                        }
                        trigger={trigger}
                        className="bg-slate-100 dark:bg-slate-800 rounded py-1.5 px-2.5"
                      />
                    </div>
                  </div>
                )
              }
              {fields
                .map((f, i) => {
                  const {
                    label,
                    name,
                    type,
                    placeholder,
                  } = { ...f }

                  return (
                    <div
                      key={i}
                      className="form-element"
                    >
                      {
                        label &&
                        (
                          <div className="form-label text-slate-600 dark:text-slate-200 font-medium">
                            {label}
                          </div>
                        )
                      }
                      {type === 'select-chain' ?
                        <div className="-mt-2">
                          <SelectChain
                            disabled={disabled}
                            value={data?.[name]}
                            onSelect={c =>
                              setData(
                                {
                                  ...data,
                                  [`${name}`]: c,
                                }
                              )
                            }
                          />
                        </div> :
                        <input
                          type={type}
                          disabled={disabled}
                          placeholder={placeholder}
                          value={data?.[name]}
                          onChange={e =>
                            setData(
                              {
                                ...data,
                                [`${f.name}`]: e.target.value,
                              }
                            )
                          }
                          className="form-input rounded border-0 focus:ring-0"
                        />
                      }
                    </div>
                  )
                })
              }
              {
                signer &&
                hasAllFields &&
                (
                  <div className="flex justify-end space-x-2 mb-2">
                    <button
                      disabled={disabled}
                      onClick={() => {
                        const {
                          id,
                        } = {
                          ...chains_data?.find(c =>
                            c?.chain_id === chain_id
                          ),
                        }

                        setCollapse(!collapse)
                        setData(
                          {
                            ...data,
                            address,
                            chain: id,
                          }
                        )
                      }}
                      className={`bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900 ${disabled ? 'cursor-not-allowed' : ''} rounded font-medium py-2 px-3`}
                    >
                      Cancel
                    </button>
                    {chain_data?.chain_id !== chain_id ?
                      !className &&
                      (
                        <Wallet
                          connectChainId={chain_data?.chain_id}
                          className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 ${disabled ? 'cursor-not-allowed' : ''} rounded flex items-center text-white text-sm font-medium space-x-1.5 py-2 px-3`}
                        >
                          <span className="mr-1 sm:mr-1.5">
                            {is_walletconnect ?
                              'Reconnect' :
                              'Switch'
                            } to
                          </span>
                          {
                            image &&
                            (
                              <Image
                                src={image}
                                alt=""
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            )
                          }
                          <span className="font-semibold">
                            {chain_data?.name}
                          </span>
                        </Wallet>
                      ) :
                      <>
                        <button
                          disabled={
                            disabled ||
                            wrap_disabled
                          }
                          onClick={() => mint()}
                          className={
                            `${
                              disabled ||
                              wrap_disabled ?
                                'bg-blue-400 dark:bg-blue-500 cursor-not-allowed' :
                                'bg-blue-600 hover:bg-blue-700'
                            } rounded flex items-center text-white font-semibold space-x-1.5 py-2 px-3`
                          }
                        >
                          {
                            minting &&
                            (
                              <TailSpin
                                color="white"
                                width="18"
                                height="18"
                              />
                            )
                          }
                          {is_wrapped ?
                            <span>
                              Wrap
                            </span> :
                            <>
                              <span>
                                Faucet
                              </span>
                              <span className="font-semibold">
                                {number_format(
                                  faucet_amount,
                                  '0,0.00',
                                )}
                              </span>
                            </>
                          }
                          {
                            !is_wrapped &&
                            (
                              <span>
                                {
                                  contract_data?.symbol ||
                                  symbol
                                }
                              </span>
                            )
                          }
                        </button>
                        {
                          is_wrapped &&
                          (
                            <button
                              disabled={
                                disabled ||
                                unwrap_disabled
                              }
                              onClick={() => withdraw()}
                              className={
                                `${
                                  disabled ||
                                  unwrap_disabled ?
                                    'bg-red-400 dark:bg-red-500 cursor-not-allowed' :
                                    'bg-red-600 hover:bg-red-700'
                                } rounded flex items-center text-white font-semibold space-x-1.5 py-2 px-3`
                              }
                            >
                              {
                                withdrawing &&
                                (
                                  <TailSpin
                                    color="white"
                                    width="18"
                                    height="18"
                                  />
                                )
                              }
                              <span>
                                Unwrap
                              </span>
                            </button>
                          )
                        }
                      </>
                    }
                  </div>
                )
              }
            </div>
          )
        }
        {
          callResponse &&
          (
            <div className="w-full mx-2 sm:mx-4">
              <Alert
                color={
                  `${
                    status === 'failed' ?
                      'bg-red-400 dark:bg-red-500' :
                      status === 'success' ?
                        'bg-green-400 dark:bg-green-500' :
                        'bg-blue-400 dark:bg-blue-500'
                  } text-white mt-1 mb-2`
                }
                icon={
                  status === 'failed' ?
                    <BiMessageError
                      className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mt-0.5 mr-2.5"
                    /> :
                    status === 'success' ?
                      <BiMessageCheck
                        className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mt-0.5 mr-2.5"
                      /> :
                      <BiMessageDetail
                        className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mt-0.5 mr-2.5"
                      />
                }
                rounded={true}
                className="mx-0"
              >
                <div className="flex flex-wrap items-center justify-between">
                  <span className="break-all leading-5 text-sm font-medium mr-1">
                    {message}
                  </span>
                  {
                    ['success'].includes(status) &&
                    hash &&
                    url &&
                    (
                      <a
                        href={`${url}${transaction_path?.replace('{tx}', hash)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pr-1.5"
                      >
                        <span className="whitespace-nowrap font-semibold">
                          View on {explorer.name}
                        </span>
                      </a>
                    )
                  }
                </div>
              </Alert>
            </div>
          )
        }
      </div>
    )
  )
}
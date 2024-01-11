import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { Contract, constants } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
import moment from 'moment'
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'

import Spinner from '../spinner'
import Alert from '../alert'
import Balance from '../balance'
import Image from '../image'
import Wallet from '../wallet'
import SelectChain from '../select/chain'
import { getChainData, getAssetData, getContractData, getBalanceData } from '../../lib/object'
import { parseUnits, isNumber } from '../../lib/number'
import { numberToFixed, parseError } from '../../lib/utils'
import { GET_BALANCES_DATA } from '../../reducers/types'

const GAS_LIMIT = 500000
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

const getInputFields = is_wrapped => is_wrapped ?
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

export default (
  {
    tokenId = 'test',
    faucetAmount = 1000,
    contractData,
    defaultChain,
    titleClassName = '',
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const { chains, assets, wallet, balances } = useSelector(state => ({ chains: state.chains, assets: state.assets, wallet: state.wallet, balances: state.balances }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { chain_id, signer, address } = { ...wallet_data }
  const { balances_data } = { ...balances }

  const [data, setData] = useState(null)
  const [collapse, setCollapse] = useState(false)
  const [minting, setMinting] = useState(null)
  const [mintResponse, setMintResponse] = useState(null)
  const [withdrawing, setWithdrawing] = useState(null)
  const [withdrawResponse, setWithdrawResponse] = useState(null)
  const [trigger, setTrigger] = useState(moment().valueOf())

  useEffect(
    () => {
      if (!signer || (chain_id && address)) {
        const { chain } = { ...data }
        const { id } = { ...getChainData(chain_id, chains_data) }
        setData({ ...data, chain: id || chain || defaultChain, address: data ? data.address || address : address })
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

  const { chain } = { ...data }
  const asset_data = getAssetData(tokenId, assets_data)
  const { contracts } = { ...asset_data }
  let { symbol } = { ...asset_data }
  const { wrapped, wrappable } = { ...contractData }
  symbol = wrapped?.symbol || symbol
  const is_wrapped = wrapped || wrappable

  const chain_data = getChainData(is_wrapped ? contractData?.chain_id : chain, chains_data)
  const { native_token, explorer, image } = { ...chain_data }
  const { url, transaction_path } = { ...explorer }

  const mint = async () => {
    setMinting(true)
    setMintResponse(null)

    if (is_wrapped) {
      setWithdrawing(false)
      setWithdrawResponse(null)
    }

    try {
      const contract_data = contractData || getContractData(chain_id, contracts)
      const { contract_address, decimals, wrapped } = { ...contract_data }
      const _address = is_wrapped ? wrapped?.contract_address || contract_address : data?.address || address
      const _amount = parseUnits(is_wrapped ? data?.amount : faucetAmount, is_wrapped ? 18 : decimals)

      console.log(is_wrapped ? '[wrap]' : '[mint]', is_wrapped ? { value: _amount } : { address: _address, amount: _amount })
      const contract = new Contract(contract_address, ABI, signer)
      const response = is_wrapped ? await contract.deposit({ value: _amount, gasLimit: GAS_LIMIT }) : await contract.mint(_address, _amount)
      const { hash } = { ...response }
      const receipt = await signer.provider.waitForTransaction(hash)
      const { status } = { ...receipt }

      setMintResponse({
        status: !status ? 'failed' : 'success',
        message: !status ? `Failed to ${is_wrapped ? 'wrap' : 'faucet'}` : `${is_wrapped ? 'Wrap' : 'Faucet'} Successful`,
        ...response,
      })
      if (status) {
        getBalances(chain)
      }
    } catch (error) {
      const response = parseError(error)
      console.log(`[${is_wrapped ? 'wrap' : 'mint'} error]`, error)
      const { code } = { ...response }
      let { message } = { ...response }
      if (message?.includes('gas required exceeds')) {
        message = 'Insufficient balance when trying to wrap.'
      }
      switch (code) {
        case 'user_rejected':
          break
        default:
          setMintResponse({ status: 'failed', ...response, message })
          break
      }
    }

    setMinting(false)
    if (is_wrapped) {
      setTrigger(moment().valueOf())
    }
  }

  const withdraw = async () => {
    setWithdrawing(true)
    setWithdrawResponse(null)
    setMinting(false)
    setMintResponse(null)

    try {
      const contract_data = contractData || getContractData(chain_id, contracts)
      const { wrapped } = { ...contract_data }
      let { contract_address, decimals } = { ...wrapped }
      contract_address = contract_address || contract_data?.contract_address
      decimals = decimals || contract_data?.decimals || 18
      const _amount = parseUnits(data?.amount)

      console.log('[unwrap]', { amount: _amount })
      const contract = new Contract(contract_address, ABI, signer)
      const response = await contract.withdraw(_amount)
      const { hash } = { ...response }
      const receipt = await signer.provider.waitForTransaction(hash)
      const { status } = { ...receipt }

      setWithdrawResponse({
        status: !status ? 'failed' : 'success',
        message: !status ? 'Failed to unwrap' : 'Unwrap Successful',
        ...response,
      })
      if (status) {
        getBalances(chain)
      }
    } catch (error) {
      const response = parseError(error)
      console.log('[unwrap error]', error)
      const { code } = { ...response }
      let { message } = { ...response }
      if (message?.includes('gas required exceeds')) {
        message = 'Insufficient balance when trying to unwrap.'
      }
      switch (code) {
        case 'user_rejected':
          break
        default:
          setWithdrawResponse({ status: 'failed', ...response, message })
          break
      }
    }

    setWithdrawing(false)
    setTrigger(moment().valueOf())
  }

  const getBalances = chain => dispatch({ type: GET_BALANCES_DATA, value: { chain } })

  const fields = getInputFields(is_wrapped)
  const has_all_fields = fields.length === fields.filter(f => data?.[f.name]).length

  const native_amount = getBalanceData(chain_data?.chain_id, ZeroAddress, balances_data)?.amount
  const wrapped_amount = getBalanceData(chain_data?.chain_id, wrapped?.contract_address || contractData?.contract_address, balances_data)?.amount
  const wrap_disabled = !!(is_wrapped && isNumber(native_amount) && isNumber(data?.amount) && (Number(native_amount) < Number(data.amount) || Number(data.amount) <= 0))
  const unwrap_disabled = !!(is_wrapped && isNumber(wrapped_amount) && isNumber(data?.amount) && (Number(wrapped_amount) < Number(data.amount) || Number(data.amount) <= 0))

  const callResponse = mintResponse || withdrawResponse
  const { status, message, hash } = { ...callResponse }
  const disabled = minting || withdrawing

  return asset_data && (
    <div className={className || 'w-full max-w-md 3xl:max-w-xl bg-white dark:bg-slate-900 rounded border dark:border-slate-800 flex flex-col items-center justify-center space-y-2 mx-auto p-3 sm:p-6 3xl:p-8'}>
      <button
        onClick={() => setCollapse(!collapse)}
        className={`w-full flex items-center justify-center text-base font-semibold space-x-1.5 ${titleClassName}`}
      >
        {!signer && is_wrapped && (
          <span className="whitespace-nowrap text-xs sm:text-base 3xl:text-2xl font-medium">
            Connect wallet to
          </span>
        )}
        <span className="whitespace-nowrap text-xs sm:text-base 3xl:text-2xl font-medium">
          {is_wrapped ? `Wrap or unwrap ${symbol}` : `Get ${symbol} tokens`}
        </span>
        {collapse ? <BiChevronDown size={18} /> : <BiChevronUp size={18} />}
      </button>
      {!collapse && (
        <div className="w-full 3xl:space-y-8">
          {is_wrapped && signer && (
            <div className="form-element mt-2">
              <div className="form-label text-slate-600 dark:text-slate-200 font-medium">
                Balance
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Balance
                  chainId={contractData?.chain_id || chain_id}
                  asset={tokenId}
                  contractAddress={ZeroAddress}
                  decimals={native_token?.decimals || 18}
                  symbol={native_token?.symbol || asset_data.symbol}
                  trigger={trigger}
                  className="bg-slate-100 dark:bg-slate-800 rounded py-1.5 px-2.5"
                />
                <Balance
                  chainId={contractData?.chain_id || chain_id}
                  asset={tokenId}
                  contractAddress={wrapped?.contract_address || contractData?.contract_address}
                  decimals={wrapped?.decimals || contractData?.decimals || 18}
                  symbol={wrapped?.symbol || contractData?.symbol}
                  trigger={trigger}
                  className="bg-slate-100 dark:bg-slate-800 rounded py-1.5 px-2.5"
                />
              </div>
            </div>
          )}
          {fields.map((f, i) => {
            const { label, name, type, placeholder } = { ...f }
            return (
              <div key={i} className="form-element 3xl:space-y-2">
                {label && (
                  <div className="form-label text-slate-600 dark:text-slate-200 3xl:text-xl font-medium">
                    {label}
                  </div>
                )}
                {type === 'select-chain' ?
                  <div>
                    <SelectChain
                      disabled={disabled}
                      value={data?.[name]}
                      onSelect={c => setData({ ...data, [name]: c })}
                    />
                  </div> :
                  <input
                    type={type}
                    disabled={disabled}
                    placeholder={placeholder}
                    value={data?.[name]}
                    onChange={
                      e => {
                        let value
                        if (type === 'number') {
                          const regex = /^[0-9.\b]+$/
                          if (e.target.value === '' || regex.test(e.target.value)) {
                            value = e.target.value
                          }
                          if (typeof value === 'string') {
                            if (value.startsWith('.')) {
                              value = `0${value}`
                            }
                            value = numberToFixed(value)
                          }
                        }
                        else {
                          value = e.target.value
                        }
                        setData({ ...data, [f.name]: value })
                      }
                    }
                    className="form-input rounded border-0 focus:ring-0 3xl:text-2xl"
                  />
                }
              </div>
            )
          })}
          {signer && has_all_fields && (
            <div className="flex justify-end space-x-2 mb-2">
              <button
                disabled={disabled}
                onClick={
                  () => {
                    const { id } = { ...getChainData(chain_id, chains_data) }
                    setData({ ...data, chain: id || defaultChain, address })
                    setCollapse(!collapse)
                  }
                }
                className={`bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900 ${disabled ? 'cursor-not-allowed' : ''} rounded font-medium py-2 px-3`}
              >
                Cancel
              </button>
              {chain_data?.chain_id !== chain_id ?
                <Wallet
                  connectChainId={chain_data?.chain_id}
                  className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 ${disabled ? 'cursor-not-allowed' : ''} rounded flex items-center text-white text-sm font-medium space-x-1.5 py-2 px-3`}
                >
                  <span>Switch to</span>
                  {image && (
                    <Image
                      src={image}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                  <span className="font-medium">
                    {chain_data?.name}
                  </span>
                </Wallet> :
                <>
                  <button
                    disabled={disabled || wrap_disabled}
                    onClick={() => mint()}
                    className={`${disabled || wrap_disabled ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} rounded flex items-center text-white font-semibold space-x-1.5 py-2 px-3`}
                  >
                    {minting && <div><Spinner width={18} height={18} color="white" /></div>}
                    {is_wrapped ?
                      <span>Wrap</span> :
                      <>
                        <span>Faucet</span>
                        <span className="font-semibold">
                          {faucetAmount}
                        </span>
                        <span>{contractData?.symbol || symbol}</span>
                      </>
                    }
                  </button>
                  {is_wrapped && (
                    <button
                      disabled={disabled || unwrap_disabled}
                      onClick={() => withdraw()}
                      className={`${disabled || unwrap_disabled ? 'bg-red-400 dark:bg-red-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} rounded flex items-center text-white font-semibold space-x-1.5 py-2 px-3`}
                    >
                      {withdrawing && <div><Spinner width={18} height={18} color="white" /></div>}
                      <span>Unwrap</span>
                    </button>
                  )}
                </>
              }
            </div>
          )}
        </div>
      )}
      {callResponse && (
        <div className="w-full mx-2 sm:mx-4">
          <Alert status={status} className="text-white mt-1 mb-2 mx-0">
            <div className="flex flex-wrap items-center justify-between">
              <span className="break-all leading-5 text-sm font-medium mr-1">
                {message}
              </span>
              {status === 'success' && hash && url && (
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
              )}
            </div>
          </Alert>
        </div>
      )}
    </div>
  )
}
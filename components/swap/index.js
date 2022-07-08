import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import moment from 'moment'
import { BigNumber, Contract, FixedNumber, constants, utils } from 'ethers'
import Switch from 'react-switch'
import { TailSpin, Watch } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { TiArrowRight } from 'react-icons/ti'
import { MdSwapVert, MdClose } from 'react-icons/md'
import { BiMessageError, BiMessageCheck, BiMessageDetail, BiMessageEdit, BiEditAlt, BiCheckCircle } from 'react-icons/bi'

import Announcement from '../announcement'
import PoweredBy from '../powered-by'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import Info from './info'
import Balance from '../balance'
import Image from '../image'
import Wallet from '../wallet'
import Alert from '../alerts'
import Modal from '../modals'
import Copy from '../copy'
import { chainName } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { params_to_obj, number_format, ellipse, equals_ignore_case, sleep } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

const DEFAULT_SWAP_SLIPPAGE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_DEFAULT_SWAP_SLIPPAGE_PERCENTAGE) || 3

const DEFAULT_OPTIONS = {
  infiniteApprove: false,
  slippage: DEFAULT_SWAP_SLIPPAGE_PERCENTAGE,
}

export default () => {
  const dispatch = useDispatch()
  const { preferences, chains, assets, rpc_providers, dev, wallet, balances } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, rpc_providers: state.rpc_providers, dev: state.dev, wallet: state.wallet, balances: state.balances }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { rpcs } = { ...rpc_providers }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { chain_id, provider, web3_provider, address, signer } = { ...wallet_data }
  const { balances_data } = { ...balances }

  const router = useRouter()
  const { asPath } = { ...router }

  const [swap, setSwap] = useState({})
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [controller, setController] = useState(null)
  const [slippageEditing, setSlippageEditing] = useState(false)

  const [approving, setApproving] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [calling, setCalling] = useState(null)
  const [callResponse, setCallResponse] = useState(null)

  const [pair, setPair] = useState(null)
  const [pairTrigger, setPairTrigger] = useState(null)

  // get swap from path
  useEffect(() => {
    let updated = false
    const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
    let path = !asPath ? '/' : asPath.toLowerCase()
    path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path
    if (path.includes('on-')) {
      const paths = path.replace('/swap', '').split('-')
      const chain = paths[paths.indexOf('on') + 1]
      const chain_data = chains_data?.find(c => c?.id === chain)
      const asset = paths[0] !== 'on' ? paths[0] : null
      const asset_data = assets_data?.find(a => a?.id === asset || equals_ignore_case(a?.symbol, asset))
      if (chain_data) {
        swap.chain = chain
        updated = true
      }
      if (asset_data) {
        swap.asset = asset
        updated = true
      }
      if (params?.amount) {
        swap.amount = Number(params.amount)
        updated = true
      }
    }
    if (updated) {
      setSwap(swap)
      setPairTrigger(moment().valueOf())
    }
  }, [asPath, chains_data, assets_data])

  // set swap to path
  useEffect(() => {
    const params = {}
    if (swap) {
      const { chain, asset, amount } = { ...swap }
      if (chains_data?.findIndex(c => !c?.disabled && c?.id === chain) > -1) {
        params.chain = chain
        if (asset && assets_data?.findIndex(a => a?.id === asset && a.contracts?.findIndex(c => c?.chain_id === chains_data.find(_c => _c?.id === chain)?.chain_id) > -1) > -1) {
          params.asset = asset
        }
      }
      if (params.chain && params.asset && amount) {
        params.amount = amount
      }
    }
    if (Object.keys(params).length > 0) {
      const { chain, asset, amount } = { ...params }
      delete params.chain
      delete params.asset
      router.push(`/swap/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`, undefined, { shallow: true })
    }
    setApproveResponse(null)
    setCallResponse(null)
  }, [address, swap])

  // update balances
  useEffect(() => {
    const { chain } = { ...swap }
    const _chain = chains_data?.find(c => c?.chain_id === chain_id)?.id
    if (asPath && _chain && !chain) {
      const params = params_to_obj(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      if (!params?.chain && !asPath.includes('on-') && chains_data?.findIndex(c => !c?.disabled && c?.id === _chain) > -1) {
        setSwap({
          ...swap,
          chain: _chain,
        })
      }
      getBalances(_chain)
    }
  }, [asPath, chain_id, chains_data])

  // update balances
  useEffect(() => {
    dispatch({
      type: BALANCES_DATA,
      value: null,
    })
    if (address) {
      const { chain } = { ...swap }
      getBalances(chain)
    }
    else {
      reset('address')
    }
  }, [address])

  // update balances
  useEffect(() => {
    const getData = () => {
      if (address && !calling && !['pending'].includes(approveResponse?.status)) {
        const { chain } = { ...swap }
        getBalances(chain)
      }
    }
    getData()
    const interval = setInterval(() => getData(), 0.25 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [rpcs])

  // get pair
  useEffect(() => {
    const getData = async () => {
      if (sdk && address && swap?.chain) {
        try {
          const { chain, asset } = { ...swap }
          const chain_data = chains_data.find(c => c?.id === chain)
          const { domain_id } = { ...chain_data }
          const response = await sdk.nxtpSdkUtils.getPools(domain_id)
          setPair((response?.map(p => {
            const { symbol } = { ...p }
            const asset_data = assets_data.find(a => equals_ignore_case(a?.symbol, symbol) || a?.contracts?.findIndex(c => c?.chain_id === chain_data?.chain_id && equals_ignore_case(c?.symbol, symbol)) > -1)
            return {
              ...p,
              chain_data,
              asset_data,
            }
          }) || pair || []).find(p => equals_ignore_case(p?.symbol, asset)))
        } catch (error) {}
      }
    }
    getData()
  }, [sdk, address, pairTrigger])

  const getBalances = chain => {
    const getBalance = async (chain_id, contract_data) => {
      const contract_address = contract_data?.contract_address 
      const decimals = contract_data?.contract_decimals || 18
      const rpc = rpcs?.[chain_id]
      let balance
      if (rpc && contract_address) {
        if (contract_address === constants.AddressZero) {
          balance = await rpc.getBalance(address)
        }
        else {
          const contract = new Contract(contract_address, ['function balanceOf(address owner) view returns (uint256)'], rpc)
          balance = await contract.balanceOf(address)
        }
      }
      dispatch({
        type: BALANCES_DATA,
        value: {
          [`${chain_id}`]: [{
            ...contract_data,
            amount: balance ? Number(utils.formatUnits(balance, decimals)) : null,
          }],
        },
      })
    }
    const chain_id = chains_data?.find(c => c?.id === chain)?.chain_id
    const contracts = assets_data?.map(a => {
      return {
        ...a,
        ...a?.contracts?.find(c => c?.chain_id === chain_id),
      }
    }).filter(a => a?.contract_address)
    contracts?.forEach(c => getBalance(chain_id, c))
  }

  const reset = async origin => {
    const reset_swap = origin !== 'address'
    if (reset_swap) {
      setSwap({
        ...swap,
        amount: null,
      })
    }
    setOptions(DEFAULT_OPTIONS)

    setApproving(null)
    setApproveResponse(null)

    setCalling(null)
    setCallResponse(null)

    setPairTrigger(moment().valueOf())

    const { chain } = { ...swap }
    getBalances(chain)
  }

  const call = async () => {
    setCalling(true)
    let success = false
    if (sdk) {
      const { chain, asset, amount } = { ...swap }
      const chain_data = chains_data?.find(c => c?.id === chain)
      const asset_data = assets_data?.find(a => a?.id === asset)
      const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
      const symbol = contract_data?.symbol || asset_data?.symbol
      const decimals = contract_data?.contract_decimals || 18
      const { infiniteApprove, slippage } = { ...options }
      // const xcallParams = {
      //   params: {
      //     originDomain: source_chain_data?.domain_id,
      //     destinationDomain: destination_chain_data?.domain_id,
      //   },
      //   transactingAssetId: source_contract_data?.contract_address,
      //   amount: utils.parseUnits(amount?.toString() || '0', decimals).toString(),
      //   relayerFee: '0',
      // }
      // let failed = false
      // try {
      //   const approve_request = await sdk.nxtpSdkBase.approveIfNeeded(xcallParams.params.originDomain, xcallParams.transactingAssetId, xcallParams.amount, infiniteApprove)
      //   if (approve_request) {
      //     setApproving(true)
      //     const approve_response = await signer.sendTransaction(approve_request)
      //     const tx_hash = approve_response?.hash
      //     setApproveResponse({
      //       status: 'pending',
      //       message: `Wait for ${source_symbol} approval`,
      //       tx_hash,
      //     })
      //     const approve_receipt = await signer.provider.waitForTransaction(tx_hash)
      //     setApproveResponse(approve_receipt?.status ?
      //       null : {
      //         status: 'failed',
      //         message: `Failed to approve ${source_symbol}`,
      //         tx_hash,
      //       }
      //     )
      //     failed = !approve_receipt?.status
      //     setApproving(false)
      //   }
      // } catch (error) {
      //   setApproveResponse({ status: 'failed', message: error?.data?.message || error?.message })
      //   failed = true
      //   setApproving(false)
      // }
      // if (!failed) {
      //   try {
      //     const xcall_request = await sdk.nxtpSdkBase.xcall(xcallParams)
      //     if (xcall_request) {
      //       let gas_limit = await signer.estimateGas(xcall_request)
      //       if (gas_limit) {
      //         gas_limit = FixedNumber.fromString(gas_limit.toString())
      //           .mulUnsafe(FixedNumber.fromString(GAS_LIMIT_ADJUSTMENT.toString()))
      //           .round(0).toString().replace('.0', '')
      //         xcall_request.gasLimit = gas_limit
      //       }
      //       const xcall_response = await signer.sendTransaction(xcall_request)
      //       const tx_hash = xcall_response?.hash
      //       const xcall_receipt = await signer.provider.waitForTransaction(tx_hash)
      //       setXcall(xcall_receipt)
      //       failed = !xcall_receipt?.status
      //       setXcallResponse({
      //         status: failed ? 'failed' : 'success',
      //         message: failed ? 'Failed to send transaction' : `${source_symbol} transfer detected, waiting for execution.`,
      //         tx_hash,
      //       })
      //       success = true
      //     }
      //   } catch (error) {
      //     setXcallResponse({ status: 'failed', message: error?.data?.message || error?.message })
      //     failed = true
      //   }
      // }
    }
    setCalling(false)
    if (sdk && address && success) {
      await sleep(2 * 1000)
      setPairTrigger(moment().valueOf())
    }
  }

  const { chain, asset, amount, from } = { ...swap }
  const chain_data = chains_data?.find(c => c?.id === chain)
  const asset_data = assets_data?.find(a => a?.id === asset)

  const x_asset_data = asset_data
  const y_asset_data = asset_data
  const x_contract_data = x_asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
  const y_contract_data = y_asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
  const x_symbol = x_contract_data?.symbol || x_asset_data?.symbol
  const y_symbol = y_contract_data?.symbol || y_asset_data?.symbol
  const x_amount = amount
  const y_amount = amount

  const liquidity_amount = amount
  const min_amount = 0
  const valid = amount > min_amount && amount < liquidity_amount

  const wrong_chain = chain_data && chain_id !== chain_data.chain_id && !calling
  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  const disabled = calling || approving

  return (
    <div className="mb-4">
      <div className="flex justify-center">
        <div className="mt-4 sm:mt-8">
          <Announcement />
        </div>
        <div className="w-full flex flex-col space-y-4 my-2 sm:my-4 mx-1 sm:mx-4">
          <h1 className="text-2xl font-bold">
            Swap
          </h1>
          <div className={`${valid ? 'border-2 border-blue-400 dark:border-blue-800 shadow-xl shadow-blue-200 dark:shadow-blue-600' : 'shadow dark:shadow-slate-400'} rounded-2xl flex flex-col items-center space-y-4 py-8 px-6`}>
            <div className="w-full space-y-5">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 sm:space-y-0 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 dark:text-slate-600 text-sm font-bold">
                    From
                  </span>
                  {web3_provider && x_asset_data && (
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 dark:text-slate-200 font-semibold">
                        Balance:
                      </span>
                      <Balance
                        chainId={chain_data?.chain_id}
                        asset={x_asset_data?.id}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="w-full flex items-center justify-between sm:justify-start space-x-2 sm:space-x-4">
                    <SelectChain
                      disabled={disabled}
                      value={chain_data?.id}
                      onSelect={c => {
                        console.log('[Swap]', {
                          swap: {
                            ...swap,
                            chain: c,
                            amount: null,
                          },
                        })
                        setSwap({
                          ...swap,
                          chain: c,
                          amount: null,
                        })
                        getBalances(c)
                      }}
                      origin=""
                    />
                    <SelectAsset
                      disabled={disabled}
                      value={asset_data?.id}
                      onSelect={a => {
                        console.log('[Swap]', {
                          swap: {
                            ...swap,
                            asset: a,
                            amount: null,
                          },
                        })
                        setSwap({
                          ...swap,
                          asset: a,
                          amount: null,
                        })
                        getBalances(chain)
                      }}
                      chain={chain_data?.id}
                      origin=""
                    />
                  </div>
                  <div className="w-full flex items-center justify-between space-x-3">
                    <DebounceInput
                      debounceTimeout={300}
                      size="small"
                      type="number"
                      placeholder="0.00"
                      disabled={disabled || !asset_data?.id}
                      value={typeof x_amount === 'number' && x_amount >= 0 ? x_amount : ''}
                      onChange={e => {
                        const regex = /^[0-9.\b]+$/
                        let value
                        if (e.target.value === '' || regex.test(e.target.value)) {
                          value = e.target.value
                        }
                        value = value < 0 ? 0 : value
                        console.log('[Swap]', {
                          swap: {
                            ...swap,
                            amount: value && !isNaN(value) ? Number(value) : value,
                          },
                        })
                        setSwap({
                          ...swap,
                          amount: value && !isNaN(value) ? Number(value) : value,
                        })
                      }}
                      onWheel={e => e.target.blur()}
                      onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                      className={`w-full bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl text-lg font-semibold text-right py-2 px-3`}
                    />
                    <div
                      onClick={() => {
                        console.log('[Swap]', {
                          swap: {
                            ...swap,
                            amount: x_amount,
                          },
                        })
                        setSwap({
                          ...swap,
                          amount: x_amount,
                        })
                      }}
                      className={`${disabled || !asset_data?.id ? 'pointer-events-none cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-white cursor-pointer'} bg-slate-100 dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-500 text-blue-400 dark:text-slate-200 text-base font-semibold py-0.5 px-2.5`}
                    >
                      Max
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <button
                  disabled={disabled}
                  onClick={() => {
                    console.log('[Swap]', {
                      swap: {
                        ...swap,
                        from: !from || from === 'native' ? 'nomad' : 'native',
                        amount: null,
                      },
                    })
                    setSwap({
                      ...swap,
                      from: !from || from === 'native' ? 'nomad' : 'native',
                      amount: null,
                    })
                    getBalances(chain)
                  }}
                  className={`transform hover:rotate-180 hover:animate-spin-one-time transition duration-300 ease-in-out ${disabled ? 'cursor-not-allowed' : ''} rounded-full shadow dark:shadow-slate-500 dark:hover:shadow-white flex items-center justify-center p-2.5`}
                >
                  <MdSwapVert size={32} />
                </button>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 sm:space-y-0 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 dark:text-slate-600 text-sm font-bold">
                    To
                  </span>
                  {web3_provider && y_asset_data && (
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 dark:text-slate-200 font-semibold">
                        Balance:
                      </span>
                      <Balance
                        chainId={chain_data?.chain_id}
                        asset={y_asset_data?.id}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="w-full flex items-center justify-between sm:justify-start space-x-2 sm:space-x-4">
                    <div className="w-48 sm:h-16 min-w-max flex items-center justify-center space-x-1.5 py-2 px-3">
                      {chain_data?.image && (
                        <Image
                          src={chain_data.image}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      <span className="text-sm sm:text-base font-semibold">
                        {chain_data ?
                          chainName(chain_data) :
                          <span className="text-slate-400 dark:text-slate-500">
                            To Chain
                          </span>
                        }
                      </span>
                    </div>
                    <div className="w-48 sm:h-16 min-w-max flex items-center justify-center space-x-1.5 py-2 px-3">
                      {(y_contract_data?.image || y_asset_data?.image) && (
                        <Image
                          src={y_contract_data?.image || y_asset_data?.image}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      <span className="text-sm sm:text-base font-semibold">
                        {y_symbol ?
                          y_symbol :
                          <span className="text-slate-400 dark:text-slate-500">
                            To Token
                          </span>
                        }
                      </span>
                    </div>
                  </div>
                  <div className="w-full flex items-center justify-between space-x-3">
                    <DebounceInput
                      debounceTimeout={300}
                      size="small"
                      type="number"
                      placeholder="0.00"
                      disabled={disabled || !asset_data?.id}
                      value={typeof x_amount === 'number' && x_amount >= 0 ? x_amount : ''}
                      onChange={e => {
                        const regex = /^[0-9.\b]+$/
                        let value
                        if (e.target.value === '' || regex.test(e.target.value)) {
                          value = e.target.value
                        }
                        value = value < 0 ? 0 : value
                        console.log('[Swap]', {
                          swap: {
                            ...swap,
                            amount: value && !isNaN(value) ? Number(value) : value,
                          },
                        })
                        setSwap({
                          ...swap,
                          amount: value && !isNaN(value) ? Number(value) : value,
                        })
                      }}
                      onWheel={e => e.target.blur()}
                      onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                      className={`w-full bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl text-lg font-semibold text-right py-2 px-3`}
                    />
                    <div
                      onClick={() => {
                        console.log('[Swap]', {
                          swap: {
                            ...swap,
                            amount: x_amount,
                          },
                        })
                        setSwap({
                          ...swap,
                          amount: x_amount,
                        })
                      }}
                      className={`${disabled || !asset_data?.id ? 'pointer-events-none cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-white cursor-pointer'} bg-slate-100 dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-500 text-blue-400 dark:text-slate-200 text-base font-semibold py-0.5 px-2.5`}
                    >
                      Max
                    </div>
                  </div>
                </div>
              </div>
              <Info data={pair || {}} />
            </div>
            <div className="w-full max-w-4xl">
              {(typeof amount === 'number' || (web3_provider && wrong_chain)) ?
                web3_provider && wrong_chain ?
                  <Wallet
                    connectChainId={chain_data?.chain_id}
                    className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl flex items-center justify-center text-white text-base sm:text-lg space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                  >
                    <span className="mr-1.5 sm:mr-2">
                      {is_walletconnect ? 'Reconnect' : 'Switch'} to
                    </span>
                    {chain_data?.image && (
                      <Image
                        src={chain_data.image}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )}
                    <span className="font-semibold">
                      {chain_data?.name}
                    </span>
                  </Wallet>
                  :
                  !calling && !approving && (amount > liquidity_amount || amount < min_amount || amount <= 0) ?
                    <Alert
                      color="bg-red-400 dark:bg-red-500 text-white text-base"
                      icon={<BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />}
                      closeDisabled={true}
                      rounded={true}
                      className="rounded-xl p-4.5"
                    >
                      <span>
                        {amount > liquidity_amount ?
                          'Insufficient Liquidity' :
                          amount < min_amount ?
                            'The swap amount cannot be less than the swap fee.' :
                            amount <= 0 ? 'The swap amount cannot be equal or less than 0.' : ''
                        }
                      </span>
                    </Alert>
                    :
                    !callResponse ?
                      <Modal
                        onClick={() => {
                          setSlippageEditing(false)
                        }}
                        buttonTitle="Swap"
                        buttonClassName="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl flex items-center justify-center text-white text-base sm:text-lg py-3 sm:py-4 px-2 sm:px-3"
                        title="Swap Confirmation"
                        body={<div className="flex flex-col space-y-4 -mb-2">
                          <div className="flex items-center space-x-6 mx-auto pt-2 pb-1">
                            <div className="flex flex-col items-center space-y-1">
                              {asset_data?.image && (
                                <Image
                                  src={asset_data?.image}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                              )}
                              <span className="text-lg font-bold">
                                {asset_data?.symbol}
                              </span>
                            </div>
                            <span className="text-slate-400 dark:text-white text-base font-semibold">
                              on
                            </span>
                            <div className="flex flex-col items-center space-y-1">
                              {chain_data?.image && (
                                <Image
                                  src={chain_data?.image}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                              )}
                              <span className="text-lg font-bold">
                                {chainName(chain_data)}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                            <div className="flex items-center text-slate-400 dark:text-white text-lg md:text-sm lg:text-base mt-0.5">
                              Amount
                              <span className="hidden sm:block">:</span>
                            </div>
                            <div className="sm:text-right">
                              <div className="text-lg space-x-1.5">
                                <span className="font-bold">
                                  {number_format(x_amount, '0,0.000000', true)}
                                </span>
                                <span className="font-semibold">
                                  {x_symbol}
                                </span>
                              </div>
                              {x_amount && typeof x_asset_data?.price === 'number' && (
                                <div className="font-mono text-blue-500 sm:text-right">
                                  ({currency_symbol}{number_format(x_amount * x_asset_data.price, '0,0.00')})
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                            <div className="flex items-center text-slate-400 dark:text-white text-lg md:text-sm lg:text-base mt-0.5">
                              Amount Received
                              <span className="hidden sm:block">:</span>
                            </div>
                            <div className="sm:text-right">
                              <div className="text-lg space-x-1.5">
                                <span className="font-bold">
                                  {number_format(y_amount, '0,0.000000', true)}
                                </span>
                                <span className="font-semibold">
                                  {y_symbol}
                                </span>
                              </div>
                              {y_amount && typeof y_asset_data?.price === 'number' && (
                                <div className="font-mono text-blue-500 sm:text-right">
                                  ({currency_symbol}{number_format(y_amount * y_asset_data.price, '0,0.00')})
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                            <div className="flex items-center text-slate-400 dark:text-white text-lg md:text-sm lg:text-base">
                              Rate
                              <span className="hidden sm:block">:</span>
                            </div>
                            <div className="sm:text-right">
                              <div className="text-lg space-x-1.5">
                                <span className="font-bold">
                                  {number_format(0, '0,0.000000', true)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                            <div className="flex items-center text-slate-400 dark:text-white text-lg md:text-sm lg:text-base mt-0.5">
                              Infinite Approval
                              <span className="hidden sm:block">:</span>
                            </div>
                            <Switch
                              checked={typeof options?.infiniteApprove === 'boolean' ? options.infiniteApprove : false}
                              onChange={() => {
                                console.log('[Swap Confirmation]', {
                                  swap,
                                  options: {
                                    ...options,
                                    infiniteApprove: !options?.infiniteApprove,
                                  },
                                })
                                setOptions({
                                  ...options,
                                  infiniteApprove: !options?.infiniteApprove,
                                })}
                              }
                              onColor="#3b82f6"
                              onHandleColor="#f8fafc"
                              offColor="#64748b"
                              offHandleColor="#f8fafc"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                            <div className="flex items-center text-slate-400 dark:text-white text-lg md:text-sm lg:text-base mt-0.5">
                              Slippage Tolerance
                              <span className="hidden sm:block">:</span>
                            </div>
                            <div className="flex flex-col items-end space-y-1.5">
                              {slippageEditing ?
                                <>
                                  <div className="flex items-center space-x-1">
                                    <DebounceInput
                                      debounceTimeout={300}
                                      size="small"
                                      type="number"
                                      placeholder="0.00"
                                      value={typeof options?.slippage === 'number' && options.slippage >= 0 ? options.slippage : ''}
                                      onChange={e => {
                                        const regex = /^[0-9.\b]+$/
                                        let value
                                        if (e.target.value === '' || regex.test(e.target.value)) {
                                          value = e.target.value
                                        }
                                        value = value <= 0 || value > 100 ? DEFAULT_SWAP_SLIPPAGE_PERCENTAGE : value
                                        console.log('[Swap Confirmation]', {
                                          swap,
                                          options: {
                                            ...options,
                                            slippage: value && !isNaN(value) ? Number(value) : value,
                                          },
                                        })
                                        setOptions({
                                          ...options,
                                          slippage: value && !isNaN(value) ? Number(value) : value,
                                        })
                                      }}
                                      onWheel={e => e.target.blur()}
                                      onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                                      className={`w-20 bg-slate-50 focus:bg-slate-100 dark:bg-slate-800 dark:focus:bg-slate-700 border-0 focus:ring-0 rounded-lg font-semibold text-right py-1.5 px-2.5`}
                                    />
                                    <button
                                      onClick={() => setSlippageEditing(false)}
                                      className="bg-slate-100 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white p-1.5"
                                    >
                                      <BiCheckCircle size={20} />
                                    </button>
                                  </div>
                                  <div className="flex items-center space-x-1.5">
                                    {[3.0, 2.0, 1.0].map((s, i) => (
                                      <div
                                        key={i}
                                        onClick={() => {
                                          console.log('[Swap Confirmation]', {
                                            swap,
                                            options: {
                                              ...options,
                                              slippage: s,
                                            },
                                          })
                                          setOptions({
                                            ...options,
                                            slippage: s,
                                          })
                                          setSlippageEditing(false)
                                        }}
                                        className={`${options?.slippage === s ? 'bg-blue-600 dark:bg-blue-700 font-bold' : 'bg-blue-400 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 hover:font-semibold'} rounded-lg cursor-pointer text-white text-xs py-0.5 px-1.5`}
                                      >
                                        {s} %
                                      </div>
                                    ))}
                                  </div>
                                </>
                                :
                                <div className="flex items-center space-x-1">
                                  <span className="text-lg font-semibold">
                                    {number_format(options?.slippage, '0,0.00')}%
                                  </span>
                                  <button
                                    onClick={() => setSlippageEditing(true)}
                                    className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white p-1.5"
                                    >
                                    <BiEditAlt size={20} />
                                  </button>
                                </div>
                              }
                            </div>
                          </div>
                        </div>}
                        cancelDisabled={disabled}
                        cancelButtonClassName="hidden"
                        confirmDisabled={disabled}
                        onConfirm={() => call()}
                        onConfirmHide={false}
                        confirmButtonTitle={<span className="flex items-center justify-center space-x-1.5 py-2">
                          {(calling || approving) && (
                            <TailSpin color="white" width="20" height="20" />
                          )}
                          <span>
                            {calling ? approving ? 'Approving' : 'Swapping' : 'Confirm'}
                          </span>
                        </span>}
                        confirmButtonClassName="w-full btn btn-default btn-rounded bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-base sm:text-lg text-center"
                      />
                      :
                      (callResponse || approveResponse) && (
                        [callResponse || approveResponse].map((r, i) => (
                          <Alert
                            key={i}
                            color={`${r.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : r.status === 'success' ? callResponse ? 'bg-yellow-400 dark:bg-blue-500' : 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                            icon={r.status === 'failed' ?
                              <BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> :
                              r.status === 'success' ?
                                callResponse ?
                                  <div className="mr-3">
                                    <Watch color="white" width="20" height="20" />
                                  </div> : <BiMessageCheck className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> :
                                <BiMessageDetail className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />
                            }
                            closeDisabled={true}
                            rounded={true}
                            className="rounded-xl p-4.5"
                          >
                            <div className="flex items-center justify-between space-x-2">
                              <span className="break-all">
                                {ellipse(r.message, 128)}
                              </span>
                              <div className="flex items-center space-x-2">
                                {r.status === 'failed' && r.message && (
                                  <Copy
                                    value={r.message}
                                    size={24}
                                    className="cursor-pointer text-slate-200 hover:text-white"
                                  />
                                )}
                                {r.status === 'failed' ?
                                  <button
                                    onClick={() => reset()}
                                    className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                                  >
                                    <MdClose size={20} />
                                  </button>
                                  :
                                  r.status === 'success' ?
                                    <button
                                      onClick={() => reset()}
                                      className={`${callResponse ? 'bg-yellow-500 dark:bg-blue-400' : 'bg-green-500 dark:bg-green-400'} rounded-full flex items-center justify-center text-white p-1`}
                                    >
                                      <MdClose size={20} />
                                    </button>
                                    :
                                    null
                                }
                              </div>
                            </div>
                          </Alert>
                        ))
                      )
                :
                web3_provider ?
                  <button
                    disabled={true}
                    className="w-full bg-slate-100 dark:bg-slate-900 cursor-not-allowed rounded-xl text-slate-400 dark:text-slate-500 text-base sm:text-lg text-center py-3 sm:py-4 px-2 sm:px-3"
                  >
                    Swap
                  </button>
                  :
                  <Wallet
                    connectChainId={chain_data?.chain_id}
                    buttonConnectTitle="Connect Wallet"
                    className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-white text-base sm:text-lg text-center sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                  >
                    <span>
                      Connect Wallet
                    </span>
                  </Wallet>
              }
            </div>
          </div>
        </div>
      </div>
      <PoweredBy />
    </div>
  )
}
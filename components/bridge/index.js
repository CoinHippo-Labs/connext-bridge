import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { getDeployedTransactionManagerContract } from '@connext/nxtp-sdk'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, Contract, constants, utils } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa'
import { TiArrowRight } from 'react-icons/ti'
import { MdSwapHorizontalCircle } from 'react-icons/md'

import Announcement from '../announcement'
import Options from './options'
import GasPrice from '../gas-price'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import Balance from '../balance'
import Faucet from '../faucet'
import Image from '../image'
import EnsProfile from '../ens-profile'
import Wallet from '../wallet'
import Alert from '../alerts'
import Notification from '../notifications'
import Modal from '../modals'
import Popover from '../popover'
import Copy from '../copy'
import { getApproved, approve } from '../../lib/approve'
import meta from '../../lib/meta'
import { chainName } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { params_to_obj, number_format, ellipse, sleep } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

const FEE_ESTIMATE_COOLDOWN = Number(process.env.NEXT_PUBLIC_FEE_ESTIMATE_COOLDOWN) || 30
const DEFAULT_OPTIONS = {
  to: '',
  callData: '',
}

export default () => {
  const dispatch = useDispatch()
  const { preferences, chains, assets, dev, rpc_providers, wallet, balances } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, dev: state.dev, rpc_providers: state.rpc_providers, wallet: state.wallet, balances: state.balances }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { sdk } = { ...dev }
  const { rpcs } = { ...rpc_providers }
  const { wallet_data } = { ...wallet }
  const { chain_id, provider, web3_provider, address, signer } = { ...wallet_data }
  const { balances_data } = { ...balances }

  const router = useRouter()
  const { asPath } = { ...router }

  const [bridge, setBridge] = useState({})
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [controller, setController] = useState(null)

  const [fee, setFee] = useState(null)
  const [feeEstimating, setFeeEstimating] = useState(null)
  const [feeEstimateCooldown, setFeeEstimateCooldown] = useState(null)

  const [amountEstimated, setAmountEstimated] = useState(null)
  const [amountEstimating, setAmountEstimating] = useState(null)
  const [estimateTrigger, setEstimateTrigger] = useState(null)
  const [estimateResponse, setEstimateResponse] = useState(null)

  const [contractApproved, setContractApproved] = useState(null)
  const [approving, setApproving] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [xcall, setXcall] = useState(null)
  const [calling, setCalling] = useState(null)
  const [xcallResponse, setXcallResponse] = useState(null)

  // get bridge from path
  useEffect(() => {
    let updated = false
    const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
    let path = !asPath ? '/' : asPath.toLowerCase()
    path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path
    if (path.includes('from-') && path.includes('to-')) {
      const paths = path.replace('/', '').split('-')
      const source_chain = paths[paths.indexOf('from') + 1]
      const destination_chain = paths[paths.indexOf('to') + 1]
      const source_chain_data = chains_data?.find(c => c?.id === source_chain)
      const destination_chain_data = chains_data?.find(c => c?.id === destination_chain)
      const asset = paths[0] !== 'from' ? paths[0] : null
      const asset_data = assets_data?.find(a => a?.id === asset || a?.symbol?.toLowerCase() === asset)
      if (source_chain_data) {
        bridge.source_chain = source_chain
        updated = true
      }
      if (destination_chain_data) {
        bridge.destination_chain = destination_chain
        updated = true
      }
      if (asset_data) {
        bridge.asset = asset
        updated = true
      }
      if (params?.amount) {
        bridge.amount = params.amount
        updated = true
      }
    }
    if (updated) {
      setBridge(bridge)
    }
  }, [asPath, chains_data, assets_data])

  // set bridge to path
  useEffect(() => {
    const params = {}
    if (bridge) {
      const { source_chain, destination_chain, asset, amount } = { ...bridge }
      if (chains_data?.findIndex(c => !c?.disabled && c?.id === source_chain) > -1) {
        params.source_chain = source_chain
        if (asset && assets_data?.findIndex(a => a?.id === asset && a.contracts?.findIndex(c => c?.chain_id === chains_data.find(_c => _c?.id === source_chain)?.chain_id) > -1) > -1) {
          params.asset = asset
        }
      }
      if (chains_data?.findIndex(c => !c?.disabled && c?.id === destination_chain) > -1) {
        params.destination_chain = destination_chain
        if (asset && assets_data?.findIndex(a => a?.id === asset && a.contracts?.findIndex(c => c?.chain_id === chains_data.find(_c => _c?.id === destination_chain)?.chain_id) > -1) > -1) {
          params.asset = asset
        }
      }
      if (params.source_chain && params.asset && amount) {
        params.amount = amount
      }      
    }
    if (Object.keys(params).length > 0) {
      const { source_chain, destination_chain, asset, amount } = { ...params }
      delete params.source_chain
      delete params.destination_chain
      delete params.asset
      router.push(`/${source_chain && destination_chain ? `${asset ? `${asset.toUpperCase()}-` : ''}from-${source_chain}-to-${destination_chain}` : ''}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`, undefined, { shallow: true })
    }
    setEstimateTrigger(moment().valueOf())
  }, [address, bridge])

  // update balances
  useEffect(() => {
    const { source_chain, destination_chain } = { ...bridge }
    const chain = chains_data?.find(c => c?.chain_id === chain_id)?.id
    if (asPath && chain && (!source_chain || !destination_chain) && destination_chain !== chain) {
      const params = params_to_obj(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      if (!params?.source_chain && !asPath.includes('from-') && chains_data?.findIndex(c => !c?.disabled && c?.id === chain) > -1) {
        setBridge({
          ...bridge,
          source_chain: chain,
        })
      }
      getBalances(chain)
    }
  }, [asPath, chain_id, chains_data])

  // update balances
  useEffect(() => {
    dispatch({
      type: BALANCES_DATA,
      value: null,
    })
    if (address) {
      const { source_chain, destination_chain } = { ...bridge }
      getBalances(source_chain)
      getBalances(destination_chain)
    }
    else {
      reset('address')
    }
  }, [address])

  // update balances
  useEffect(() => {
    const getData = () => {
      if (address && !xcall && !calling && !['pending'].includes(approveResponse?.status)) {
        const { source_chain, destination_chain } = { ...bridge }
        getBalances(source_chain)
        getBalances(destination_chain)
      }
    }
    getData()
    const interval = setInterval(() => getData(), 0.25 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [rpcs])

  // update approved
  useEffect(() => {
    const getData = async () => {
      setApproveResponse(null)
      setContractApproved(await checkApproved())
    }
    getData()
  }, [chain_id, address, bridge])

  // fee estimate cooldown
  useEffect(() => {
    if (typeof feeEstimateCooldown === 'number') {
      if (feeEstimateCooldown === 0) {
        const { amount } = { ...bridge }
        if (typeof amount !== 'number') {
          setEstimateTrigger(moment().valueOf())
        }
      }
      else {
        const interval = setInterval(() => {
          const _feeEstimateCooldown = feeEstimateCooldown - 1
          if (_feeEstimateCooldown > -1) {
            setFeeEstimateCooldown(_feeEstimateCooldown)
          }
        }, 1000)
        return () => clearInterval(interval)
      }
    }
  }, [feeEstimateCooldown])

  // reset fee estimate cooldown
  useEffect(() => {
    if (typeof feeEstimating === 'boolean' && !feeEstimating) {
      setFeeEstimateCooldown(FEE_ESTIMATE_COOLDOWN)
    }
  }, [feeEstimating])

  // trigger estimate
  useEffect(() => {
    const { source_chain, amount } = { ...bridge }
    const chain_id = chains_data?.find(c => c?.id === source_chain)?.chain_id
    if (balances_data?.[chain_id] && amount && !amountEstimated) {
      setEstimateTrigger(moment().valueOf())
    }
  }, [balances_data])

  // estimate trigger
  useEffect(() => {
    let _controller
    if (estimateTrigger) {
      controller?.abort()
      _controller = new AbortController()
      setController(_controller)
      estimate(_controller)
    }
    return () => {
      _controller?.abort()
    }
  }, [estimateTrigger])

  const getBalances = chain => {
    const getBalance = async (chain_id, contract) => {
      let balance
      if (rpcs?.[chain_id] && contract?.contract_address) {
        const rpc = rpcs[chain_id]
        const contract_address = contract.contract_address
        if (contract_address === constants.AddressZero) {
          balance = await rpc.getBalance(address)
        }
        else {
          const c = new Contract(contract_address, ['function balanceOf(address owner) view returns (uint256)'], rpc)
          balance = await c.balanceOf(address)
        }
      }
      dispatch({
        type: BALANCES_DATA,
        value: {
          [`${chain_id}`]: [{
            ...contract,
            amount: balance ? Number(utils.formatUnits(balance, contract?.contract_decimals || 18)) : null,
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

  const checkSupport = () => {
    const { source_chain, destination_chain, asset } = { ...bridge }
    const source_asset_data = assets_data?.find(a => a?.id === asset)
    const destination_asset_data = assets_data?.find(a => a?.id === asset)
    return source_asset_data && destination_asset_data &&
      !(source_chain && source_asset_data.contracts?.findIndex(c => c?.chain_id === chains_data?.find(_c => _c?.id === source_chain)?.chain_id) < 0) &&
      !(destination_chain && destination_asset_data.contracts?.findIndex(c => c?.chain_id === chains_data?.find(_c => _c?.id === destination_chain)?.chain_id) < 0)
  }

  const checkApproved = async origin => {
    let approved = false
    const { asset } = { ...bridge }
    if (address && chain_id && asset && checkSupport() && (origin === 'approve' || !approveResponse)) {
      const asset_data = assets_data?.find(a => a?.id === asset)
      const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_id)
      if (contract_data?.contract_address) {
        if (contract_data.contract_address === constants.AddressZero) {
          approved = true
        }
        else {
          if (origin === 'approve') {
            await sleep(3000)
          }
          approved = await getApproved(signer, contract_data.contract_address, getDeployedTransactionManagerContract(chain_id)?.address)
        }
      }
    }
    return approved
  }

  const approveContract = async () => {
    const { asset } = { ...bridge }
    const asset_data = assets_data?.find(a => a?.id === asset)
    const contract_data = asset?.contracts?.find(c => c?.chain_id === chain_id)
    const symbol = contract_data?.symbol || asset_data?.symbol
    setApproveResponse(null)
    try {
      const tx_approve = await approve(signer, contract_data?.contract_address, getDeployedTransactionManagerContract(chain_id)?.address, constants.MaxUint256)
      const tx_hash = tx_approve?.hash
      setApproveResponse({ status: 'pending', message: `Wait for ${symbol} Approval Confirmation`, tx_hash })
      await tx_approve.wait()
      setContractApproved(await checkApproved('approve'))
      setApproveResponse({ status: 'success', message: `${symbol} Approval Transaction Confirmed`, tx_hash })
    } catch (error) {
      setApproveResponse({ status: 'failed', message: error?.data?.message || error?.message })
    }
  }

  const reset = async origin => {
    const reset_bridge = origin !== 'address' || (address && xcall?.xcalledCaller?.toLowerCase() !== address.toLowerCase())
    if (reset_bridge) {
      setBridge({
        ...bridge,
        amount: null,
      })
      setXcall(null)
    }
    setOptions(DEFAULT_OPTIONS)

    setFee(null)
    setFeeEstimating(null)
    setFeeEstimateCooldown(null)

    setAmountEstimated(null)
    setAmountEstimating(null)
    setEstimateTrigger(null)
    setEstimateResponse(null)

    setApproving(null)
    setApproveResponse(null)

    setCalling(null)
    setXcallResponse(null)

    const { source_chain, destination_chain } = { ...bridge }
    getBalances(source_chain)
    getBalances(destination_chain)

    setContractApproved(await checkApproved())
  }

  const estimate = async controller => {
    if (checkSupport() && !xcall) {
      const { source_chain, destination_chain, asset, amount } = { ...bridge }
      const source_chain_data = chains_data?.find(c => c?.id === source_chain)
      const source_asset_data = assets_data?.find(a => a?.id === asset)
      const source_contract_data = source_asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)
      const destination_chain_data = chains_data?.find(c => c?.id === destination_chain)
      const destination_asset_data = assets_data?.find(a => a?.id === asset)
      const destination_contract_data = destination_asset_data?.contracts?.find(c => c?.chain_id === destination_chain_data?.chain_id)

      if (source_contract_data && destination_contract_data) {
        setEstimateResponse(null)
        if (typeof amount === 'number') {
          setApproveResponse(null)
          if (sdk && !controller.signal.aborted) {
            setFeeEstimating(false)
            setAmountEstimating(true)
            setXcall(null)
            setCalling(false)
            setXcallResponse(null)
            try {
              const decimals = source_contract_data?.contract_decimals || 18
              const response = await sdk.estimateFee({
                sendingChainId: source_chain_data?.chain_id,
                sendingAssetId: source_contract_data?.contract_address,
                receivingChainId: destination_chain_data?.chain_id,
                receivingAssetId: destination_contract_data?.contract_address,
                amount: utils.formatUnits(BigNumber.from(amount.toString()), -decimals),
              })
              if (!controller.signal.aborted) {
                const { relayerFee, routerFee } = { ...response }
                const native_token = source_chain_data?.provider_params?.[0]?.nativeCurrency
                const decimals = native_token?.decimals || 18
                setFee({
                  relayer: Number(utils.formatUnits(BigNumber.from(relayerFee || '0'), decimals)),
                  router: Number(utils.formatUnits(BigNumber.from(router || '0'), decimals)),
                })
                setEstimatedAmount(response)
              }
            } catch (error) {
              if (!controller.signal.aborted) {
                setEstimateResponse({ status: 'failed', message: error?.data?.message || error?.message })
              }
            }
            if (!controller.signal.aborted) {
              setAmountEstimating(false)
            }
          }
        }
        else {
          if (sdk && !controller.signal.aborted) {
            setFeeEstimating(true)
            setAmountEstimated(null)
            setAmountEstimating(false)
            try {
              const response = await sdk.estimateFee({
                sendingChainId: source_chain_data?.chain_id,
                sendingAssetId: source_contract_data?.contract_address,
                receivingChainId: destination_chain_data?.chain_id,
                receivingAssetId: destination_contract_data?.contract_address,
              })
              if (!controller.signal.aborted) {
                const { relayerFee, routerFee } = { ...response }
                const native_token = source_chain_data?.provider_params?.[0]?.nativeCurrency
                const decimals = native_token?.decimals || 18
                setFee({
                  relayer: Number(utils.formatUnits(BigNumber.from(relayerFee || '0'), decimals)),
                  router: Number(utils.formatUnits(BigNumber.from(router || '0'), decimals)),
                })
              }
            } catch (error) {
              if (!controller.signal.aborted) {
                setEstimateResponse({ status: 'failed', message: error?.data?.message || error?.message })
              }
            }
            if (!controller.signal.aborted) {
              setFeeEstimating(false)
            }
          }
        }
        setContractApproved(await checkApproved())
      }
    }
  }

  const call = async () => {
    setCalling(true)
    if (sdk) {
      try {
        const { source_chain, destination_chain, asset, amount } = { ...bridge }
        const source_chain_data = chains_data?.find(c => c?.id === source_chain)
        const source_asset_data = assets_data?.find(a => a?.id === asset)
        const source_contract_data = source_asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)
        const destination_chain_data = chains_data?.find(c => c?.id === destination_chain)
        const { to, callData } = { ...options }
        const response = await sdk.xcall({
          params: {
            to: to || address,
            callData: callData || amountEstimated?.callData,
            originDomain: source_chain_data?.domain_id,
            destinationDomain: destination_chain_data?.domain_id,
          },
          transactingAssetId: source_contract_data?.contract_address,
          amount,
        })
        setXcall(response)
        setXcallResponse(null)
      } catch (error) {
        setXcallResponse({ status: 'failed', message: error?.data?.message || error?.message })
      }
      setTokenApproved(await checkApproved())
    }
    setCalling(false)
  }

  const headMeta = meta(asPath, null, chains_data, assets_data)

  const { source_chain, destination_chain, asset, amount } = { ...bridge }
  const source_chain_data = chains_data?.find(c => c?.id === source_chain)
  const source_asset_data = assets_data?.find(a => a?.id === asset)
  const source_contract_data = source_asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)
  const destination_chain_data = chains_data?.find(c => c?.id === destination_chain)
  const destination_asset_data = assets_data?.find(a => a?.id === asset)
  const destination_contract_data = destination_asset_data?.contracts?.find(c => c?.chain_id === destination_chain_data?.chain_id)  

  const disabled = ['pending'].includes(approveResponse?.status) || calling

  return (
    <>
      {approveResponse && (
        <Notification
          hideButton={true}
          outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
          innerClassNames={`${approveResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-600' : approveResponse.status === 'success' ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-600 dark:bg-blue-700'} text-white`}
          animation="animate__animated animate__fadeInDown"
          icon={approveResponse.status === 'failed' ?
            <FaTimesCircle className="w-4 h-4 stroke-current mr-2" />
            :
            approveResponse.status === 'success' ?
              <FaCheckCircle className="w-4 h-4 stroke-current mr-2" />
              :
              <FaClock className="w-4 h-4 stroke-current mr-2" />
          }
          content={<div className="flex flex-wrap items-center space-x-1.5">
            <span>
              {approveResponse.message}
            </span>
            {approveResponse.status === 'pending' && (
              <TailSpin color="white" width="16" height="16" />
            )}
            {source_chain_data?.explorer?.url && approveResponse.tx_hash && (
              <a
                href={`${source_chain_data.explorer.url}${source_chain_data.explorer.transaction_path?.replace('{tx}', approveResponse.tx_hash)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="whitespace-nowrap font-semibold">
                  View on {source_chain_data.explorer.name}
                </span>
              </a>
            )}
          </div>}
        />
      )}
      <div className="grid grid-flow-row grid-cols-1 lg:grid-cols-8 items-start gap-4 my-4">
        <div className="hidden lg:block col-span-0 lg:col-span-2" />
        <div className="col-span-1 lg:col-span-4">
          <div className="mt-8">
            <Announcement />
          </div>
          <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 my-6">
            <div className="w-full max-w-lg space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <h1 className="text-base sm:text-lg font-bold">
                    Cross-Chain Transfer
                  </h1>
                  {asPath?.includes('from-') && asPath.includes('to-') && headMeta?.title && (
                    <h2 className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm font-medium">
                      {headMeta.title.replace(' with Connext', '')}
                    </h2>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {destination_chain_data && (
                    <a
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/${destination_chain_data.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-max bg-slate-50 hover:bg-slate-100 dark:bg-black dark:hover:bg-slate-900 cursor-pointer rounded-lg shadow flex items-center text-blue-600 dark:text-white py-1.5 px-2"
                    >
                      {destination_chain_data.image && (
                        <Image
                          src={destination_chain_data.image}
                          alt=""
                          width={20}
                          height={20}
                          className="rounded-full mr-2"
                        />
                      )}
                      <span className="text-base font-semibold">
                        Liquidity
                      </span>
                      <TiArrowRight size={20} className="transform -rotate-45 -mr-1" />
                    </a>
                  )}
                  <Options
                    disabled={disabled}
                    applied={!_.isEqual(options, DEFAULT_OPTIONS)}
                    initialData={options}
                    onChange={o => setOptions(o)}
                  />
                </div>
              </div>
              <div className="rounded-2xl shadow dark:shadow-slate-500 space-y-6 p-6">
                <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-5 gap-6">
                  <div className="sm:col-span-2 flex flex-col items-center sm:items-start">
                    <div className="w-48 flex sm:flex-col items-center justify-center space-x-1.5">
                      <span className="text-slate-400 dark:text-white text-lg font-semibold text-center">
                        Source
                      </span>
                      <GasPrice
                        chainId={source_chain_data?.chain_id}
                        dummy={source_chain || destination_chain}
                      />
                    </div>
                    <SelectChain
                      disabled={disabled}
                      value={source_chain}
                      onSelect={c => {
                        const _source_chain = c
                        const _destination_chain = c === destination_chain ? source_chain : destination_chain
                        setBridge({
                          ...bridge,
                          source_chain: _source_chain,
                          destination_chain: _destination_chain,
                        })
                        getBalances(_source_chain)
                        getBalances(_destination_chain)
                      }}
                      source={source_chain}
                      destination={destination_chain}
                      origin="source"
                    />
                    <SelectAsset
                      disabled={disabled}
                      value={asset}
                      onSelect={a => {
                        setBridge({
                          ...bridge,
                          asset: a,
                        })
                        if (a !== asset) {
                          getBalances(source_chain)
                          getBalances(destination_chain)
                        }
                      }}
                      chain={source_chain}
                      origin="source"
                    />
                    <div className="w-48 flex items-center justify-center">
                      <Balance
                        chainId={source_chain_data?.chain_id}
                        asset={asset}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      disabled={disabled}
                      onClick={() => {
                        setBridge({
                          ...bridge,
                          source_chain: destination_chain,
                          destination_chain: source_chain,
                          amount: null,
                        })
                        getBalances(source_chain)
                        getBalances(destination_chain)
                      }}
                      className={`${disabled ? 'cursor-not-allowed' : ''}`}
                    >
                      <MdSwapHorizontalCircle
                        size={40}
                        className="transform -rotate-90 sm:-rotate-0 rounded-full shadow dark:shadow-slate-500 text-blue-400 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white"
                      />
                    </button>
                  </div>
                  <div className="sm:col-span-2 flex flex-col items-center sm:items-end">
                    <div className="w-48 flex sm:flex-col items-center justify-center space-x-1.5">
                      <span className="text-slate-400 dark:text-white text-lg font-semibold text-center">
                        Destination
                      </span>
                      <GasPrice
                        chainId={destination_chain_data?.chain_id}
                        dummy={source_chain || destination_chain}
                      />
                    </div>
                    <SelectChain
                      disabled={disabled}
                      value={destination_chain}
                      onSelect={c => {
                        const _source_chain = c === source_chain ? destination_chain : source_chain
                        const _destination_chain = c
                        setBridge({
                          ...bridge,
                          source_chain: _source_chain,
                          destination_chain: _destination_chain,
                        })
                        getBalances(_source_chain)
                        getBalances(_destination_chain)
                      }}
                      source={source_chain}
                      destination={destination_chain}
                      origin="destination"
                    />
                    <SelectAsset
                      disabled={disabled}
                      value={asset}
                      onSelect={a => {
                        setBridge({
                          ...bridge,
                          asset: a,
                        })
                        if (a !== asset) {
                          getBalances(source_chain)
                          getBalances(destination_chain)
                        }
                      }}
                      chain={destination_chain}
                      origin="destination"
                    />
                    <div className="w-48 flex items-center justify-center">
                      <Balance
                        chainId={destination_chain_data?.chain_id}
                        asset={asset}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {['testnet'].includes(process.env.NEXT_PUBLIC_ENVIRONMENT) && (
              <Faucet />
            )}
          </div>
        </div>
        <div className="col-span-1 lg:col-span-2 mb-4">
        </div>
      </div>
    </>
  )
}
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { XTransferStatus, XTransferErrorStatus, encodeMultisendCall } from '@connext/nxtp-utils'
import { PERMIT2_ADDRESS, AllowanceTransfer, MaxSigDeadline, MaxAllowanceExpiration } from '@uniswap/permit2-sdk'
import Switch from 'react-switch'
import { DebounceInput } from 'react-debounce-input'
import { BigNumber, Contract, constants, utils } from 'ethers'
const { AddressZero: ZeroAddress, MaxUint256 } = { ...constants }
const { getAddress } = { ...utils }
import _ from 'lodash'
import moment from 'moment'
import { Tooltip, Alert as AlertNotification } from '@material-tailwind/react'
import { MdClose, MdRefresh } from 'react-icons/md'
import { HiArrowRight } from 'react-icons/hi'
import { BiEditAlt, BiCheckCircle, BiInfoCircle, BiChevronUp, BiChevronDown } from 'react-icons/bi'
import { IoInformationCircleOutline } from 'react-icons/io5'

import Options from './options'
import WarningXERC20 from './warning/xERC20'
import WarningSlippage from './warning/slippage'
import WarningFeeRatio from './warning/fee-ratio'
import LatestTransfers from '../latest-transfers'
import ActionRequired from '../action-required'
import Spinner from '../spinner'
import NumberDisplay from '../number'
import Alert from '../alert'
import Balance from '../balance'
import Faucet from '../faucet'
import Copy from '../copy'
import Image from '../image'
import TimeSpent from '../time/timeSpent'
import Wallet from '../wallet'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import { NETWORK, WRAPPED_PREFIX, NATIVE_WRAPPABLE_SYMBOLS, RELAYER_FEE_ASSET_TYPES, PERCENT_ROUTER_FEE, GAS_LIMIT_ADJUSTMENT, DEFAULT_PERCENT_BRIDGE_SLIPPAGE, DEFAULT_SOURCE_CHAIN, DEFAULT_DESTINATION_CHAIN } from '../../lib/config'
import { getChainData, getAssetData, getContractData, getBalanceData } from '../../lib/object'
import { toBigNumber, toFixedNumber, formatUnits, parseUnits, isNumber, isZero } from '../../lib/number'
import { split, toArray, includesStringList, numberFormat, numberToFixed, ellipse, equalsIgnoreCase, getPath, getQueryParams, createMomentFromUnixtime, switchColor, sleep, normalizeMessage, parseError } from '../../lib/utils'
import { BALANCES_DATA, GET_BALANCES_DATA } from '../../reducers/types'

const DEFAULT_OPTIONS = {
  to: '',
  infiniteApprove: false,
  callData: '',
  slippage: DEFAULT_PERCENT_BRIDGE_SLIPPAGE,
  relayerFeeAssetType: _.head(RELAYER_FEE_ASSET_TYPES),
  forceSlow: false,
  receiveLocal: false,
  showNextAssets: true,
}

// Maps domainID to Alchemix Gateway contract
const ALCHEMIX_GATEWAYS = {
  "1735356532": "0x038e55fbDAbBfc9F55C454c21b9EAbeCe00aEf31", // op-goerli
  "1734439522": "0x449ac7DEc35E5Fb7d6C05475C2C31229DeD7a9CF", // arb-goerli
  "1869640809": "0x2a8B5F365Fb29C3E1a40a5cd14AD7f89050755Ed", // op
  "1634886255": "0xd031Bd586CAAcd11e846c35D1a61dc543d4ee55D", // arb
}

export default () => {
  const dispatch = useDispatch()
  const { preferences, chains, assets, gas_tokens_price, router_asset_balances, pools, rpc_providers, dev, wallet, balances, latest_bumped_transfers } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, gas_tokens_price: state.gas_tokens_price, router_asset_balances: state.router_asset_balances, pools: state.pools, rpc_providers: state.rpc_providers, dev: state.dev, wallet: state.wallet, balances: state.balances, latest_bumped_transfers: state.latest_bumped_transfers }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { gas_tokens_price_data } = { ...gas_tokens_price }
  const { router_asset_balances_data } = { ...router_asset_balances }
  const { pools_data } = { ...pools }
  const { rpcs } = { ...rpc_providers }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { provider, signer, address } = { ...wallet_data }
  const { balances_data } = { ...balances }
  const { latest_bumped_transfers_data } = { ...latest_bumped_transfers }
  const wallet_chain_id = wallet_data?.chain_id

  const router = useRouter()
  const { asPath, query } = { ...router }
  const { source, send } = { ...query }

  const [bridge, setBridge] = useState({})
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [collapse, setCollapse] = useState(true)
  const [recipientEditing, setRecipientEditing] = useState(false)
  const [slippageEditing, setSlippageEditing] = useState(false)
  const [estimatedValues, setEstimatedValues] = useState(undefined)
  const [estimateResponse, setEstimateResponse] = useState(null)
  const [isApproveNeeded, setIsApproveNeeded] = useState(undefined)

  const [fees, setFees] = useState(null)
  const [estimateFeesTrigger, setEstimateFeesTrigger] = useState(null)

  const [approving, setApproving] = useState(null)
  const [approveProcessing, setApproveProcessing] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [xcallData, setXcallData] = useState(null)
  const [calling, setCalling] = useState(null)
  const [callProcessing, setCallProcessing] = useState(null)
  const [callResponse, setCallResponse] = useState(null)

  const [balanceTrigger, setBalanceTrigger] = useState(null)
  const [transfersTrigger, setTransfersTrigger] = useState(null)

  const [latestTransfers, setLatestTransfers] = useState([])
  const [latestTransfersSize, setLatestTransfersSize] = useState(null)
  const [openTransferStatus, setOpenTransferStatus] = useState(false)
  const [timeTrigger, setTimeTrigger] = useState(false)

  const [displayReceiveNextInfo, setDisplayReceiveNextInfo] = useState(null)
  const [receiveNextInfoTimeout, setReceiveNextInfoTimeout] = useState(null)

  // get [bridge] from path
  useEffect(
    () => {
      if (assets_data) {
        let updated = false
        const path = getPath(asPath)
        const params = getQueryParams(asPath)
        const { symbol, amount, receive_next } = { ...params }
        const isNextAsset = equalsIgnoreCase(receive_next?.toString(), 'true') ? true : equalsIgnoreCase(receive_next?.toString(), 'false') ? false : undefined

        if (path.includes('from-') && path.includes('to-')) {
          const paths = split(path.replace('/', ''), 'normal', '-')
          const sourceChain = paths[paths.indexOf('from') + 1]
          let destinationChain = paths[paths.indexOf('to') + 1]
          const asset = _.head(paths) !== 'from' ? _.head(paths) : NETWORK === 'testnet' ? [sourceChain, destinationChain].findIndex(c => ['linea'].includes(c)) > -1 ? 'matic' : 'test' : 'usdc'
          const source_chain_data = getChainData(sourceChain, chains_data)
          const destination_chain_data = getChainData(destinationChain, chains_data)
          const asset_data = getAssetData(asset, assets_data)

          if (source_chain_data) {
            updated = bridge.source_chain !== sourceChain
            bridge.source_chain = sourceChain
          }
          if (destination_chain_data) {
            const { contracts } = { ...asset_data }
            if (getContractData(destination_chain_data.chain_id, contracts)) {
              updated = bridge.destination_chain !== destinationChain
              bridge.destination_chain = destinationChain
            }
            else {
              destinationChain = getChainData(undefined, chains_data, { not_disabled: true, except: [sourceChain, destinationChain], return_all: true }).find(d => getContractData(d.chain_id, contracts))?.id
              if (destinationChain) {
                updated = bridge.destination_chain !== destinationChain
                bridge.destination_chain = destinationChain
              }
            }
          }
          if (asset_data) {
            updated = bridge.asset !== asset
            bridge.asset = asset
          }
          if (symbol) {
            updated = bridge.symbol !== symbol
            bridge.symbol = symbol
          }
          if (bridge.source_chain && isNumber(amount) && !isZero(amount)) {
            updated = bridge.amount !== amount
            bridge.amount = amount
            if (sdk) {
              calculateAmountReceived(amount)
              if (isApproveNeeded === undefined) {
                checkApprovedNeeded(amount)
              }
            }
          }
          else if (estimatedValues) {
            if (!isNumber(amount) || isZero(amount)) {
              setEstimatedValues({ amountReceived: '0', routerFee: '0', isNextAsset: !!isNextAsset })
            }
            else {
              setEstimatedValues(undefined)
            }
          }
        }

        switch (isNextAsset) {
          case true:
          case false:
            updated = bridge.receive_next !== isNextAsset
            bridge.receive_next = isNextAsset
            setOptions({ ...options, receiveLocal: isNextAsset })
            break
          default:
            break
        }

        if (updated) {
          setBridge(bridge)
        }
      }
    },
    [chains_data, assets_data, sdk, asPath],
  )

  // set [bridge] to path
  useEffect(
    () => {
      const params = {}
      if (bridge) {
        const { source_chain, destination_chain, asset, symbol, amount } = { ...bridge }
        const source_chain_data = getChainData(source_chain, chains_data, { not_disabled: true })
        if (source_chain_data) {
          const { chain_id } = { ...source_chain_data }
          params.source_chain = source_chain
          if (asset && getAssetData(asset, assets_data, { chain_id })) {
            params.asset = asset
          }
        }

        const destination_chain_data = getChainData(destination_chain, chains_data, { not_disabled: true })
        if (destination_chain_data) {
          const { chain_id } = { ...destination_chain_data }
          params.destination_chain = destination_chain
          if (asset && getAssetData(asset, assets_data, { chain_id })) {
            params.asset = asset
          }
        }

        if (params.source_chain && params.asset) {
          const { chain_id } = { ...source_chain_data }
          if (isNumber(amount) && !isZero(amount)) {
            params.amount = amount
          }
          if (symbol && getAssetData(asset, assets_data, { chain_id, symbol })) {
            params.symbol = symbol
          }
        }
      }

      const { slippage } = { ...options }
      let { receiveLocal } = { ...options }
      if (!destination_contract_data?.next_asset) {
        if (receiveLocal) {
          bridge._receiveLocal = receiveLocal
        }
        receiveLocal = false
        if (bridge.receive_next) {
          bridge.receive_next = undefined
        }
        setDisplayReceiveNextInfo(true)
      }
      else {
        if (typeof bridge._receiveLocal === 'boolean') {
          receiveLocal = bridge.receive_next === bridge._receiveLocal || bridge.receive_next === false ? bridge.receive_next : bridge._receiveLocal
          bridge._receiveLocal = receiveLocal
        }
      }
      if (receiveLocal || bridge.receive_next) {
        params.receive_next = true
      }
      if (source) {
        params.source = source
      }
      if (send) {
        xcall()
      }

      if (Object.keys(params).length > 0) {
        const { source_chain, destination_chain, asset, symbol } = { ...params }
        delete params.source_chain
        delete params.destination_chain
        delete params.asset
        if (!symbol) {
          delete params.symbol
        }
        router.push(`/${source_chain && destination_chain ? `${asset ? `${asset.toUpperCase()}-` : ''}from-${source_chain}-to-${destination_chain}` : ''}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`, undefined, { shallow: true })
        setBalanceTrigger(moment().valueOf())
      }

      const { destination_chain } = { ...bridge }
      const { symbol } = { ...params }
      const destination_chain_data = getChainData(destination_chain, chains_data)
      const { chain_id } = { ...destination_chain_data }
      const { contract_address, next_asset } = { ...destination_contract_data }
      const destinationDecimals = destination_contract_data?.decimals || 18
      const routersLiquidityAmount = _.sum(toArray(router_asset_balances_data?.[chain_id]).filter(d => toArray([contract_address, next_asset?.contract_address]).findIndex(a => equalsIgnoreCase(a, d.contract_address)) > -1).map(d => formatUnits(d.amount, next_asset && equalsIgnoreCase(d.contract_address, next_asset.contract_address) ? next_asset.decimals : destinationDecimals)).map(d => Number(d) > 0 ? Number(d) : 0))

      setOptions({ ...options, slippage, forceSlow: destination_chain_data && router_asset_balances_data ? Number(amount) > routersLiquidityAmount && !is_xERC20 : false, receiveLocal })
      setEstimateResponse(null)
      setEstimateFeesTrigger(moment().valueOf())
      setApproveResponse(null)
      setXcallData(null)
      setCallResponse(null)
    },
    [sdk, address, bridge, send],
  )

  // update balances
  useEffect(
    () => {
      let { source_chain, destination_chain } = { ...bridge }
      const { id } = { ...getChainData(wallet_chain_id, chains_data) }

      // set source chain = wallet connected chain
      if (id && asPath) {
        const params = getQueryParams(asPath)
        if (!(source_chain && destination_chain) && !equalsIgnoreCase(id, destination_chain)) {
          if (!asPath.includes('from-') && !params.source_chain && getChainData(id, chains_data, { not_disabled: true })) {
            source_chain = id
          }
        }
        else if (!asPath.includes('from-') && !equalsIgnoreCase(id, source_chain)) {
          source_chain = id
        }
        getBalances(id)
      }

      if (Object.keys(bridge).length > 0 || asPath === '/') {
        source_chain = source_chain || DEFAULT_SOURCE_CHAIN || getChainData(undefined, chains_data, { not_disabled: true, get_head: true, except: destination_chain })?.id
        const source_chain_data = getChainData(source_chain, chains_data)
        source_chain = source_chain_data?.disabled_bridge && source_chain_data.switch_to ? source_chain_data.switch_to : source_chain

        const destination_chain_data = getChainData(destination_chain, chains_data)
        if (destination_chain && !equalsIgnoreCase(destination_chain, source_chain)) {
          if (destination_chain_data?.disabled_bridge && destination_chain_data.switch_to) {
            if (!equalsIgnoreCase(destination_chain_data.switch_to, source_chain)) {
              destination_chain = destination_chain_data.switch_to
            }
            else {
              destination_chain = getChainData(undefined, chains_data, { not_disabled: true, must_have_pools: true, get_head: true, except: [destination_chain, destination_chain_data.switch_to] })?.id
            }
          }
        }
        else if (bridge.source_chain && !equalsIgnoreCase(bridge.source_chain, source_chain)) {
          destination_chain = bridge.source_chain
        }
        else if (equalsIgnoreCase(source_chain, DEFAULT_DESTINATION_CHAIN) && getChainData(DEFAULT_DESTINATION_CHAIN, chains_data)) {
          destination_chain = DEFAULT_DESTINATION_CHAIN
        }
        else {
          destination_chain = DEFAULT_DESTINATION_CHAIN || getChainData(undefined, chains_data, { not_disabled: true, get_head: true, except: source_chain })?.id
        }
      }

      if (Object.keys(bridge).length === 0) {
        setBridge({ ...bridge, source_chain, destination_chain })
      }
    },
    [chains_data, wallet_chain_id, asPath],
  )

  // update balances
  useEffect(
    () => {
      dispatch({ type: BALANCES_DATA, value: null })
      if (address) {
        const { source_chain, destination_chain } = { ...bridge }
        getBalances(source_chain)
        getBalances(destination_chain)
      }
      else {
        reset('address')
      }
    },
    [address],
  )

  // update balances
  useEffect(
    () => {
      const getData = () => {
        const { status } = { ...approveResponse }
        if (address && !xcallData && !calling && status !== 'pending') {
          const { source_chain, destination_chain } = { ...bridge }
          getBalances(source_chain)
          getBalances(destination_chain)
        }
      }

      getData()
      const interval = setInterval(() => getData(), 0.25 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [rpcs],
  )

  // estimate fees
  useEffect(
    () => {
      const update = () => {
        if (estimateFeesTrigger && !(approving || approveResponse || xcallData || calling || callResponse)) {
          estimateFees()
        }
      }

      update()
      const interval = setInterval(() => update(), 1 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [estimateFeesTrigger, callResponse],
  )

  // update transfer status
  useEffect(
    () => {
      const getData = async () => {
        if (sdk && address && xcallData) {
          const { transfer_id, transactionHash } = { ...xcallData }
          if (!transfer_id && transactionHash) {
            let data
            try {
              const response = toArray(await sdk.sdkUtils.getTransfers({ transactionHash }))
              data = response.find(d => equalsIgnoreCase(d.xcall_transaction_hash, transactionHash))
            } catch (error) {}

            if (!data && address) {
              try {
                const response = toArray(await sdk.sdkUtils.getTransfers({ userAddress: address }))
                data = response.find(d => equalsIgnoreCase(d.xcall_transaction_hash, transactionHash))
              } catch (error) {}
            }

            const { status, error_status } = { ...data }
            if (status || error_status) {
              const { transfer_id } = { ...data }
              if (transfer_id) {
                setXcallData({ ...xcallData, transfer_id })
              }
              setLatestTransfers(
                _.orderBy(
                  _.uniqBy(_.concat(data, latestTransfers), 'xcall_transaction_hash'),
                  ['xcall_timestamp'], ['desc'],
                )
              )
              if ([XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status)) {
                reset('finish')
              }
            }
            else if (data?.transfer_id) {
              const { transfer_id } = { ...data }
              setXcallData({ ...xcallData, transfer_id })
            }
          }
          else if (transfer_id) {
            const response = toArray(await sdk.sdkUtils.getTransfers({ transferId: transfer_id }))
            const data = response.find(d => equalsIgnoreCase(d.transfer_id, transfer_id))
            const { relayer_fee, slippage, status, error_status } = { ...data }
            if (status || error_status) {
              let updated
              switch (latestTransfer?.error_status) {
                case null:
                  switch (error_status) {
                    case XTransferErrorStatus.LowSlippage:
                      updated = slippage > latestTransfer?.slippage
                      break
                    case XTransferErrorStatus.LowRelayerFee:
                      updated = relayer_fee > latestTransfer?.relayer_fee
                      break
                    default:
                      updated = true
                      break
                  }
                  break
                default:
                  updated = true
                  break
              }
              if (updated) {
                setLatestTransfers(_.orderBy(_.uniqBy(_.concat(data, latestTransfers), 'xcall_transaction_hash'), ['xcall_timestamp'], ['desc']))
              }
              if ([XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status)) {
                reset('finish')
              }
            }
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(), 0.125 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [sdk, address, xcallData],
  )

  // render latest transfer
  useEffect(
    () => {
      setTimeTrigger(!timeTrigger)
    },
    [openTransferStatus],
  )

  // render latest transfer status
  useEffect(
    () => {
      const getData = is_interval => {
        if ((openTransferStatus || (latestTransfer && !latestTransfer.execute_transaction_hash)) && (!timeTrigger || is_interval)) {
          setTimeTrigger(!timeTrigger)
        }
      }

      getData()
      const interval = setInterval(() => getData(true), 1 * 1000)
      return () => clearInterval(interval)
    },
    [timeTrigger],
  )

  // countdown receive next info
  useEffect(
    () => {
      if (displayReceiveNextInfo) {
        const interval = setInterval(
          () => {
            setReceiveNextInfoTimeout((receiveNextInfoTimeout || 5) - 1)
            if (receiveNextInfoTimeout === 1) {
              setDisplayReceiveNextInfo(false)
            }
          },
          1000,
        )
        return () => clearInterval(interval)
      }
    },
    [displayReceiveNextInfo, receiveNextInfoTimeout],
  )

  // update options
  useEffect(
    () => {
      const { asset } = { ...bridge }
      const asset_data = getAssetData(asset, assets_data)
      const { allow_paying_gas } = { ...asset_data }
      if (asset_data) {
        DEFAULT_OPTIONS.relayerFeeAssetType = !allow_paying_gas ? 'native' : _.head(RELAYER_FEE_ASSET_TYPES)
        if (!allow_paying_gas) {
          setOptions({ ...options, relayerFeeAssetType: 'native' })
        }
      }
    },
    [assets_data, bridge],
  )

  const getBalances = chain => dispatch({ type: GET_BALANCES_DATA, value: { chain } })

  const reset = async origin => {
    const reset_bridge = !['address', 'user_rejected'].includes(origin)
    if (reset_bridge) {
      setBridge({ ...bridge, amount: null })
      setEstimatedValues(null)
      setEstimateResponse(null)
      setIsApproveNeeded(undefined)
      setXcallData(null)
    }

    if (origin !== 'finish' && reset_bridge) {
      setOptions(DEFAULT_OPTIONS)
    }
    if (reset_bridge) {
      setFees(null)
      setEstimateFeesTrigger(null)
    }

    setApproving(null)
    setApproveProcessing(null)
    setApproveResponse(null)

    setCalling(null)
    setCallProcessing(null)
    setCallResponse(null)

    setBalanceTrigger(moment().valueOf())
    setTransfersTrigger(moment().valueOf())

    const { source_chain, destination_chain } = { ...bridge }
    getBalances(source_chain)
    getBalances(destination_chain)
  }

  const checkSupported = () => {
    const { source_chain, destination_chain, asset } = { ...bridge }
    const source_chain_data = getChainData(source_chain, chains_data)
    const destination_chain_data = getChainData(destination_chain, chains_data)
    const source_asset_data = getAssetData(asset, assets_data)
    const destination_asset_data = getAssetData(asset, assets_data)
    return source_chain_data && destination_chain_data && source_asset_data && destination_asset_data && getContractData(source_chain_data.chain_id, source_asset_data.contracts) && getContractData(destination_chain_data.chain_id, source_asset_data.contracts) && getContractData(source_chain_data.chain_id, destination_asset_data.contracts) && getContractData(destination_chain_data.chain_id, destination_asset_data.contracts)
  }

  const checkApprovedNeeded = async amount => {
    if (sdk && address && assets_data) {
      if (isNumber(amount) && !isZero(amount)) {
        const { domain_id } = { ...source_chain_data }
        const { contract_address, decimals } = { ...source_contract_data }
        const amountToApprove = parseUnits(amount, decimals)
        try {
          setIsApproveNeeded(undefined)
          console.log('[/]', '[approveIfNeeded]', { domain_id, contract_address, amount, amountToApprove })
          const response = await sdk.sdkBase.approveIfNeeded(domain_id, contract_address, amountToApprove)
          const isApproveNeeded = !!response
          console.log('[/]', '[approveIfNeeded]', { domain_id, contract_address, amount, amountToApprove, isApproveNeeded, response })
          setIsApproveNeeded(isApproveNeeded)
        } catch (error) {
          const response = parseError(error)
          const { message } = { ...response }
          if (!message?.includes('Signer Address Missing')) {
            console.log('[/]', '[approveIfNeeded error]', { domain_id, contract_address, amount, amountToApprove }, error, response)
          }
        }
      }
      else {
        setIsApproveNeeded(false)
      }
    }
  }

  const _estimateFees = async () => {
    if (sdk && checkSupported()) {
      try {
        const { source_chain, destination_chain, asset, amount } = { ...bridge }
        const { relayerFeeAssetType, forceSlow } = { ...options }

        const source_chain_data = getChainData(source_chain, chains_data)
        const destination_chain_data = getChainData(destination_chain, chains_data)
        const { native_token } = { ...source_chain_data }
        const { gas_price, relayer_fee_adjustment } = { ...destination_chain_data }
        let { decimals } = { ...native_token }
        decimals = decimals || 18

        const source_asset_data = getAssetData(asset, assets_data)
        const { contracts, price } = { ...source_asset_data }
        const source_contract_data = getContractData(source_chain_data.chain_id, contracts)
        const sourceDecimals = source_contract_data.decimals || 18

        const routerFee = forceSlow ? 0 : parseFloat(numberToFixed(amount * PERCENT_ROUTER_FEE / 100, sourceDecimals))
        const params = {
          originDomain: source_chain_data.domain_id,
          destinationDomain: destination_chain_data.domain_id,
          isHighPriority: !forceSlow,
          priceIn: relayerFeeAssetType === 'transacting' ? 'usd' : 'native',
          destinationGasPrice: gas_price,
          signerAddress: address
        }

        if (NETWORK !== 'mainnet') {
          const source_gas_token_data = toArray(gas_tokens_price_data).find(d => equalsIgnoreCase(d.asset_id, native_token?.symbol))
          const destination_gas_token_data = toArray(gas_tokens_price_data).find(d => equalsIgnoreCase(d.asset_id, destination_chain_data?.native_token?.symbol))
          if (source_gas_token_data?.price) {
            params.originNativeTokenPrice = source_gas_token_data.price
          }
          if (destination_gas_token_data?.price) {
            params.destinationNativeTokenPrice = destination_gas_token_data.price
          }
        }

        try {
          console.log('[/]', '[estimateRelayerFee]', params)
          const response = await sdk.sdkBase.estimateRelayerFee(params)
          let relayerFee = formatUnits(response, decimals)
          if (isNumber(relayerFee)) {
            relayerFee = params.priceIn === 'usd' && price > 0 ? numberToFixed(relayerFee / price, decimals) : relayerFee.toString()
            if (relayer_fee_adjustment > 1) {
              relayerFee = numberToFixed(relayerFee * relayer_fee_adjustment, decimals)
            }
          }
          console.log('[/]', '[relayerFee]', { params, response, relayerFee })
          return { routerFee, relayerFee }
        } catch (error) {
          console.log('[/]', '[estimateRelayerFee error]', params, error)
          return { routerFee }
        }
      } catch (error) {}
    }
    return null
  }

  const estimateFees = async () => {
    if (sdk && !xcallData && !callResponse) {
      if (checkSupported()) {
        setFees(null)
        setApproveResponse(null)
        setCallProcessing(false)
        setCalling(false)
        setCallResponse(null)
        setFees(await _estimateFees())
      }
      else {
        setFees(null)
      }
    }
  }

  const calculateAmountReceived = async (_amount, _receiveLocal) => {
    if (sdk) {
      const originDomain = source_chain_data?.domain_id
      const destinationDomain = destination_chain_data?.domain_id
      const originTokenAddress = (equalsIgnoreCase(source_contract_data?.contract_address, ZeroAddress) ? original_source_contract_data : source_contract_data)?.contract_address

      const { contract_address, next_asset } = { ...original_destination_contract_data }
      let destinationTokenAddress = contract_address
      const isNextAsset = typeof _receiveLocal === 'boolean' ? _receiveLocal : receiveLocal || equalsIgnoreCase(destination_contract_data?.contract_address, next_asset?.contract_address)
      destinationTokenAddress = isNextAsset && next_asset?.contract_address ? next_asset.contract_address : destinationTokenAddress

      const sourceDecimals = source_contract_data?.decimals || 18
      const amount = parseUnits(_amount, sourceDecimals)
      const checkFastLiquidity = true

      let manual = true
      try {
        setEstimatedValues(null)
        setEstimateResponse(null)

        if (isNumber(_amount) && !isZero(_amount)) {
          if (source_asset_data?.is_xERC20 || source_asset_data?.is_alchemix) {
            manual = true
          }
          else if (toArray([source_chain_data?.id, destination_chain_data?.id]).findIndex(id => toArray(pools_data).find(d => d.chain_data?.id === id && !d.tvl)) < 0) {
            const startTime = moment()
            console.log('[/]', '[calculateAmountReceived]', { startTime: startTime.format(), originDomain, destinationDomain, originTokenAddress, destinationTokenAddress, amount, isNextAsset, checkFastLiquidity })
            const response = await sdk.sdkBase.calculateAmountReceived(originDomain, destinationDomain, originTokenAddress, amount, isNextAsset, checkFastLiquidity, address)
            const endTime = moment()
            const timeSpentMilliseconds = endTime.diff(startTime, 'milliseconds')
            console.log('[/]', '[amountReceived]', { startTime: startTime.format(), endTime: endTime.format(), timeSpentMilliseconds, originDomain, destinationDomain, originTokenAddress, destinationTokenAddress, amount, isNextAsset, checkFastLiquidity, response })

            const destination_contract_data = getContractData(destination_chain_data?.chain_id, destination_asset_data?.contracts)
            setEstimatedValues(
              Object.fromEntries(Object.entries({ ...response }).map(([k, v]) => {
                try {
                  switch (k) {
                    case 'amountReceived':
                      v = formatUnits(v, (isNextAsset && next_asset ? next_asset : destination_contract_data)?.decimals || 18)
                      break
                    case 'originSlippage':
                    case 'destinationSlippage':
                      v = formatUnits(v, 2)
                      break
                    default:
                      if (typeof v !== 'boolean') {
                        v = formatUnits(v, sourceDecimals)
                      }
                      break
                  }
                } catch (error) {}
                return [k, v]
              }))
            )
            manual = false
          }
        }
      } catch (error) {
        const response = parseError(error)
        console.log('[/]', '[calculateAmountReceived error]', { originDomain, destinationDomain, originTokenAddress, destinationTokenAddress, amount, isNextAsset, checkFastLiquidity }, error)
        const { message } = { ...response }
        if (includesStringList(message, ['reverted', 'invalid BigNumber value'])) {
          manual = true
        }
        else {
          setEstimateResponse({ status: 'failed', ...response })
          manual = false
        }
      }

      if (manual) {
        const routerFee = parseFloat(numberToFixed(_amount * PERCENT_ROUTER_FEE / 100, sourceDecimals))
        setEstimatedValues({ amountReceived: toFixedNumber(_amount).subUnsafe(toFixedNumber(routerFee)).toString(), routerFee, isNextAsset: typeof _receiveLocal === 'boolean' ? _receiveLocal : receiveLocal })
      }
    }
  }

  const xcall = async (relayerFee = fees?.relayerFee) => {
    setApproving(null)
    setCalling(true)

    let success = false
    let failed = false
    if (sdk) {
      const { source_chain, destination_chain, asset, amount, receive_wrap } = { ...bridge }
      let { symbol } = { ...bridge }
      const { to, infiniteApprove, callData, slippage, forceSlow, receiveLocal } = { ...options }

      const source_chain_data = getChainData(source_chain, chains_data)
      const destination_chain_data = getChainData(destination_chain, chains_data)
      const { native_token } = { ...source_chain_data }
      const source_domain = source_chain_data?.domain_id
      const destination_domain = destination_chain_data?.domain_id

      const source_asset_data = getAssetData(asset, assets_data)
      let source_contract_data = getContractData(source_chain_data?.chain_id, source_asset_data?.contracts)
      const original_source_contract_data = _.cloneDeep(source_contract_data)
      if (symbol) {
        // xERC20 asset
        if (source_asset_data?.is_xERC20 && equalsIgnoreCase(`x${source_asset_data?.symbol}`, symbol)) {
          source_contract_data = { ...source_contract_data, contract_address: source_contract_data.xERC20, symbol: `x${source_asset_data.symbol}` }
        }
        // next asset
        else if (equalsIgnoreCase(source_contract_data?.next_asset?.symbol, symbol)) {
          source_contract_data = { ...source_contract_data, ...source_contract_data.next_asset }
        }
        // native asset
        else if (source_contract_data?.wrappable && [source_asset_data.symbol, native_token?.symbol].findIndex(s => equalsIgnoreCase(s, symbol)) > -1) {
          source_contract_data = { ...source_contract_data, contract_address: ZeroAddress, symbol: source_asset_data.symbol, image: source_asset_data.image }
        }
      }

      const destination_asset_data = getAssetData(asset, assets_data)
      let destination_contract_data = getContractData(destination_chain_data?.chain_id, destination_asset_data?.contracts)
      // next asset
      if ((receiveLocal || estimatedValues?.isNextAsset) && destination_contract_data?.next_asset) {
        destination_contract_data = { ...destination_contract_data, ...destination_contract_data.next_asset }
      }
      // native asset
      else if (destination_contract_data?.wrappable && (!symbol || [destination_asset_data.symbol, destination_contract_data.symbol].findIndex(s => equalsIgnoreCase(s, symbol)) > -1)) {
        if (!receive_wrap) {
          destination_contract_data = { ...destination_contract_data, contract_address: ZeroAddress, symbol: destination_asset_data.symbol, image: destination_asset_data.image }
        }
      }

      symbol = source_contract_data?.symbol || source_asset_data?.symbol
      relayerFee = isNumber(relayerFee) && Number(relayerFee) > 0 ? relayerFee : (await _estimateFees())?.relayerFee

      const sourceDecimals = source_contract_data?.decimals || 18
      const relayerFeeDecimals = relayerFeeAssetType === 'transacting' ? sourceDecimals : 18
      const relayerFeeField = `relayerFee${relayerFeeAssetType === 'transacting' ? 'InTransactingAsset' : ''}`
      const _amount = toFixedNumber(amount).subUnsafe(toFixedNumber(relayerFeeAssetType === 'transacting' && Number(relayerFee) > 0 ? numberToFixed(relayerFee, relayerFeeDecimals) : '0')).toString()

      const xcallParams = {
        origin: source_domain,
        destination: destination_domain,
        asset: source_contract_data?.contract_address,
        to: to || address,
        delegate: to || address,
        amount: parseUnits(_amount, sourceDecimals),
        slippage: ((isNumber(slippage) ? numberToFixed(slippage, 2) : DEFAULT_PERCENT_BRIDGE_SLIPPAGE) * 100).toString(),
        receiveLocal: receiveLocal || false,
        callData: callData || '0x',
        [relayerFeeField]: isNumber(relayerFee) && Number(relayerFee) > 0 ? parseUnits(numberToFixed(relayerFee, relayerFeeDecimals - 2), relayerFeeDecimals) : undefined,
        options: { signerAddress: address },
      }
      console.log('[/]', '[xcall setup]', { relayerFeeAssetType, relayerFee, fees, xcallParams })

      if (!xcallParams[relayerFeeField] && NETWORK !== 'testnet') {
        setCallResponse({
          status: 'failed',
          message: 'Cannot estimate the relayer fee at the moment. Please try again later.',
          code: XTransferErrorStatus.LowRelayerFee,
        })
        failed = true
      }

      // Approval to Connext is added to a multisend txn for xERC20s with Lockboxes, so skip those cases
      if (!failed && (!source_contract_data?.xERC20 || source_contract_data.contract_address === source_contract_data.xERC20)) {
        let amountToApprove
        console.log(source_contract_data, "prathmesh")
        try {
          amountToApprove = parseUnits(amount, sourceDecimals)
          console.log('[/]', '[approveIfNeeded before xcall]', { domain_id: xcallParams.origin, contract_address: xcallParams.asset, amount: xcallParams.amount, amountToApprove, infiniteApprove })

          const request = await sdk.sdkBase.approveIfNeeded(xcallParams.origin, xcallParams.asset, amountToApprove, infiniteApprove)
          if (request) {
            setApproving(true)
            const response = await signer.sendTransaction(request)
            const { hash } = { ...response }
            setApproveResponse({
              status: 'pending',
              message: `Waiting for ${symbol} approval`,
              tx_hash: hash,
            })

            setApproveProcessing(true)
            const receipt = await signer.provider.waitForTransaction(hash)
            const { status } = { ...receipt }
            failed = !status
            setApproveResponse(!failed ? null : { status: 'failed', message: `Failed to approve ${symbol}`, tx_hash: hash })
            setApproveProcessing(false)
          }
          setApproving(false)
        } catch (error) {
          const response = parseError(error)
          console.log('[/]', '[approveIfNeeded error before xcall]', { domain_id: xcallParams.origin, contract_address: xcallParams.asset, amount: xcallParams.amount, amountToApprove }, error, response)
          const { code } = { ...response }
          switch (code) {
            case 'user_rejected':
              reset(code)
              break
            default:
              setApproveResponse({ status: 'failed', ...response })
              break
          }
          setApproveProcessing(false)
          setApproving(false)
          failed = !success
        }
      }

      if (!failed) {
        const isWrapNative = (equalsIgnoreCase(source_contract_data?.contract_address, ZeroAddress) || (source_contract_data?.wrappable && !source_contract_data.symbol?.startsWith(WRAPPED_PREFIX))) && NATIVE_WRAPPABLE_SYMBOLS.includes(source_asset_data?.symbol)
        try {
          if (isWrapNative) {
            xcallParams.asset = original_source_contract_data?.contract_address
            xcallParams.wrapNativeOnOrigin = source_contract_data?.contract_address === ZeroAddress
            // use the native asset as the relayer fee instead of wrapping
            xcallParams.relayerFee = xcallParams.relayerFeeInTransactingAsset
            xcallParams.relayerFeeInTransactingAsset = '0'
          }

          // Track current step and total steps the user will need to take
          let currentStep = 1
          let totalSteps = 0

          // Alchemix assets are handled differently
          if (source_asset_data?.is_alchemix) {
            console.log('[/]', '[setup for Alchemix asset]', { relayerFeeAssetType, relayerFee, fees, xcallParams })
            const gateway = ALCHEMIX_GATEWAYS[destination_domain]
            const alAssetInterface = new utils.Interface([
              'function exchangeOldForCanonical(address bridgeTokenAddress, uint256 tokenAmount)',
              'function exchangeCanonicalForOld(address bridgeTokenAddress, uint256 tokenAmount)',
            ])

            // Source is Ethereum
            if (['6648936', '1735353714'].includes(source_domain)) {
              // xcall the gateway on destination
              xcallParams.callData = utils.defaultAbiCoder.encode(['address'], [xcallParams.to])
              xcallParams.to = gateway
            // Source is L2
            }
            else {
              const alAsset = xcallParams.asset
              const nextAlAsset = source_contract_data?.next_asset?.contract_address

              // exchange AlAsset into nextAlAsset on origin
              if (equalsIgnoreCase(xcallParams.asset, original_source_contract_data?.contract_address)) {
                console.log('exchanging alAsset to nextAlAsset')
                const exchangeData = alAssetInterface.encodeFunctionData('exchangeCanonicalForOld', [nextAlAsset, xcallParams.amount])
                const exchangeTxRequest = {
                  to: alAsset,
                  data: exchangeData,
                  from: address,
                  chainId: source_chain_data?.chain_id,
                }
                const exchangeTxReceipt = await signer.sendTransaction(exchangeTxRequest)
                await exchangeTxReceipt.wait()
              }

              // approve nextAlAsset
              console.log('checking approve nextAlAsset')
              const approveTxRequest = await sdk.sdkBase.approveIfNeeded(source_domain, nextAlAsset, xcallParams.amount)
              if (approveTxRequest) {
                console.log('approving nextAlAsset')
                const approveTxReceipt = await signer.sendTransaction(approveTxRequest)
                await approveTxReceipt.wait()
              }

              // set xcall asset to nextAlAsset
              xcallParams.asset = nextAlAsset

              // Destination is L2
              console.log(`receive local: ${receiveLocal}`)
              if (source_domain in ALCHEMIX_GATEWAYS && destination_domain in ALCHEMIX_GATEWAYS && !receiveLocal) {
                // xcall the gateway on destination
                xcallParams.callData = utils.defaultAbiCoder.encode(['address'], [xcallParams.to])
                xcallParams.to = gateway
              }
            }
          }

          // Lockbox handling for xERC20s
          const txs = []
          const multisendContract = await sdk.sdkBase.getDeploymentAddress(xcallParams.origin, 'multisend')

          if (source_asset_data?.is_xERC20) {
            if (!(source_contract_data?.xERC20 && equalsIgnoreCase(source_contract_data.contract_address, source_contract_data.xERC20))) {
              console.log('[/]', '[setup for an xERC20]', { relayerFeeAssetType, relayerFee, fees, xcallParams })
              // Lockbox exists on source domain, must deposit
              if (source_contract_data?.lockbox) {
                const lockboxInterface = new utils.Interface([
                  'function deposit(uint256 _amount)',
                  'function depositWithPermitAllowance(uint256 _amount, address _owner, tuple(tuple(address token, uint160 amount, uint48 expiration, uint48 nonce) details, address spender, uint256 sigDeadline) permitSingle, bytes calldata signature)',
                  'function withdraw(uint256 _amount)',
                ])
                const erc20Interface = new utils.Interface([
                  'function approve(address spender, uint256 amount)',
                  'function transferFrom(address from, address to, uint256 amount)',
                  'function allowance(address owner, address spender) view returns (uint256)',
                ])
                const permit2Interface = new utils.Interface([
                  'function permit(address owner, tuple(tuple(address token, uint160 amount, uint48 expiration, uint48 nonce) details, address spender, uint256 sigDeadline) permitSingle, bytes calldata signature)',
                  'function transferFrom(address from, address to, uint160 amount, address token)',
                  'function allowance(address, address, address) view returns (uint160 amount, uint48 expiration, uint48 nonce)',
                ])

                const erc20 = new Contract(xcallParams.asset, erc20Interface, signer)
                const xerc20 = new Contract(source_contract_data?.xERC20, erc20Interface, signer)
                const permit2 = new Contract(PERMIT2_ADDRESS, permit2Interface, signer)
                const connext = await sdk.sdkBase.getConnext(source_domain)

                const allowances = [
                  erc20.allowance(address, PERMIT2_ADDRESS),
                  erc20.allowance(address, source_contract_data?.lockbox_adapter),
                  xerc20.allowance(address, PERMIT2_ADDRESS),
                  xerc20.allowance(address, connext.address),
                  permit2.allowance(address, erc20.address, source_contract_data?.lockbox),
                  permit2.allowance(address, xerc20.address, multisendContract),
                ]
                const [
                  erc20AllowancePermit,
                  erc20AllowanceLockbox,
                  xerc20AllowancePermit,
                  xerc20AllowanceConnext,
                  [lockboxPermitAmount, lockboxPermitExpiration, lockboxPermitNonce],
                  [multisendPermitAmount, multisendPermitExpiration, multisendPermitNonce],
                ] = await Promise.all(allowances)

                if (source_contract_data?.permit_supported) {
                  // Start with 2 permit steps and 1 step for final multcall
                  totalSteps = 3
                  if (BigNumber.from(erc20AllowancePermit).lt(BigNumber.from(xcallParams.amount))) {
                    totalSteps += 1
                  }
                  if (BigNumber.from(xerc20AllowancePermit).lt(BigNumber.from(xcallParams.amount))) {
                    totalSteps += 1
                  }

                  // EOA approves ERC20 to permit2 if needed
                  if (BigNumber.from(erc20AllowancePermit).lt(BigNumber.from(xcallParams.amount))) {
                    setApproving(true)
                    setApproveResponse({
                      status: 'pending',
                      message: `(${currentStep}/${totalSteps}) Please approve ERC20 to permit2`,
                    })
                    const approvePermit2Erc20TxRequest = await erc20.approve(PERMIT2_ADDRESS, MaxUint256)
                    setApproveProcessing(true)
                    setApproveResponse({
                      status: 'pending',
                      message: `(${currentStep}/${totalSteps}) Waiting for ERC20 to permit2 approval`,
                    })
                    await approvePermit2Erc20TxRequest.wait()
                    currentStep += 1
                    setApproveResponse(null)
                    setApproveProcessing(false)
                    setApproving(false)
                  }

                  // EOA approves XERC20 to permit2 if needed
                  if (BigNumber.from(xerc20AllowancePermit).lt(BigNumber.from(xcallParams.amount))) {
                    setApproving(true)
                    setApproveResponse({
                      status: 'pending',
                      message: 'Please approve xERC20 to permit2',
                    })
                    const approveMultisendXerc20TxRequest = await xerc20.approve(PERMIT2_ADDRESS, MaxUint256)
                    setApproveProcessing(true)
                    setApproveResponse({
                      status: 'pending',
                      message: 'Waiting for xERC20 to permit2 approval',
                    })
                    await approveMultisendXerc20TxRequest.wait()
                    currentStep += 1
                    setApproveResponse(null)
                    setApproveProcessing(false)
                    setApproving(false)
                  }

                  // Create permit for Lockbox
                  if (lockboxPermitAmount < xcallParams.amount || lockboxPermitExpiration < MaxAllowanceExpiration) {
                    const permit = {
                      details: {
                        token: erc20.address,
                        amount: xcallParams.amount,
                        expiration: MaxAllowanceExpiration,
                        nonce: lockboxPermitNonce
                      },
                      spender: source_contract_data?.lockbox,
                      sigDeadline: MaxSigDeadline,
                    }

                    const { domain, types, values } = AllowanceTransfer.getPermitData(permit, PERMIT2_ADDRESS, source_chain_data?.chain_id)
                    const signature = await signer._signTypedData(domain, types, values)
                    currentStep += 1

                    // Add transaction to call `depositWithPermitAllowance` on Lockbox
                    const depositWithPermitAllowanceData = lockboxInterface.encodeFunctionData('depositWithPermitAllowance', [xcallParams.amount, address, permit, signature])
                    const depositWithPermitAllowanceTxRequest = {
                      to: source_contract_data?.lockbox,
                      data: depositWithPermitAllowanceData,
                      chainId: source_chain_data?.chain_id,
                    }
                    txs.push(depositWithPermitAllowanceTxRequest)
                  }

                  // Create permit for Multisend
                  if (multisendPermitAmount < xcallParams.amount || multisendPermitExpiration < MaxAllowanceExpiration) {
                    const permitMultisend = {
                      details: {
                        token: xerc20.address,
                        amount: xcallParams.amount,
                        expiration: MaxAllowanceExpiration,
                        nonce: multisendPermitNonce,
                      },
                      spender: multisendContract,
                      sigDeadline: MaxSigDeadline,
                    }

                    const { domain: domain2, types: types2, values: values2 } = AllowanceTransfer.getPermitData(permitMultisend, PERMIT2_ADDRESS, source_chain_data?.chain_id)
                    const signatureForMultisend = await signer._signTypedData(domain2, types2, values2)
                    currentStep += 1

                    // Add transaction to call `permit` on Permit2
                    const permitMultisendData = permit2Interface.encodeFunctionData('permit', [address, permitMultisend, signatureForMultisend])
                    const permitMultisendTxRequest = {
                      to: PERMIT2_ADDRESS,
                      data: permitMultisendData,
                      chainId: source_chain_data?.chain_id,
                    }
                    txs.push(permitMultisendTxRequest)
                  }

                  // Add transaction to `transferFrom` from user to Multisend using Permit2
                  const transferFromData = permit2Interface.encodeFunctionData('transferFrom', [address, multisendContract, xcallParams.amount, xerc20.address])
                  const transferFromTxRequest = {
                    to: PERMIT2_ADDRESS,
                    data: transferFromData,
                    chainId: source_chain_data?.chain_id,
                  }
                  txs.push(transferFromTxRequest)

                  // Add transaction to approve xERC20 spend to Connext
                  const approveXERC20TxRequest = await sdk.sdkBase.approveIfNeeded(xcallParams.origin, xerc20.address, xcallParams.amount, infiniteApprove, { signerAddress: multisendContract })
                  if (approveXERC20TxRequest) {
                    txs.push(approveXERC20TxRequest)
                  }
                } else {
                  // Start with 1 step for xcall
                  totalSteps = 1
                  if (BigNumber.from(erc20AllowanceLockbox).lt(BigNumber.from(xcallParams.amount))) {
                    totalSteps += 1
                  }

                  // Approve ERC20 spend to Lockbox
                  if (BigNumber.from(erc20AllowanceLockbox).lt(BigNumber.from(xcallParams.amount))) {
                    setCallResponse({
                      status: 'pending',
                      message: `(${currentStep}/${totalSteps}) Please approve ERC20 to Lockbox`,
                    })
                    const approveLockboxERC20TxRequest = await erc20.approve(source_contract_data?.lockbox_adapter, infiniteApprove ? constants.MaxUint256 : xcallParams.amount);
                    setCallResponse({
                      status: 'pending',
                      message: `(${currentStep}/${totalSteps}) Approving ERC20 to Lockbox`,
                    })
                    await approveLockboxERC20TxRequest.wait()
                    currentStep += 1
                  }
                  
                  getBalances(source_chain)

                  // Approve xERC20 spend to Connext
                  const approveXERC20TxRequest = await sdk.sdkBase.approveIfNeeded(xcallParams.origin, erc20.address, xcallParams.amount, infiniteApprove)
                  if (approveXERC20TxRequest) {
                    setCallResponse({
                      status: 'pending',
                      message: `(${currentStep}/${totalSteps}) Please approve xERC20 to Connext`,
                    })
                    const approveXERC20TxReceipt = await signer.sendTransaction(approveXERC20TxRequest)
                    setCallResponse({
                      status: 'pending',
                      message: `(${currentStep}/${totalSteps}) Approving xERC20 to Connext`,
                    })
                    await approveXERC20TxReceipt.wait()
                    currentStep += 1
                  }
                }

                // Set xcall asset to xERC20
                xcallParams.asset = erc20.address
              }
            }

            // Lockbox exists on destination domain, must withdraw through adapter
            if (destination_contract_data?.lockbox && destination_contract_data.lockbox_adapter) {
              xcallParams.callData = utils.defaultAbiCoder.encode(['address'], [xcallParams.to])
              xcallParams.to = destination_contract_data?.lockbox_adapter
            }
          }

          const CANONICAL_ASSET_SYMBOL = NATIVE_WRAPPABLE_SYMBOLS.find(s => s === source_asset_data?.symbol)
          if (CANONICAL_ASSET_SYMBOL && destination_chain_data?.native_token?.symbol?.endsWith(CANONICAL_ASSET_SYMBOL)) {
            xcallParams.unwrapNativeOnDestination = xcallParams.receiveLocal || receive_wrap ? false : true
          }

          console.log('[/]', '[xcall]', { xcallParams })
          let request = await sdk.sdkBase.xcall(xcallParams)
          setCallResponse({
            status: 'pending',
            message: `${totalSteps ? `(${currentStep}/${totalSteps}) ` : ''}Please send the bridge transaction`,
          })

          if (request) {
            if (txs.length > 0) {
              txs.push(request)
              request = {
                to: multisendContract,
                data: encodeMultisendCall(txs),
                value: xcallParams[relayerFeeField],
                chainId: source_chain_data?.chain_id,
              }
            }

            try {
              const gasLimit = await signer.estimateGas(request)
              if (gasLimit) {
                request.gasLimit = toBigNumber(toFixedNumber(gasLimit).mulUnsafe(toFixedNumber(GAS_LIMIT_ADJUSTMENT)))
              }
            } catch (error) {}
            const response = await signer.sendTransaction(request)
            const { hash } = { ...response }

            setCallProcessing(true)
            setCallResponse(null)
            const receipt = await signer.provider.waitForTransaction(hash)
            const { transactionHash, status } = { ...receipt }
            failed = !status
            setXcallData(receipt)
            setCallResponse({
              status: failed ? 'failed' : 'success',
              message: failed ? 'Failed to send transaction' : `Transferring ${symbol}. (It's ok to close the browser)`,
              tx_hash: hash,
            })
            success = true

            if (!failed) {
              try {
                const destination_transacting_asset = (receiveLocal || estimatedValues?.isNextAsset) && destination_contract_data?.next_asset?.contract_address ? destination_contract_data.next_asset.contract_address : destination_contract_data?.contract_address
                const destinationDecimals = (destination_contract_data?.next_asset && equalsIgnoreCase(destination_transacting_asset, destination_contract_data.next_asset.contract_address) ? destination_contract_data.next_asset.decimals : destination_contract_data?.decimals) || 18
                setLatestTransfers(
                  _.orderBy(
                    _.uniqBy(
                      _.concat(
                        {
                          xcall_transaction_hash: transactionHash || hash,
                          xcall_timestamp:  moment().unix(),
                          origin_chain: source_chain_data?.chain_id,
                          origin_domain: xcallParams.origin,
                          origin_transacting_asset: xcallParams.asset,
                          origin_transacting_amount: Number(parseUnits(amount, sourceDecimals)),
                          destination_chain: destination_chain_data?.chain_id,
                          destination_domain: xcallParams.destination,
                          destination_transacting_asset,
                          destination_transacting_amount: estimatedValues?.amountReceived ? parseUnits(estimatedValues.amountReceived - (relayerFeeAssetType === 'transacting' && Number(relayerFee) > 0 ? relayerFee : 0), destinationDecimals) : undefined,
                          to: xcallParams.unwrapNativeOnDestination ? destination_chain_data?.unwrapper_contract : xcallParams.to,
                          force_slow: forceSlow,
                          receive_local: receiveLocal || estimatedValues?.isNextAsset,
                        },
                        latestTransfers,
                      ),
                      'xcall_transaction_hash',
                    ),
                    ['xcall_timestamp'], ['desc'],
                  )
                )
                setOpenTransferStatus(true)
              } catch (error) {
                console.log('[/]', '[xcall setLatestTransfers error]', { xcallParams }, error)
              }
            }
          }
        } catch (error) {
          const response = parseError(error)
          console.log('[/]', '[xcall error]', { xcallParams }, error)
          const { code } = { ...response }
          let { message } = { ...response }
          if (message?.includes('insufficient funds for gas')) {
            message = 'Insufficient gas for the destination gas fee.'
          }
          switch (code) {
            case 'user_rejected':
              reset(code)
              break
            default:
              setCallResponse({ status: 'failed', ...response, message })
              break
          }
          failed = !success
        }
      }
    }

    if (failed) {
      setXcallData(null)
    }
    setCallProcessing(false)
    setCalling(false)

    if (sdk && address && success) {
      await sleep(1 * 1000)
      setBalanceTrigger(moment().valueOf())
      setTransfersTrigger(moment().valueOf())
    }
  }

  const { source_chain, destination_chain, asset, symbol, amount, receive_next, receive_wrap } = { ...bridge }
  const { to, infiniteApprove, slippage, relayerFeeAssetType, forceSlow, receiveLocal, showNextAssets } = { ...options }

  const source_chain_data = getChainData(source_chain, chains_data)
  const destination_chain_data = getChainData(destination_chain, chains_data)
  const { name, native_token, image, color } = { ...source_chain_data }
  const { url, transaction_path } = { ...destination_chain_data?.explorer }

  const source_asset_data = getAssetData(asset, assets_data)
  const { is_xERC20 } = { ...source_asset_data }
  let source_contract_data = getContractData(source_chain_data?.chain_id, source_asset_data?.contracts)
  const original_source_contract_data = _.cloneDeep(source_contract_data)
  if (symbol) {
    // xERC20 asset
    if (is_xERC20 && equalsIgnoreCase(`x${source_asset_data?.symbol}`, symbol)) {
      source_contract_data = { ...source_contract_data, contract_address: source_contract_data.xERC20, symbol: `x${source_asset_data.symbol}` }
    }
    // next asset
    else if (equalsIgnoreCase(source_contract_data?.next_asset?.symbol, symbol)) {
      source_contract_data = { ...source_contract_data, ...source_contract_data.next_asset }
    }
    // native asset
    else if (source_contract_data?.wrappable && [source_asset_data.symbol, native_token?.symbol].findIndex(s => equalsIgnoreCase(s, symbol)) > -1) {
      source_contract_data = { ...source_contract_data, contract_address: ZeroAddress, symbol: source_asset_data.symbol, image: source_asset_data.image }
    }
  }

  const destination_asset_data = getAssetData(asset, assets_data)
  let destination_contract_data = getContractData(destination_chain_data?.chain_id, destination_asset_data?.contracts)
  const original_destination_contract_data = _.cloneDeep(destination_contract_data)
  let isWrappableAsset = false
  // next asset
  if ((receiveLocal || estimatedValues?.isNextAsset) && destination_contract_data?.next_asset) {
    destination_contract_data = { ...destination_contract_data, ...destination_contract_data.next_asset }
  }
  // native asset
  else if (destination_contract_data?.wrappable && (!symbol || [destination_asset_data.symbol, destination_contract_data.symbol].findIndex(s => equalsIgnoreCase(s, symbol)) > -1)) {
    isWrappableAsset = true
    if (!receive_wrap) {
      destination_contract_data = { ...destination_contract_data, contract_address: ZeroAddress, symbol: destination_asset_data.symbol, image: destination_asset_data.image }
    }
  }

  const sourceSymbol = source_contract_data?.symbol || source_asset_data?.symbol
  const destinationSymbol = destination_contract_data?.symbol || destination_asset_data?.symbol
  const sourceDecimals = source_contract_data?.decimals || 18
  const destinationDecimals = destination_contract_data?.decimals || 18
  const sourceAmount = getBalanceData(source_chain_data?.chain_id, source_contract_data?.contract_address, balances_data)?.amount

  // remove symbol when select xERC20
  useEffect(
    () => {
      if (source_contract_data?.xERC20 && equalsIgnoreCase(source_contract_data.contract_address, source_contract_data.xERC20) && Number(sourceAmount) === 0) {
        setBridge({ ...bridge, symbol: null })
      }
    },
    [source_contract_data, sourceAmount],
  )

  let { routerFee, relayerFee } = { ...fees }
  routerFee = estimatedValues?.routerFee && !(forceSlow || estimatedValues?.isFastPath === false) ? estimatedValues.routerFee : fees ? forceSlow ? 0 : routerFee : null
  relayerFee = fees ? relayerFee || 0 : null

  const hasValue = isNumber(amount) && !isZero(amount) && typeof source_asset_data?.price === 'number' && !source_asset_data.is_stablecoin
  const relayerFeeToDeduct = relayerFeeAssetType === 'transacting' && Number(relayerFee) > 0 ? Number(numberToFixed(relayerFee, sourceDecimals)) : 0
  const feeAmountRatio = relayerFeeToDeduct > 0 && Number(amount) > 0 ? (Number(routerFee) + relayerFeeToDeduct) / amount : null
  const estimatedReceived = estimatedValues?.amountReceived ? Number(numberToFixed(estimatedValues.amountReceived - relayerFeeToDeduct, destinationDecimals)) : Number(amount) > 0 && isNumber(routerFee) ? Number(numberToFixed(amount - routerFee - relayerFeeToDeduct, destinationDecimals)) : null
  const estimatedSlippage = estimatedValues?.destinationSlippage && estimatedValues.originSlippage ? Number(estimatedValues.destinationSlippage) + Number(estimatedValues.originSlippage) : null
  const isNextAssetOnSource = equalsIgnoreCase(source_contract_data?.contract_address, original_source_contract_data?.next_asset?.contract_address)
  const isNextAssetOnDestination = equalsIgnoreCase(destination_contract_data?.contract_address, original_destination_contract_data?.next_asset?.contract_address)

  const routersLiquidityAmount = _.sum(toArray(router_asset_balances_data?.[destination_chain_data?.chain_id]).filter(d => toArray([destination_contract_data?.contract_address, destination_contract_data?.next_asset?.contract_address]).findIndex(a => equalsIgnoreCase(a, d.contract_address)) > -1).map(d => formatUnits(d.amount, destination_contract_data?.next_asset && equalsIgnoreCase(d.contract_address, destination_contract_data.next_asset.contract_address) ? destination_contract_data.next_asset.decimals : destinationDecimals)).map(d => Number(d) > 0 ? Number(d) : 0))
  const { adopted, local } = { ...toArray(pools_data).find(d => d.chain_data?.id === destination_chain && d.asset_data?.id === asset) }
  const next_asset_data = adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local?.symbol?.startsWith(WRAPPED_PREFIX) ? local : local
  const poolAmounts = toArray(_.concat(adopted, local)).filter(d => isNumber(d.balance)).map(d => Number(d.balance))
  const poolAmount = receiveLocal || estimatedValues?.isNextAsset ? null : Number(next_asset_data?.balance) > -1 ? Number(next_asset_data.balance) : _.min(poolAmounts)

  let alertMessage
  if (isNumber(amount)) {
    if (isNumber(sourceAmount) && BigInt(parseUnits(amount, sourceDecimals)) > BigInt(parseUnits(sourceAmount, sourceDecimals))) {
      alertMessage = 'Insufficient Balance'
    }
    else if (Number(amount) < 0) {
      alertMessage = 'The amount cannot be less than the transfer fee.'
    }
    else if (isNumber(poolAmount) && Number(amount) > poolAmount) {
      alertMessage = `Exceed Pool Balances: ${numberFormat(poolAmount, '0,0.00')}`
    }
    else if (fees) {
      if ((!isNumber(relayerFee) || Number(relayerFee) <= 0) && NETWORK !== 'testnet') {
        alertMessage = 'Cannot estimate the relayer fee at the moment. Please try again later.'
      }
      else if (Number(relayerFee) > 0) {
        switch (relayerFeeAssetType) {
          case 'native':
            const gasAmount = getBalanceData(source_chain_data?.chain_id, ZeroAddress, balances_data)?.amount
            if (isNumber(gasAmount) && BigInt(parseUnits(gasAmount)) < BigInt(parseUnits(relayerFee)) + BigInt(parseUnits(source_contract_data?.contract_address === ZeroAddress ? amount : '0'))) {
              alertMessage = 'Insufficient gas for the destination gas fee.'
            }
            break
          case 'transacting':
            if (estimatedReceived <= 0) {
              alertMessage = 'Fees greater than estimate received.'
            }
            break
          default:
            break
        }
      }
    }
  }

  const latestTransfer = _.head(latestTransfers)
  const { transfer_id, status, error_status, force_slow, transaction_hash, xcall_timestamp, execute_transaction_hash, routers } = { ...latestTransfer }
  const transferUrl = execute_transaction_hash && `${url}${transaction_path?.replace('{tx}', execute_transaction_hash)}`
  const estimatedTimeSpent = (routers?.length === 0 || force_slow ? 120 : 4) * 60
  const timeSpent = moment().diff(createMomentFromUnixtime(xcall_timestamp), 'seconds')
  const errored = error_status && ![XTransferErrorStatus.NoBidsReceived].includes(error_status) && !execute_transaction_hash && [XTransferStatus.XCalled, XTransferStatus.Reconciled].includes(status)
  const bumped = [XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.ExecutionError].includes(error_status) && toArray(latest_bumped_transfers_data).findIndex(d => equalsIgnoreCase(d.transfer_id, transfer_id) && moment().diff(moment(d.updated), 'minutes', true) <= 5) > -1
  const pendingTransfers = toArray(latestTransfers).filter(d => ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(d.status))
  const hasLatestTransfers = typeof latestTransfersSize === 'number' && latestTransfersSize > 0

  const supported = checkSupported()
  const disabled = calling || approving
  const response = callResponse || (!xcallData && approveResponse) || estimateResponse
  const wrong_chain = source_chain_data && wallet_chain_id !== source_chain_data.chain_id && !xcallData
  const boxShadow = color && `${color}${theme === 'light' ? '44' : '33'} 0px 16px 128px 64px`

  return (
    <div className={`children grid grid-cols-1 ${hasLatestTransfers ? 'lg:grid-cols-8' : ''} gap-4 my-4 sm:my-0 xl:my-4`}>
      <div className="hidden xl:block col-span-0 xl:col-span-2" />
      <div className={`col-span-1 ${hasLatestTransfers ? 'lg:col-span-5' : ''} xl:col-span-4 3xl:mt-16`}>
        <div className="flex flex-col items-center justify-center 3xl:justify-start space-y-6 my-4 sm:my-0 xl:my-6 mx-1 sm:mx-4">
          <div className={`w-full ${openTransferStatus && latestTransfer ? 'max-w-xl 3xl:max-w-2xl' : 'max-w-md 3xl:max-w-xl'}`}>
            {openTransferStatus && latestTransfer ?
              <div className="bg-slate-50 dark:bg-slate-900 rounded border dark:border-slate-800 space-y-4 pt-5 pb-6 px-4 sm:px-6">
                <div className="flex items-center justify-between space-x-2">
                  <span className="text-lg font-semibold">
                    Transfer status
                  </span>
                  <Tooltip content="If you close this window, your transaction will still be processed.">
                    <button
                      onClick={
                        () => {
                          setXcallData(null)
                          setCallResponse(null)
                          setOpenTransferStatus(false)
                        }
                      }
                    >
                      <MdClose size={20} className="-mr-1" />
                    </button>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-center">
                  <ActionRequired
                    forceDisabled={execute_transaction_hash || !errored || [XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(error_status) || bumped}
                    transferData={latestTransfer}
                    buttonTitle={
                      <Image
                        src={`/images/transfer-statuses/${execute_transaction_hash ? 'Success-End.gif' : errored ? error_status === XTransferErrorStatus.LowSlippage ? 'Error-Slippage.gif' : error_status === XTransferErrorStatus.LowRelayerFee ? 'Error-Gas.gif' : 'Error-Generic.gif' : 'Start.gif'}`}
                        srcEnd={`/images/transfer-statuses/${execute_transaction_hash ? 'Success-End.jpeg' : errored ? error_status === XTransferErrorStatus.LowSlippage ? 'Error-Slippage.jpeg' : error_status === XTransferErrorStatus.LowRelayerFee ? 'Error-Gas.jpeg' : 'Error-Generic.jpeg' : 'Processing.gif'}`}
                        width={526}
                        height={295.875}
                      />
                    }
                    onTransferBumped={
                      relayerFeeData => {
                        if (latestTransfers) {
                          const index = latestTransfers.findIndex(d => (d.transfer_id && d.transfer_id === transfer_id) || (d.xcall_transaction_hash && d.xcall_transaction_hash === transaction_hash))
                          if (index > -1) {
                            latestTransfers[index] = { ...latestTransfers[index], ...relayerFeeData, error_status: null }
                            setLatestTransfers(latestTransfers)
                          }
                        }
                      }
                    }
                    onSlippageUpdated={
                      slippage => {
                        if (latestTransfers) {
                          const index = latestTransfers.findIndex(d => (d.transfer_id && d.transfer_id === transfer_id) || (d.xcall_transaction_hash && d.xcall_transaction_hash === transaction_hash))
                          if (index > -1) {
                            latestTransfers[index] = { ...latestTransfers[index], slippage, error_status: null }
                            setLatestTransfers(latestTransfers)
                          }
                        }
                      }
                    }
                  />
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-slate-500 dark:text-slate-500 text-xs sm:text-sm font-medium">
                    {execute_transaction_hash ?
                      <div className="flex flex-col items-center">
                        <a
                          href={transferUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-center"
                        >
                          Transfer completed.
                        </a>
                      </div> :
                      errored ?
                        <div className="flex flex-col items-center space-y-1">
                          <ActionRequired
                            forceDisabled={[XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(error_status) || bumped}
                            transferData={latestTransfer}
                            buttonTitle={
                              <span className="text-center">
                                {[XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(error_status) ? `Error Status: ${error_status}` : bumped ? 'Waiting for bump' : `Please click here to bump the ${error_status === XTransferErrorStatus.LowSlippage ? 'slippage' : 'gas amount'} higher.`}
                              </span>
                            }
                            onTransferBumped={
                              relayerFeeData => {
                                if (latestTransfers) {
                                  const index = latestTransfers.findIndex(d => (d.transfer_id && d.transfer_id === transfer_id) || (d.xcall_transaction_hash && d.xcall_transaction_hash === transaction_hash))
                                  if (index > -1) {
                                    latestTransfers[index] = { ...latestTransfers[index], ...relayerFeeData, error_status: null }
                                    setLatestTransfers(latestTransfers)
                                  }
                                }
                              }
                            }
                            onSlippageUpdated={
                              slippage => {
                                if (latestTransfers) {
                                  const index = latestTransfers.findIndex(d => (d.transfer_id && d.transfer_id === transfer_id) || (d.xcall_transaction_hash && d.xcall_transaction_hash === transaction_hash))
                                  if (index > -1) {
                                    latestTransfers[index] = { ...latestTransfers[index], slippage, error_status: null }
                                    setLatestTransfers(latestTransfers)
                                  }
                                }
                              }
                            }
                          />
                          <div className="flex flex-wrap items-center justify-center">
                            <span className="mr-1">
                              To file a support request, please create a ticket on our discord
                            </span>
                            {process.env.NEXT_PUBLIC_FEEDBACK_URL && (
                              <a
                                href={process.env.NEXT_PUBLIC_FEEDBACK_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                here
                              </a>
                            )}.
                          </div>
                        </div> :
                        <div className="flex flex-col items-center space-y-3">
                          {timeSpent > estimatedTimeSpent ?
                            <span className="text-center">
                              Your assets are on the way! We will keep you informed.
                            </span> :
                            <div className="flex flex-wrap items-center justify-center space-x-1">
                              <span>Your funds will arrive at the destination in about</span>
                              <TimeSpent
                                fromTime={timeSpent}
                                toTime={estimatedTimeSpent}
                                noTooltip={true}
                                className="text-black dark:text-white font-semibold"
                              />.
                            </div>
                          }
                          <span className="text-center">
                            💡 Connext plugs into the chain native bridges for optimal security and trust minimization. No oracles or external validator sets are used.
                          </span>
                        </div>
                    }
                  </span>
                </div>
              </div> :
              <div className="space-y-3 3xl:space-y-4">
                {bridge._receiveLocal && destination_contract_data && !destination_contract_data.next_asset && (
                  <AlertNotification
                    show={typeof displayReceiveNextInfo !== 'boolean' || displayReceiveNextInfo}
                    icon={<IoInformationCircleOutline size={26} className="mb-0.5" />}
                    animate={{ mount: { y: 0 }, unmount: { y: 32 } }}
                    dismissible={{ onClose: () => setDisplayReceiveNextInfo(false) }}
                    className="alert-box flex"
                  >
                    <span className="text-sm">
                      Receive NextAsset setting turned off for {destination_chain_data?.name}.
                    </span>
                  </AlertNotification>
                )}
                {chains_data && assets_data && (
                  <div
                    className="bg-white dark:bg-slate-900 rounded border dark:border-slate-700 space-y-8 3xl:space-y-10 pt-5 sm:pt-6 3xl:pt-8 pb-6 sm:pb-7 3xl:pb-10 px-4 sm:px-6 3xl:px-8"
                    style={supported && boxShadow ? { boxShadow, WebkitBoxShadow: boxShadow, MozBoxShadow: boxShadow } : undefined}
                  >
                    <div className="space-y-7 3xl:space-y-10">
                      <div className="flex items-center justify-between space-x-2">
                        <h1 className="text-xl 3xl:text-2xl font-semibold">
                          Bridge
                          {receive_next && (
                            <span className="ml-1 3xl:ml-2">
                              into nextAsset
                            </span>
                          )}
                        </h1>
                        {source !== 'pool' && (
                          <Options
                            disabled={disabled}
                            applied={!_.isEqual(Object.fromEntries(Object.entries(options).filter(([k, v]) => !toArray(['slippage', 'forceSlow', 'showNextAssets', isApproveNeeded !== false && 'infiniteApprove']).includes(k))), Object.fromEntries(Object.entries(DEFAULT_OPTIONS).filter(([k, v]) => !toArray(['slippage', 'forceSlow', 'showNextAssets', isApproveNeeded !== false && 'infiniteApprove']).includes(k))))}
                            initialData={options}
                            onChange={
                              o => {
                                const { receiveLocal } = { ...o }
                                setOptions(o)
                                if ((receiveLocal && !options?.receiveLocal) || (!receiveLocal && options?.receiveLocal) || o?.relayerFeeAssetType !== relayerFeeAssetType) {
                                  if (isNumber(amount) && !isZero(amount)) {
                                    calculateAmountReceived(amount, receiveLocal)
                                    checkApprovedNeeded(amount)
                                  }
                                  else {
                                    setEstimatedValues({ amountReceived: '0', routerFee: '0', isNextAsset: receiveLocal })
                                    setIsApproveNeeded(false)
                                  }
                                  if (o?.relayerFeeAssetType !== relayerFeeAssetType) {
                                    setEstimateFeesTrigger(moment().valueOf())
                                  }
                                  if (equalsIgnoreCase(query?.receive_next?.toString(), 'true') && !receiveLocal) {
                                    const params = { amount, receive_next: receiveLocal }
                                    if (!isNumber(amount)) {
                                      delete params.amount
                                    }
                                    router.push(`/${source_chain && destination_chain ? `${asset ? `${asset.toUpperCase()}-` : ''}from-${source_chain}-to-${destination_chain}` : ''}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`, undefined, { shallow: true })
                                  }
                                }
                              }
                            }
                            showInfiniteApproval={isApproveNeeded}
                            hasNextAsset={destination_contract_data?.next_asset}
                            chainData={destination_chain_data}
                            relayerFeeAssetTypes={RELAYER_FEE_ASSET_TYPES.filter(d => source_asset_data?.allow_paying_gas || d !== 'transacting').map(d => { return { name: d === 'transacting' ? sourceSymbol : native_token?.symbol, value: d } })}
                          />
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-3 sm:gap-6">
                        <div className="col-span-2 flex flex-col items-center sm:items-start space-y-0.5 sm:space-y-2">
                          <div className="w-32 sm:w-40 flex flex-col sm:flex-row sm:items-center justify-start space-x-1.5">
                            <span className="text-slate-600 dark:text-slate-500 text-sm 3xl:text-xl font-medium text-left">
                              From
                            </span>
                          </div>
                          <SelectChain
                            disabled={disabled}
                            value={source_chain}
                            onSelect={
                              c => {
                                const _source_chain = c
                                const _destination_chain = c === destination_chain ? source_chain : destination_chain
                                const _asset = source_asset_data?.exclude_source_chains?.includes(_source_chain) || source_asset_data?.exclude_destination_chains?.includes(_destination_chain) ? _.head(toArray(assets_data).filter(d => d.id !== asset))?.id : asset
                                setBridge({ ...bridge, source_chain: _source_chain, destination_chain: _destination_chain, asset: _asset, symbol: equalsIgnoreCase(_source_chain, source_chain) && _asset === asset ? symbol : undefined })
                                getBalances(_source_chain)
                                getBalances(_destination_chain)
                              }
                            }
                            source={source_chain}
                            destination={destination_chain}
                            origin="from"
                            fixed={source === 'pool'}
                          />
                        </div>
                        <div className="flex items-center justify-center mt-5.5 sm:mt-7">
                          <button
                            disabled={disabled}
                            onClick={
                              () => {
                                if (!disabled) {
                                  const _source_chain = destination_chain
                                  const _destination_chain = source_chain
                                  const _asset = source_asset_data?.exclude_source_chains?.includes(_source_chain) || source_asset_data?.exclude_destination_chains?.includes(_destination_chain) ? _.head(toArray(assets_data).filter(d => d.id !== asset))?.id : asset
                                  setBridge({ ...bridge, source_chain: _source_chain, destination_chain: _destination_chain, asset: _asset, amount: null })
                                  getBalances(source_chain)
                                  getBalances(destination_chain)
                                }
                              }
                            }
                            className={`bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 ${disabled ? 'cursor-not-allowed' : ''} ${source === 'pool' ? 'pointer-events-none dark:border-slate-800' : 'dark:border-slate-700'} rounded border flex items-center justify-center p-1 sm:p-1.5`}
                          >
                            <HiArrowRight size={18} className="3xl:w-6 3xl:h-6" />
                          </button>
                        </div>
                        <div className="col-span-2 flex flex-col items-center sm:items-end space-y-0.5 sm:space-y-2">
                          <div className="w-32 sm:w-40 flex flex-col sm:flex-row sm:items-center justify-start space-x-1.5">
                            <span className="text-slate-600 dark:text-slate-500 text-sm 3xl:text-xl font-medium text-left">
                              To
                            </span>
                          </div>
                          <SelectChain
                            disabled={disabled}
                            value={destination_chain}
                            onSelect={
                              c => {
                                const _source_chain = c === source_chain ? destination_chain : source_chain
                                const _destination_chain = c
                                const _destination_chain_data = getChainData(_destination_chain, chains_data)
                                const source_asset_data = getAssetData(asset, assets_data)
                                const destination_contract_data = getContractData(_destination_chain_data?.chain_id, source_asset_data?.contracts)
                                const _asset = source_asset_data?.exclude_source_chains?.includes(_source_chain) || source_asset_data?.exclude_destination_chains?.includes(_destination_chain) ? _.head(toArray(assets_data).filter(d => d.id !== asset))?.id : source_asset_data && !destination_contract_data && NETWORK === 'mainnet' ? 'eth' : asset
                                setBridge({ ...bridge, source_chain: _source_chain, destination_chain: _destination_chain, asset: _asset })
                                getBalances(_source_chain)
                                getBalances(_destination_chain)
                              }
                            }
                            source={source_chain}
                            destination={destination_chain}
                            origin="to"
                            fixed={source === 'pool'}
                            include={getChainData(undefined, chains_data, { not_disabled: true, return_all: true }).filter(d => getContractData(d.chain_id, destination_asset_data?.contracts)).map(d => d.id)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between space-x-2">
                        <div className="text-slate-600 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                          You send
                        </div>
                        {source_chain_data && asset && (
                          <div className="flex items-center space-x-1">
                            <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                              Balance:
                            </div>
                            <button
                              disabled={disabled || (source_contract_data?.contract_address === ZeroAddress ? !fees : false)}
                              onClick={
                                () => {
                                  const maxAmount = sourceAmount && formatUnits(BigInt(parseUnits(sourceAmount, sourceDecimals)) - BigInt(parseUnits(relayerFee && source_contract_data?.contract_address === ZeroAddress ? relayerFee : '0', sourceDecimals)), sourceDecimals)
                                  if (BigInt(parseUnits(maxAmount, sourceDecimals)) > 0) {
                                    setBridge({ ...bridge, amount: maxAmount })
                                    if (isNumber(maxAmount)) {
                                      if (!isZero(maxAmount)) {
                                        checkApprovedNeeded(maxAmount)
                                      }
                                      else {
                                        setEstimatedValues({ amountReceived: '0', routerFee: '0', isNextAsset: receiveLocal })
                                        setIsApproveNeeded(false)
                                      }
                                    }
                                  }
                                }
                              }
                            >
                              <Balance
                                chainId={source_chain_data.chain_id}
                                asset={asset}
                                contractAddress={source_contract_data?.contract_address}
                                decimals={sourceDecimals}
                                symbol={sourceSymbol}
                                trigger={balanceTrigger}
                              />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-700 py-2.5 px-3">
                        <div className="flex items-center justify-between space-x-2">
                          <SelectAsset
                            disabled={disabled}
                            value={asset}
                            onSelect={
                              (a, s) => {
                                const source_asset_data = getAssetData(a, assets_data)
                                const destination_contract_data = getContractData(destination_chain_data?.chain_id, source_asset_data?.contracts)
                                const _destination_chain = destination_chain ? destination_contract_data ? destination_chain : _.head(getChainData(undefined, chains_data, { not_disabled: true, except: source_chain, return_all: true }).filter(d => getContractData(d.chain_id, source_asset_data?.contracts)))?.id : destination_chain
                                setBridge({ ...bridge, destination_chain: _destination_chain, asset: a, symbol: s, amount: a !== asset || !equalsIgnoreCase(s, symbol) ? null : amount })
                                if (a !== asset) {
                                  getBalances(source_chain)
                                  getBalances(destination_chain)
                                }
                              }
                            }
                            chain={source_chain}
                            destinationChain={destination_chain}
                            isBridge={true}
                            showNextAssets={showNextAssets}
                            showNativeAssets={true}
                            fixed={source === 'pool'}
                            data={{ ...source_asset_data, ...source_contract_data }}
                          />
                          <div>
                            <DebounceInput
                              debounceTimeout={750}
                              size="small"
                              type="number"
                              placeholder="0.00"
                              disabled={disabled || !asset}
                              value={isNumber(amount) ? amount : ''}
                              onChange={
                                e => {
                                  const regex = /^[0-9.\b]+$/
                                  let value
                                  if (e.target.value === '' || regex.test(e.target.value)) {
                                    value = e.target.value
                                  }
                                  if (typeof value === 'string') {
                                    if (value.startsWith('.')) {
                                      value = `0${value}`
                                    }
                                    value = numberToFixed(value, sourceDecimals)
                                  }
                                  setBridge({ ...bridge, amount: value })
                                  if (isNumber(value)) {
                                    if (!isZero(value)) {
                                      checkApprovedNeeded(value)
                                    }
                                    else {
                                      setEstimatedValues({ amountReceived: '0', routerFee: '0', isNextAsset: receiveLocal })
                                      setIsApproveNeeded(false)
                                    }
                                  }
                                }
                              }
                              onWheel={e => e.target.blur()}
                              onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                              className={`w-36 sm:w-48 bg-transparent ${disabled ? 'cursor-not-allowed' : ''} rounded border-0 focus:ring-0 text-lg 3xl:text-2xl font-semibold text-right ${hasValue ? 'py-0' : 'py-1.5'}`}
                            />
                            {hasValue && (
                              <div className="text-right">
                                <NumberDisplay
                                  value={(Number(amount) + relayerFeeToDeduct) * source_asset_data.price}
                                  prefix="$"
                                  className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {supported || !(source_chain && destination_chain && asset) ?
                      <div className="space-y-4">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between space-x-2">
                            <div className="text-slate-600 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                              You receive
                            </div>
                            {destination_chain_data && asset && (
                              <div className="flex items-center space-x-1">
                                <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                  Balance:
                                </div>
                                <Balance
                                  chainId={destination_chain_data.chain_id}
                                  asset={asset}
                                  contractAddress={destination_contract_data?.contract_address}
                                  decimals={destinationDecimals}
                                  symbol={destinationSymbol}
                                  trigger={balanceTrigger}
                                />
                              </div>
                            )}
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-800 py-4 px-3">
                            <div className="flex items-center justify-between space-x-2">
                              <SelectAsset
                                disabled={disabled}
                                value={asset}
                                onSelect={
                                  (a, s) => {
                                    if (!(source === 'pool' || !isWrappableAsset)) {
                                      setBridge({ ...bridge, asset: a, receive_wrap: s?.startsWith('W') })
                                      if (a !== asset) {
                                        getBalances(source_chain)
                                        getBalances(destination_chain)
                                      }
                                    }
                                  }
                                }
                                chain={destination_chain}
                                isBridge={true}
                                showNextAssets={!isWrappableAsset}
                                showNativeAssets={true}
                                showOnlyWrappable={isWrappableAsset}
                                fixed={source === 'pool' || !isWrappableAsset}
                                data={{ ...destination_asset_data, ...destination_contract_data }}
                              />
                              {!isNumber(amount) || isNumber(estimatedValues?.amountReceived) || estimateResponse ?
                                <span className="whitespace-nowrap text-lg 3xl:text-2xl font-semibold">
                                  {isNumber(amount) && isNumber(estimatedReceived) && !estimateResponse ?
                                    <span className={`w-36 sm:w-48 bg-transparent ${isNumber(estimatedReceived) && !isZero(estimatedReceived) ? '' : 'text-slate-500 dark:text-slate-500'} text-lg 3xl:text-2xl font-semibold text-right py-1.5`}>
                                      {estimatedReceived > 0 ? estimatedReceived : 0}
                                    </span> :
                                    <span>-</span>
                                  }
                                </span> :
                                <Spinner width={20} height={20} />
                              }
                            </div>
                          </div>
                        </div>
                        <div className={`space-y-2.5 ${isNumber(estimatedReceived) || !collapse ? 'mt-2.5' : 'mt-0'}`}>
                          <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-700 space-y-2.5 py-4 px-3">
                            <div
                              onClick={() => setCollapse(!collapse)}
                              className="cursor-pointer flex items-center justify-between space-x-1"
                            >
                              <div className={`whitespace-nowrap ${collapse ? 'text-slate-500 dark:text-slate-500 font-medium' : 'font-semibold'} text-sm 3xl:text-xl`}>
                                Additional Details
                              </div>
                              <div className="flex items-center">
                                <div>{collapse ? <BiChevronDown size={20} className="3xl:w-5 3xl:h-5" /> : <BiChevronUp size={20} className="3xl:w-5 3xl:h-5" />}</div>
                              </div>
                            </div>
                            {!collapse && (
                              <>
                                {'to' in options && to && (
                                  <div className="flex items-center justify-between space-x-1">
                                    <Tooltip content="The destination address that you want to send asset to.">
                                      <div className="flex items-center">
                                        <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                          Recipient address
                                        </div>
                                        <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                                      </div>
                                    </Tooltip>
                                    <div className="flex flex-col sm:items-end space-y-1.5">
                                      {recipientEditing ?
                                        <div className="flex items-center justify-end space-x-1.5">
                                          <DebounceInput
                                            debounceTimeout={750}
                                            size="small"
                                            type="text"
                                            placeholder={address}
                                            value={to}
                                            onChange={
                                              e => {
                                                let value = e.target.value
                                                try {
                                                  value = split(value, 'normal', ' ').join('')
                                                  value = getAddress(value)
                                                } catch (error) {
                                                  value = address
                                                }
                                                setOptions({ ...options, to: value })
                                              }
                                            }
                                            className={`w-40 sm:w-56 bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 rounded border-0 focus:ring-0 text-sm 3xl:text-xl font-semibold text-right py-1.5 px-2`}
                                          />
                                          <button
                                            onClick={() => setRecipientEditing(false)}
                                            className="bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white"
                                          >
                                            <BiCheckCircle size={16} className="3xl:w-5 3xl:h-5" />
                                          </button>
                                        </div> :
                                        <div className="flex items-center space-x-1.5">
                                          <Tooltip content={to}>
                                            <span className="text-sm 3xl:text-xl font-semibold">
                                              {ellipse(to, 8)}
                                            </span>
                                          </Tooltip>
                                          <button
                                            disabled={disabled}
                                            onClick={
                                              () => {
                                                if (!disabled) {
                                                  setRecipientEditing(true)
                                                }
                                              }
                                            }
                                            className="rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white mt-0.5"
                                          >
                                            <BiEditAlt size={16} className="3xl:w-5 3xl:h-5" />
                                          </button>
                                        </div>
                                      }
                                    </div>
                                  </div>
                                )}
                                {!(forceSlow || estimatedValues?.isFastPath === false) && (
                                  <div className="flex items-center justify-between space-x-1">
                                    <Tooltip content={`Liquidity providers receive a ${PERCENT_ROUTER_FEE}% fee for supporting fast transfers`}>
                                      <div className="flex items-center">
                                        <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                          Router fee
                                        </div>
                                        <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                                      </div>
                                    </Tooltip>
                                    {!isNumber(amount) || isNumber(estimatedValues?.routerFee) || estimateResponse ?
                                      <span className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-semibold space-x-1.5">
                                        {isNumber(amount) && isNumber(estimatedValues?.routerFee) && !estimateResponse ?
                                          <NumberDisplay value={Number(routerFee) > 0 ? routerFee : 0} className="text-sm 3xl:text-xl" /> :
                                          <span>-</span>
                                        }
                                        <span>{sourceSymbol}</span>
                                      </span> :
                                      <Spinner width={14} height={14} />
                                    }
                                  </div>
                                )}
                                <div className="flex items-center justify-between space-x-1">
                                  <Tooltip content="Fee fluctuates with destination chain gas cost. You can change the asset to pay this in advanced settings.">
                                    <div className="flex items-center">
                                      <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                        Gas on destination
                                      </div>
                                      <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                                    </div>
                                  </Tooltip>
                                  {fees ?
                                    <div className="flex items-center space-x-1.5">
                                      <span className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-semibold space-x-1.5">
                                        <NumberDisplay value={Number(relayerFee) > 0 ? relayerFee : 0} className="text-sm 3xl:text-xl" />
                                        <span>{relayerFeeAssetType === 'transacting' ? sourceSymbol : native_token?.symbol}</span>
                                      </span>
                                      <button
                                        disabled={disabled}
                                        onClick={
                                          () => {
                                            if (!disabled) {
                                              setEstimateFeesTrigger(moment().valueOf())
                                            }
                                          }
                                        }
                                        className="rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white"
                                      >
                                        <MdRefresh size={16} className="3xl:w-5 3xl:h-5" />
                                      </button>
                                    </div> :
                                    <Spinner width={14} height={14} />
                                  }
                                </div>
                                {signer && isApproveNeeded && (
                                  <div className="flex flex-col space-y-0.5">
                                    <div className="flex items-center justify-between space-x-1">
                                      <Tooltip content="We need your approval to execute this transaction on your behalf.">
                                        <div className="flex items-center">
                                          <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                            Infinite approval
                                          </div>
                                          <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                                        </div>
                                      </Tooltip>
                                      <Tooltip content={isApproveNeeded ? 'We need your approval to execute this transaction on your behalf.' : 'Approval sufficient. If you need to, please revoke using other tools.'}>
                                        <div className="w-fit flex items-center">
                                          <Switch
                                            disabled={disabled || !isApproveNeeded}
                                            width={32}
                                            height={16}
                                            checked={typeof infiniteApprove === 'boolean' ? infiniteApprove : false}
                                            onChange={e => setOptions({ ...options, infiniteApprove: !infiniteApprove })}
                                            checkedIcon={false}
                                            uncheckedIcon={false}
                                            onColor={switchColor(theme).on}
                                            onHandleColor="#f8fafc"
                                            offColor={switchColor(theme).off}
                                            offHandleColor="#f8fafc"
                                          />
                                        </div>
                                      </Tooltip>
                                    </div>
                                  </div>
                                )}
                                {!is_xERC20 && !(isNextAssetOnDestination && destination_chain_data?.is_layer_2 && source_chain_data?.id === 'ethereum') && !(isNextAssetOnSource && !original_destination_contract_data?.next_asset && destination_chain_data?.id === 'ethereum') && (
                                  <>
                                    {source !== 'pool' && (
                                      <div className="flex items-start justify-between space-x-1">
                                        <Tooltip content="The maximum percentage you are willing to lose due to market changes.">
                                          <div className="flex items-center">
                                            <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                              Slippage tolerance
                                            </div>
                                            <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                                          </div>
                                        </Tooltip>
                                        <div className="flex flex-col sm:items-end space-y-1.5">
                                          {slippageEditing ?
                                            <>
                                              <div className="flex items-center justify-end space-x-1.5">
                                                <DebounceInput
                                                  debounceTimeout={750}
                                                  size="small"
                                                  type="number"
                                                  placeholder="0.00"
                                                  value={isNumber(slippage) ? slippage : ''}
                                                  onChange={
                                                    e => {
                                                      const regex = /^[0-9.\b]+$/
                                                      let value
                                                      if (e.target.value === '' || regex.test(e.target.value)) {
                                                        value = e.target.value
                                                      }
                                                      if (typeof value === 'string') {
                                                        if (value.startsWith('.')) {
                                                          value = `0${value}`
                                                        }
                                                        if (isNumber(value)) {
                                                          value = Number(value)
                                                        }
                                                      }
                                                      value = value <= 0 ? 0.01 : value > 100 ? DEFAULT_PERCENT_BRIDGE_SLIPPAGE : value
                                                      setOptions({ ...options, slippage: isNumber(value) ? parseFloat(numberToFixed(value, 2)) : value })
                                                    }
                                                  }
                                                  onWheel={e => e.target.blur()}
                                                  onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                                                  className={`w-20 bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 rounded border-0 focus:ring-0 text-sm 3xl:text-xl font-semibold text-right py-1 px-2`}
                                                />
                                                <button
                                                  onClick={() => setSlippageEditing(false)}
                                                  className="bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white"
                                                >
                                                  <BiCheckCircle size={16} className="3xl:w-5 3xl:h-5" />
                                                </button>
                                              </div>
                                              <div className="flex items-center space-x-1.5 -mr-1.5">
                                                {[3.0, 1.0, 0.5].map((s, i) => (
                                                  <div
                                                    key={i}
                                                    onClick={
                                                      () => {
                                                        setOptions({ ...options, slippage: s })
                                                        setSlippageEditing(false)
                                                      }
                                                    }
                                                    className={`${slippage === s ? 'bg-slate-200 dark:bg-slate-700 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium hover:font-semibold'} rounded cursor-pointer text-xs 3xl:text-xl py-1 px-1.5`}
                                                  >
                                                    {s} %
                                                  </div>
                                                ))}
                                              </div>
                                            </> :
                                            <div className="flex items-center space-x-1.5">
                                              <NumberDisplay
                                                value={slippage}
                                                suffix="%"
                                                className="whitespace-nowrap text-sm 3xl:text-xl font-semibold"
                                              />
                                              <button
                                                disabled={disabled}
                                                onClick={
                                                  () => {
                                                    if (!disabled) {
                                                      setSlippageEditing(true)
                                                    }
                                                  }
                                                }
                                                className="rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white mt-0.5"
                                              >
                                                <BiEditAlt size={16} className="3xl:w-5 3xl:h-5" />
                                              </button>
                                            </div>
                                          }
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between space-x-1">
                                      <Tooltip content={`Minimum amount received after slippage${typeof slippage === 'number' && slippage >= 0 ? ` ${slippage}%` : ''}`}>
                                        <div className="flex items-center">
                                          <div className="sm:whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                            Minimum received after slippage
                                          </div>
                                          <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                                        </div>
                                      </Tooltip>
                                      {!isNumber(amount) || isNumber(estimatedValues?.amountReceived) || estimateResponse ?
                                        <span className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-semibold space-x-1.5">
                                          {isNumber(amount) && isNumber(estimatedReceived) && !estimateResponse ?
                                            <NumberDisplay
                                              value={numberToFixed((estimatedReceived > 0 ? estimatedReceived : 0) * ((100 - (isNumber(slippage) && slippage >= 0 ? slippage : DEFAULT_PERCENT_BRIDGE_SLIPPAGE)) / 100), estimatedReceived > 0 ? destinationDecimals : 0)}
                                              className="text-sm 3xl:text-xl"
                                            /> :
                                            <span>-</span>
                                          }
                                          <span>{destinationSymbol}</span>
                                        </span> :
                                        <Spinner width={14} height={14} />
                                      }
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                            {Number(amount) > 0 && isNumber(estimatedReceived) && estimatedReceived > 0 && (Number(amount) < routersLiquidityAmount || router_asset_balances_data || is_xERC20) && (
                              <div className="flex items-center justify-between space-x-1">
                                <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                  Estimated Time
                                </div>
                                <Tooltip content={(Number(amount) > routersLiquidityAmount || forceSlow || estimatedValues?.isFastPath === false) ? 'Unable to leverage fast liquidity. Your transfer will still complete.' : 'Fast transfer enabled by Connext router network.'}>
                                  <div className="flex items-center">
                                    <span className="whitespace-nowrap text-sm 3xl:text-xl font-semibold">
                                      {(Number(amount) > routersLiquidityAmount || forceSlow || estimatedValues?.isFastPath === false) ?
                                        <span className="text-yellow-500 dark:text-yellow-400">
                                          {'<180 minutes'}
                                        </span> :
                                        <span className="text-green-600 dark:text-green-500">
                                          {'<4 minutes'}
                                        </span>
                                      }
                                    </span>
                                    <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                                  </div>
                                </Tooltip>
                              </div>
                            )}
                          </div>
                          {source !== 'pool' && <WarningSlippage value={slippage} estimatedValue={estimatedSlippage} />}
                          {!calling && <WarningFeeRatio ratio={feeAmountRatio} />}
                        </div>
                      </div> :
                      source_chain && destination_chain && asset && (
                        <div className="text-slate-400 dark:text-slate-200 3xl:text-2xl font-medium text-center">
                          Route not supported
                        </div>
                      )
                    }
                    {provider && supported && (wrong_chain || isNumber(amount)) && (xcallData || isNumber(sourceAmount)) ?
                      wrong_chain ?
                        <Wallet
                          connectChainId={source_chain_data?.chain_id}
                          className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base 3xl:text-2xl font-medium space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                        >
                          <span>Switch to</span>
                          {image && (
                            <Image
                              src={image}
                              width={28}
                              height={28}
                              className="3xl:w-8 3xl:h-8 rounded-full"
                            />
                          )}
                          <span className="font-medium">
                            {name}
                          </span>
                        </Wallet> :
                        !xcallData && !calling && !callResponse && alertMessage ?
                          <Alert status="failed" closeDisabled={true}>
                            <span>{alertMessage}</span>
                          </Alert> :
                          !xcallData && !callResponse && !approveResponse && !estimateResponse ?
                            <button
                              disabled={disabled || isZero(amount) || estimatedReceived <= 0 || ((!isNumber(relayerFee) || Number(relayerFee) <= 0) && NETWORK !== 'testnet')}
                              onClick={
                                () => {
                                  setRecipientEditing(false)
                                  setSlippageEditing(false)
                                  xcall(relayerFee)
                                }
                              }
                              className={`w-full ${disabled ? 'bg-blue-400 dark:bg-blue-500 text-white' : isZero(amount) || estimatedReceived <= 0 || ((!isNumber(relayerFee) || Number(relayerFee) <= 0) && NETWORK !== 'testnet') ? 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded text-base 3xl:text-2xl py-3 sm:py-4 px-2 sm:px-3`}
                            >
                              <span className={`flex items-center justify-center ${!approving && calling && callProcessing ? 'space-x-3 ml-1.5' : 'space-x-3'}`}>
                                {disabled && <div><Spinner width={20} height={20} color="white" /></div>}
                                <span>
                                  {calling ?
                                    approving ?
                                      approveProcessing ? 'Approving' : 'Please Approve' :
                                      callProcessing ?
                                        'Transfer in progress ...' :
                                        typeof approving === 'boolean' && !source_asset_data?.is_xERC20 ? 'Please Confirm' : 'Checking Approval' :
                                    'Send'
                                  }
                                </span>
                              </span>
                            </button> :
                            toArray(response).map((d, i) => {
                              const { status, message, code, tx_hash } = { ...d }

                              let color
                              switch (status) {
                                case 'success':
                                  color = callResponse ? 'bg-blue-600 dark:bg-blue-400' : 'bg-green-500 dark:bg-green-400'
                                  break
                                case 'failed':
                                  color = 'bg-red-500 dark:bg-red-400'
                                  break
                                default:
                                  break
                              }
                              const closeButton = color && (
                                <button onClick={() => reset(code)} className={`${color} rounded-full flex items-center justify-center text-white p-1`}>
                                  <MdClose size={14} />
                                </button>
                              )

                              return (
                                <Alert
                                  key={i}
                                  status={status}
                                  icon={status === 'pending' && (
                                    <div className="mr-3">
                                      <Spinner width={20} height={20} color="white" />
                                    </div>
                                  )}
                                  closeDisabled={true}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between space-x-2">
                                      <span className="leading-5 break-words text-sm 3xl:text-xl font-medium">
                                        {ellipse(normalizeMessage(message, status), 128)}
                                      </span>
                                      <div className="flex items-center space-x-1">
                                        {status === 'failed' && message && <Copy value={message} className="cursor-pointer text-slate-200 hover:text-white" />}
                                        {closeButton}
                                      </div>
                                    </div>
                                    {status === 'failed' && (
                                      <div className="text-sm 3xl:text-xl font-bold">
                                        <span className="mr-1">
                                          To file a support request, please create a ticket on our discord
                                        </span>
                                        {process.env.NEXT_PUBLIC_FEEDBACK_URL && (
                                          <a
                                            href={process.env.NEXT_PUBLIC_FEEDBACK_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline"
                                          >
                                            here
                                          </a>
                                        )}.
                                      </div>
                                    )}
                                  </div>
                                </Alert>
                              )
                            }) :
                      provider ?
                        <button disabled={true} className="w-full bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed rounded text-slate-400 dark:text-slate-500 text-base 3xl:text-2xl text-center py-3 sm:py-4 px-2 sm:px-3">
                          Send
                        </button> :
                        <Wallet
                          connectChainId={source_chain_data?.chain_id}
                          buttonConnectTitle="Connect Wallet"
                          className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base 3xl:text-2xl font-medium text-center py-3 sm:py-4 px-2 sm:px-3"
                        >
                          <span>Connect Wallet</span>
                        </Wallet>
                    }
                  </div>
                )}
              </div>
            }
          </div>
          {!openTransferStatus && original_source_contract_data?.mintable && <Faucet tokenId={asset} contractData={original_source_contract_data} defaultChain={source_chain} />}
          {!openTransferStatus && original_source_contract_data?.xERC20 && !calling && !callResponse && pendingTransfers.findIndex(d => [d.origin_bridged_asset, d.origin_transacting_asset].findIndex(a => equalsIgnoreCase(a, original_source_contract_data.xERC20)) > -1) < 0 && (
            <div className="max-w-md 3xl:max-w-xl">
              <WarningXERC20 asset={source_asset_data} contract={source_contract_data} />
            </div>
          )}
        </div>
      </div>
      <div className={`col-span-1 ${hasLatestTransfers ? 'lg:col-span-3' : ''} xl:col-span-2 3xl:mt-8`}>
        <LatestTransfers
          data={latestTransfers}
          trigger={transfersTrigger}
          onUpdate={
            data => {
              setLatestTransfers(data)
              setLatestTransfersSize(toArray(data).length)
            }
          }
        />
      </div>
    </div>
  )
}
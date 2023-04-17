import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { XTransferStatus, XTransferErrorStatus } from '@connext/nxtp-utils'
import { BigNumber, FixedNumber, constants, utils } from 'ethers'
import { TailSpin, Oval } from 'react-loader-spinner'
import Switch from 'react-switch'
import { DebounceInput } from 'react-debounce-input'
import { Tooltip, Alert as AlertNotification } from '@material-tailwind/react'
import { MdClose, MdRefresh } from 'react-icons/md'
import { HiArrowRight } from 'react-icons/hi'
import { BiMessageError, BiMessageCheck, BiMessageDetail, BiEditAlt, BiCheckCircle, BiInfoCircle } from 'react-icons/bi'
import { IoInformationCircleOutline, IoWarning } from 'react-icons/io5'

import Options from './options'
import WarningGasVsAmount from './warning-gas-vs-amount'
import ActionRequired from '../action-required'
import Alert from '../alerts'
import Balance from '../balance'
import Copy from '../copy'
import DecimalsFormat from '../decimals-format'
import Faucet from '../faucet'
import Image from '../image'
import LatestTransfers from '../latest-transfers'
import SelectAsset from '../select/asset'
import SelectChain from '../select/chain'
import TimeSpent from '../time-spent'
import Wallet from '../wallet'
import { currency_symbol } from '../../lib/object/currency'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { getBalance } from '../../lib/object/balance'
import { split, toArray, includesStringList, paramsToObj, numberFormat, numberToFixed, ellipse, equalsIgnoreCase, loaderColor, switchColor, sleep, errorPatterns, parseError } from '../../lib/utils'
import { BALANCES_DATA, GET_BALANCES_DATA } from '../../reducers/types'

const is_staging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' || process.env.NEXT_PUBLIC_APP_URL?.includes('staging')
const WRAPPED_PREFIX = process.env.NEXT_PUBLIC_WRAPPED_PREFIX
const ROUTER_FEE_PERCENT = Number(process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT)
const GAS_LIMIT_ADJUSTMENT = Number(process.env.NEXT_PUBLIC_GAS_LIMIT_ADJUSTMENT)
const DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE)
const RELAYER_FEE_ASSET_TYPES = ['native', 'transacting']

const DEFAULT_OPTIONS = {
  to: '',
  infiniteApprove: false,
  callData: '',
  slippage: DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE,
  forceSlow: false,
  receiveLocal: false,
  showNextAssets: true,
}

export default () => {
  const dispatch = useDispatch()
  const {
    preferences,
    chains,
    assets,
    router_asset_balances,
    pools,
    rpc_providers,
    dev,
    wallet,
    balances,
    latest_bumped_transfers,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        router_asset_balances: state.router_asset_balances,
        pools: state.pools,
        rpc_providers: state.rpc_providers,
        dev: state.dev,
        wallet: state.wallet,
        balances: state.balances,
        latest_bumped_transfers: state.latest_bumped_transfers,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    router_asset_balances_data,
  } = { ...router_asset_balances }
  const {
    pools_data,
  } = { ...pools }
  const {
    rpcs,
  } = { ...rpc_providers }
  const {
    sdk,
  } = { ...dev }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    chain_id,
    provider,
    browser_provider,
    signer,
    address,
  } = { ...wallet_data }
  const {
    balances_data,
  } = { ...balances }
  const {
    latest_bumped_transfers_data,
  } = { ...latest_bumped_transfers }

  const wallet_chain_id = wallet_data?.chain_id

  const router = useRouter()
  const {
    asPath,
    query,
  } = { ...router }
  const {
    source,
  } = { ...query }

  const [bridge, setBridge] = useState({})
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [buttonDirection, setButtonDirection] = useState(1)
  const [collapse, setCollapse] = useState(false)
  const [recipientEditing, setRecipientEditing] = useState(false)
  const [slippageEditing, setSlippageEditing] = useState(false)
  const [estimatedValues, setEstimatedValues] = useState(undefined)
  const [estimateResponse, setEstimateResponse] = useState(null)
  const [isApproveNeeded, setIsApproveNeeded] = useState(undefined)

  const [relayerFeeAssetType, setRelayerFeeAssetType] = useState(_.head(RELAYER_FEE_ASSET_TYPES))
  const [fees, setFees] = useState(null)
  const [estimateFeesTrigger, setEstimateFeesTrigger] = useState(null)

  const [approving, setApproving] = useState(null)
  const [approveProcessing, setApproveProcessing] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [xcall, setXcall] = useState(null)
  const [calling, setCalling] = useState(null)
  const [callProcessing, setCallProcessing] = useState(null)
  const [xcallResponse, setXcallResponse] = useState(null)

  const [balanceTrigger, setBalanceTrigger] = useState(null)
  const [transfersTrigger, setTransfersTrigger] = useState(null)

  const [latestTransfers, setLatestTransfers] = useState([])
  const [openTransferStatus, setOpenTransferStatus] = useState(false)
  const [timeTrigger, setTimeTrigger] = useState(false)

  const [displayReceiveNextInfo, setDisplayReceiveNextInfo] = useState(null)
  const [receiveNextInfoTimeout, setReceiveNextInfoTimeout] = useState(null)
  const [latestTransfersSize, setLatestTransfersSize] = useState(null)

  // get bridge from path
  useEffect(
    () => {
      let updated = false

      const params = paramsToObj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))

      let path = !asPath ? '/' : asPath.toLowerCase()
      path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path

      const {
        symbol,
        amount,
        receive_next,
      } = { ...params }

      if (path.includes('from-') && path.includes('to-')) {
        const paths = path.replace('/', '').split('-')

        const source_chain = paths[paths.indexOf('from') + 1]
        const destination_chain = paths[paths.indexOf('to') + 1]
        const asset = _.head(paths) !== 'from' ? _.head(paths) : process.env.NEXT_PUBLIC_NETWORK === 'testnet' ? 'test' : 'usdc'

        const source_chain_data = getChain(source_chain, chains_data)
        const destination_chain_data = getChain(destination_chain, chains_data)
        const asset_data = getAsset(asset, assets_data)

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

        if (symbol) {
          bridge.symbol = symbol
          updated = true
        }

        if (bridge.source_chain && !isNaN(amount) && Number(amount) > 0) {
          bridge.amount = amount
          updated = true

          if (sdk) {
            calculateAmountReceived(bridge.amount)

            if (isApproveNeeded === undefined) {
              checkApprovedNeeded(bridge.amount)
            }
          }
        }
        else if (estimatedValues) {
          if (['', '0', '0.0'].includes(amount)) {
            setEstimatedValues(
              {
                amountReceived: '0',
                routerFee: '0',
                isNextAsset: [true, 'true'].includes(receive_next),
              }
            )
          }
          else {
            setEstimatedValues(undefined)
          }
        }
      }

      if ([true, 'true'].includes(receive_next)) {
        bridge.receive_next = true
        updated = true

        setOptions(
          {
            ...options,
            receiveLocal: true,
          }
        )
      }
      else if ([false, 'false'].includes(receive_next)) {
        bridge.receive_next = false
        updated = true

        setOptions(
          {
            ...options,
            receiveLocal: false,
          }
        )
      }

      if (updated) {
        setBridge(bridge)
      }
    },
    [asPath, chains_data, assets_data, sdk],
  )

  // set bridge to path
  useEffect(
    () => {
      const params = {}

      if (bridge) {
        const {
          source_chain,
          destination_chain,
          asset,
          symbol,
          amount,
        } = { ...bridge }

        const source_chain_data = getChain(source_chain, chains_data, true)

        if (source_chain_data) {
          params.source_chain = source_chain

          if (asset && getAsset(asset, assets_data, source_chain_data.chain_id)) {
            params.asset = asset
          }
        }

        const destination_chain_data = getChain(destination_chain, chains_data, true)

        if (destination_chain_data) {
          params.destination_chain = destination_chain

          if (asset && getAsset(asset, assets_data, destination_chain_data.chain_id)) {
            params.asset = asset
          }
        }

        if (params.source_chain && params.asset) {
          if (!isNaN(amount) && Number(amount) > 0) {
            params.amount = amount
          }

          if (symbol && getAsset(asset, assets_data, source_chain_data.chain_id, symbol)) {
            params.symbol = symbol
          }
        }
      }

      const {
        slippage,
      } = { ...options }
      let {
        receiveLocal,
      } = { ...options }

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

      if (Object.keys(params).length > 0) {
        const {
          source_chain,
          destination_chain,
          asset,
          symbol,
        } = { ...params }

        delete params.source_chain
        delete params.destination_chain
        delete params.asset

        if (!symbol) {
          delete params.symbol
        }

        router.push(
          `/${source_chain && destination_chain ? `${asset ? `${asset.toUpperCase()}-` : ''}from-${source_chain}-to-${destination_chain}` : ''}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`,
          undefined,
          {
            shallow: true,
          },
        )

        setBalanceTrigger(moment().valueOf())
      }

      const destination_chain_data = getChain(destination_chain, chains_data)

      const {
        chain_id,
      } = { ...destination_chain_data }

      const {
        contract_address,
        next_asset,
      } = { ...destination_contract_data }

      const {
        symbol,
      } = { ...params }

      const routers_liquidity_amount =
        _.sum(
          toArray(router_asset_balances_data?.[chain_id])
            .filter(a =>
              toArray(_.concat(contract_address, next_asset?.contract_address)).findIndex(_a => equalsIgnoreCase(a?.contract_address, _a)) > -1
            )
            .map(a =>
              Number(utils.formatUnits(BigInt(a?.amount || '0'), equalsIgnoreCase(a?.contract_address, next_asset?.contract_address) && next_asset ? next_asset?.decimals || 18 : destination_decimals))
            )
        )

      setOptions(
        {
          ...options,
          slippage,
          forceSlow: destination_chain_data && router_asset_balances_data ? Number(amount) > routers_liquidity_amount : false,
          receiveLocal,
        }
      )

      setEstimateResponse(null)
      setEstimateFeesTrigger(moment().valueOf())
      setApproveResponse(null)
      setXcall(null)
      setXcallResponse(null)
    },
    [address, bridge, sdk],
  )

  // update balances
  useEffect(
    () => {
      let {
        source_chain,
        destination_chain,
      } = { ...bridge }

      const {
        id,
      } = { ...getChain(wallet_chain_id, chains_data) }

      if (asPath && id) {
        if (!(source_chain && destination_chain) && !equalsIgnoreCase(id, destination_chain)) {
          const params = paramsToObj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))

          if (!params?.source_chain && !asPath.includes('from-') && getChain(id, chains_data, true)) {
            source_chain = id
          }
        }
        else if (!asPath.includes('from-') && !equalsIgnoreCase(id, source_chain)) {
          source_chain = id
        }

        getBalances(id)
      }

      if (Object.keys(bridge).length > 0 || ['/'].includes(asPath)) {
        source_chain = source_chain || getChain(null, chains_data, true, false, true, destination_chain)?.id
        destination_chain =
          destination_chain && !equalsIgnoreCase(destination_chain, source_chain) ?
            destination_chain :
            bridge.source_chain && !equalsIgnoreCase(bridge.source_chain, source_chain) ?
              bridge.source_chain :
              getChain(null, chains_data, true, false, true, source_chain)?.id
      }

      setBridge(
        {
          ...bridge,
          source_chain,
          destination_chain,
        }
      )
    },
    [asPath, chains_data, wallet_chain_id],
  )

  // update balances
  useEffect(
    () => {
      dispatch(
        {
          type: BALANCES_DATA,
          value: null,
        }
      )

      if (address) {
        const {
          source_chain,
          destination_chain,
        } = { ...bridge }

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
        const {
          status,
        } = { ...approveResponse }

        if (address && !xcall && !calling && !['pending'].includes(status)) {
          const {
            source_chain,
            destination_chain,
          } = { ...bridge }

          getBalances(source_chain)
          getBalances(destination_chain)
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(),
          10 * 1000,
        )

      return () => clearInterval(interval)
    },
    [rpcs],
  )

  // trigger estimate fees
  useEffect(
    () => {
      const {
        source_chain,
        amount,
      } = { ...bridge }

      const {
        chain_id,
      } = { ...getChain(source_chain, chains_data) }

      if (false && chain_id && Object.keys({ ...balances_data }).length >= chains_data.length && balances_data[chain_id] && amount) {
        setEstimateFeesTrigger(moment().valueOf())
      }
    },
    [balances_data],
  )

  // estimate fees trigger
  useEffect(
    () => {
      const update = () => {
        if (estimateFeesTrigger && !(approving || approveResponse || calling || xcall || xcallResponse)) {
          estimateFees()
        }
      }

      update()

      const interval =
        setInterval(
          () => update(),
          60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [estimateFeesTrigger],
  )

  // update transfer status
  useEffect(
    () => {
      const update = async () => {
        if (sdk && address && xcall) {
          const {
            transfer_id,
            transactionHash,
          } = { ...xcall }

          if (!transfer_id && transactionHash) {
            let transfer_data

            try {
              const response = toArray(await sdk.sdkUtils.getTransfers({ transactionHash }))
              transfer_data = response.find(t => equalsIgnoreCase(t?.xcall_transaction_hash, transactionHash))
            } catch (error) {}

            if (!transfer_data && address) {
              try {
                const response = toArray(await sdk.sdkUtils.getTransfers({ userAddress: address }))
                transfer_data = response.find(t => equalsIgnoreCase(t?.xcall_transaction_hash, transactionHash))
              } catch (error) {}
            }

            const {
              status,
              error_status,
            } = { ...transfer_data }

            if (status || error_status) {
              if (transfer_data.transfer_id) {
                setXcall(
                  {
                    ...xcall,
                    transfer_id: transfer_data.transfer_id,
                  }
                )
              }

              setLatestTransfers(
                _.orderBy(
                  _.uniqBy(_.concat(transfer_data, latestTransfers), 'xcall_transaction_hash'),
                  ['xcall_timestamp'],
                  ['desc'],
                )
              )

              if ([XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status)) {
                reset('finish')
              }
            }
            else if (transfer_data?.transfer_id) {
              setXcall(
                {
                  ...xcall,
                  transfer_id: transfer_data.transfer_id,
                }
              )
            }
          }
          else if (transfer_id) {
            const response = toArray(await sdk.sdkUtils.getTransfers({ transferId: transfer_id }))
            const transfer_data = response.find(t => equalsIgnoreCase(t?.transfer_id, transfer_id))

            const {
              relayer_fee,
              slippage,
              status,
              error_status,
            } = { ...transfer_data }

            if (status || error_status) {
              let updated

              if (latest_transfer?.error_status === null) {
                switch (error_status) {
                  case XTransferErrorStatus.LowSlippage:
                    updated = slippage > latest_transfer?.slippage
                    break
                  case XTransferErrorStatus.LowRelayerFee:
                    updated = relayer_fee > latest_transfer?.relayer_fee
                    break
                  default:
                    updated = true
                    break
                }
              }
              else {
                updated = true
              }

              if (updated) {
                setLatestTransfers(
                  _.orderBy(
                    _.uniqBy(_.concat(transfer_data, latestTransfers), 'xcall_transaction_hash'),
                    ['xcall_timestamp'],
                    ['desc'],
                  )
                )
              }

              if ([XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status)) {
                reset('finish')
              }
            }
          }
        }
      }

      update()

      const interval =
        setInterval(
          () => update(),
          7.5 * 1000,
        )

      return () => clearInterval(interval)
    },
    [sdk, address, xcall],
  )

  // trigger render latest transfer
  useEffect(
    () => {
      setTimeTrigger(!timeTrigger)
    },
    [openTransferStatus],
  )

  // render latest transfer status
  useEffect(
    () => {
      const update = is_interval => {
        if ((openTransferStatus || (latest_transfer && !latest_transfer.execute_transaction_hash)) && (!timeTrigger || is_interval)) {
          setTimeTrigger(!timeTrigger)
        }
      }

      update()

      const interval =
        setInterval(
          () => update(true),
          1 * 1000,
        )

      return () => clearInterval(interval)
    },
    [timeTrigger],
  )

  // countdown receive next info
  useEffect(
    () => {
      if (displayReceiveNextInfo) {
        const interval =
          setInterval(
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

  const reset = async origin => {
    const reset_bridge = !['address', 'user_rejected'].includes(origin)

    if (reset_bridge) {
      setBridge(
        {
          ...bridge,
          amount: null,
        }
      )

      setXcall(null)
      setEstimatedValues(null)
      setEstimateResponse(null)
      setIsApproveNeeded(undefined)
    }

    if (!['finish'].includes(origin) && reset_bridge) {
      setOptions(DEFAULT_OPTIONS)
    }

    if (reset_bridge) {
      setRelayerFeeAssetType(_.head(RELAYER_FEE_ASSET_TYPES))
      setFees(null)
      setEstimateFeesTrigger(null)
    }

    setApproving(null)
    setApproveProcessing(null)
    setApproveResponse(null)

    setCalling(null)
    setCallProcessing(null)
    setXcallResponse(null)

    setBalanceTrigger(moment().valueOf())
    setTransfersTrigger(moment().valueOf())

    const {
      source_chain,
      destination_chain,
    } = { ...bridge }

    getBalances(source_chain)
    getBalances(destination_chain)
  }

  const getBalances = chain => {
    dispatch(
      {
        type: GET_BALANCES_DATA,
        value: { chain },
      }
    )
  }

  const checkSupport = () => {
    const {
      source_chain,
      destination_chain,
      asset,
    } = { ...bridge }

    const source_chain_data = getChain(source_chain, chains_data)
    const destination_chain_data = getChain(destination_chain, chains_data)

    const source_asset_data = getAsset(asset, assets_data)
    const destination_asset_data = getAsset(asset, assets_data)

    return (
      source_chain_data && destination_chain_data && source_asset_data && destination_asset_data &&
      getContract(destination_chain_data.chain_id, source_asset_data.contracts) &&
      getContract(source_chain_data.chain_id, destination_asset_data.contracts)
    )
  }

  const estimateFees = async () => {
    if (checkSupport() && !xcall && !xcallResponse) {
      const {
        source_chain,
        destination_chain,
        asset,
        amount,
      } = { ...bridge }

      const source_chain_data = getChain(source_chain, chains_data)
      const destination_chain_data = getChain(destination_chain, chains_data)

      const source_asset_data = getAsset(asset, assets_data)
      const destination_asset_data = getAsset(asset, assets_data)

      const source_contract_data = getContract(source_chain_data.chain_id, source_asset_data?.contracts)
      const destination_contract_data = getContract(destination_chain_data.chain_id, destination_asset_data?.contracts)

      if (source_contract_data && destination_contract_data) {
        if (sdk) {
          setFees(null)
          setApproveResponse(null)
          setCallProcessing(false)
          setCalling(false)
          setXcallResponse(null)

          try {
            const {
              forceSlow,
            } = { ...options }

            const {
              provider_params,
            } = { ...source_chain_data }

            const {
              nativeCurrency,
            } = { ..._.head(provider_params) }

            let {
              decimals,
            } = { ...nativeCurrency }

            decimals = decimals || 18

            const routerFee = forceSlow ? 0 : parseFloat((Number(amount) * ROUTER_FEE_PERCENT / 100).toFixed(source_contract_data.decimals))

            const params = {
              originDomain: source_chain_data?.domain_id,
              destinationDomain: destination_chain_data?.domain_id,
              isHighPriority: !forceSlow,
              priceIn: ['transacting'].includes(relayerFeeAssetType) ? 'usd' : 'native',
            }

            try {
              console.log(
                '[estimateRelayerFee]',
                params,
              )

              const response = await sdk.sdkBase.estimateRelayerFee(params)

              let relayerFee = response && utils.formatUnits(response, decimals)

              if (relayerFee && params.priceIn === 'usd') {
                const {
                  price,
                } = { ...source_asset_data }

                if (price) {
                  relayerFee = (Number(relayerFee) / price).toFixed(decimals)
                }
              }

              console.log(
                '[relayerFee]',
                {
                  params,
                  response,
                  relayerFee,
                },
              )

              setFees(
                {
                  routerFee,
                  relayerFee,
                }
              )
            } catch (error) {
              console.log(
                '[estimateRelayerFee error]',
                params,
                {
                  error,
                },
              )

              setFees({ routerFee })
            }
          } catch (error) {}
        }
      }
      else {
        setFees(null)
      }
    }
  }

  const calculateAmountReceived = async (
    _amount,
    receive_local,
  ) => {
    if (sdk) {
      const originDomain = source_chain_data?.domain_id
      const destinationDomain = destination_chain_data?.domain_id

      const originTokenAddress = (equalsIgnoreCase(source_contract_data?.contract_address, constants.AddressZero) ? _source_contract_data : source_contract_data)?.contract_address
      let destinationTokenAddress = _destination_contract_data?.contract_address

      const isNextAsset =
        typeof receive_local === 'boolean' ?
          receive_local :
          receiveLocal || equalsIgnoreCase(destination_contract_data?.contract_address, _destination_contract_data?.next_asset?.contract_address)

      if (isNextAsset) {
        destinationTokenAddress = _destination_contract_data?.next_asset?.contract_address || destinationTokenAddress
      }

      const amount = utils.parseUnits((_amount || 0).toString(), source_decimals).toBigInt()

      const checkFastLiquidity = true

      let manual

      try {
        setEstimatedValues(null)
        setEstimateResponse(null)

        if (amount > 0 && toArray(_.concat(source_chain_data?.id, destination_chain_data?.id)).findIndex(chain => toArray(pools_data).find(p => p?.chain_data?.id === chain && !p.tvl)) < 0) {
          console.log(
            '[calculateAmountReceived]',
            {
              originDomain,
              destinationDomain,
              originTokenAddress,
              destinationTokenAddress,
              amount,
              isNextAsset,
              checkFastLiquidity,
            },
          )

          const response = await sdk.sdkBase.calculateAmountReceived(originDomain, destinationDomain, originTokenAddress, amount.toString(), isNextAsset, checkFastLiquidity)

          console.log(
            '[amountReceived]',
            {
              originDomain,
              destinationDomain,
              originTokenAddress,
              destinationTokenAddress,
              amount,
              isNextAsset,
              checkFastLiquidity,
              ...response,
            },
          )

          const destination_contract_data = getContract(destination_chain_data?.chain_id, destination_asset_data?.contracts)

          setEstimatedValues(
            Object.fromEntries(
              Object.entries({ ...response })
                .map(([k, v]) => {
                  try {
                    v =
                      utils.formatUnits(
                        v,
                        ['amountReceived'].includes(k) ?
                          (isNextAsset && _destination_contract_data?.next_asset ?
                            _destination_contract_data?.next_asset?.decimals :
                            destination_contract_data?.decimals
                          ) || 18 :
                          source_decimals,
                      )
                  } catch (error) {}

                  return (
                    [
                      k,
                      v,
                    ]
                  )
                })
            )
          )
        }
        else {
          manual = true
        }
      } catch (error) {
        const response = parseError(error)

        console.log(
          '[calculateAmountReceived error]',
          {
            originDomain,
            destinationDomain,
            originTokenAddress,
            destinationTokenAddress,
            amount,
            isNextAsset,
            checkFastLiquidity,
            error,
          },
        )

        const {
          message,
        } = { ...response }

        if (includesStringList(message, ['reverted', 'invalid BigNumber value'])) {
          manual = true
        }
        else {
          setEstimateResponse(
            {
              status: 'failed',
              ...response,
            }
          )
        }
      }

      if (manual) {
        const routerFee = parseFloat((Number(_amount) * ROUTER_FEE_PERCENT / 100).toFixed(source_decimals))

        setEstimatedValues(
          {
            amountReceived: Number(_amount) - routerFee,
            routerFee,
            isNextAsset: typeof receive_local === 'boolean' ? receive_local : receiveLocal,
          }
        )
      }
    }
  }

  const checkApprovedNeeded = async _amount => {
    if (sdk) {
      let {
        symbol,
      } = { ...bridge }

      const {
        domain_id,
      } = { ...source_chain_data }

      const {
        contract_address,
      } = { ...source_contract_data }

      const amount = utils.parseUnits((_amount || 0).toString(), source_decimals).toBigInt()

      const decimals = source_contract_data?.decimals || 18
      const approve_amount = BigNumber.from(amount.toString()).add(BigNumber.from(relayerFeeAssetType === 'transacting' && fees && Number(relayer_fee) > 0 ? utils.parseUnits(Number(relayer_fee).toFixed(decimals), decimals).toString() : '0')).toString()

      try {
        setIsApproveNeeded(undefined)

        if (amount > 0) {
          console.log(
            '[approveIfNeeded]',
            {
              domain_id,
              contract_address,
              amount,
              approve_amount,
            },
          )

          const response = await sdk.sdkBase.approveIfNeeded(domain_id, contract_address, approve_amount)
          const _isApproveNeeded = !!response

          console.log(
            '[isApproveNeeded]',
            {
              domain_id,
              contract_address,
              amount,
              approve_amount,
              isApproveNeeded: _isApproveNeeded,
              response,
            },
          )

          setIsApproveNeeded(_isApproveNeeded)
        }
        else {
          setIsApproveNeeded(false)
        }
      } catch (error) {
        const response = parseError(error)

        console.log(
          '[approveIfNeeded error]',
          {
            domain_id,
            contract_address,
            amount,
            approve_amount,
            error,
            ...response,
          },
        )
      }
    }
  }

  const call = async (
    relayerFee = fees?.relayerFee,
  ) => {
    setApproving(null)
    setCalling(true)

    let success = false

    if (sdk) {
      const {
        source_chain,
        destination_chain,
        asset,
        amount,
        receive_wrap,
      } = { ...bridge }
      let {
        symbol,
      } = { ...bridge }

      const {
        to,
        infiniteApprove,
        callData,
        slippage,
        forceSlow,
        receiveLocal,
      } = { ...options }

      const source_chain_data = getChain(source_chain, chains_data)
      const source_asset_data = getAsset(asset, assets_data)

      let source_contract_data = getContract(source_chain_data?.chain_id, source_asset_data?.contracts)
      const _source_contract_data = _.cloneDeep(source_contract_data)
      if (symbol) {
        // next asset
        if (equalsIgnoreCase(source_contract_data?.next_asset?.symbol, symbol)) {
          source_contract_data = {
            ...source_contract_data,
            ...source_contract_data.next_asset,
          }
        }
        // native asset
        else if (source_contract_data?.wrapable && equalsIgnoreCase(source_asset_data?.symbol, symbol)) {
          source_contract_data = {
            ...source_contract_data,
            contract_address: constants.AddressZero,
            symbol: source_asset_data.symbol,
            image: source_asset_data.image,
          }
        }
      }

      symbol = source_contract_data?.symbol || source_asset_data?.symbol

      const destination_chain_data = getChain(destination_chain, chains_data)
      const destination_asset_data = getAsset(asset, assets_data)

      let destination_contract_data = getContract(destination_chain_data?.chain_id, destination_asset_data?.contracts)

      // next asset
      if ((receiveLocal || estimatedValues?.isNextAsset) && destination_contract_data?.next_asset) {
        destination_contract_data = {
          ...destination_contract_data,
          ...destination_contract_data.next_asset,
        }
      }

      const relayer_fee_field = `relayerFee${relayerFeeAssetType === 'transacting' ? 'InTransactingAsset' : ''}`
      const relayer_fee_decimals = relayerFeeAssetType === 'transacting' ? source_contract_data?.decimals || 18 : 18

      const xcallParams = {
        origin: source_chain_data?.domain_id,
        destination: destination_chain_data?.domain_id,
        asset: source_contract_data?.contract_address,
        to: to || address,
        delegate: to || address,
        amount: utils.parseUnits((amount || 0).toString(), source_contract_data?.decimals || 18).toString(),
        slippage: ((typeof slippage === 'number' ? slippage : DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE) * 100).toString(),
        receiveLocal: receiveLocal || false,
        callData: callData || '0x',
        [relayer_fee_field]: relayerFee && Number(relayerFee) > 0 ? utils.parseUnits(Number(relayerFee).toFixed(relayer_fee_decimals), relayer_fee_decimals).toString() : undefined,
      }

      console.log(
        '[xcall setup]',
        {
          relayerFeeAssetType,
          relayerFee,
          fees,
        },
        {
          xcallParams,
        },
      )

      let failed = false

      if (!xcallParams[relayer_fee_field] && process.env.NEXT_PUBLIC_NETWORK !== 'testnet') {
        setXcallResponse(
          {
            status: 'failed',
            message: 'Cannot estimate the relayer fee at the moment. Please try again later.',
            code: XTransferErrorStatus.LowRelayerFee,
          }
        )

        failed = true
      }

      if (!failed) {
        let approve_amount

        try {
          const decimals = source_contract_data?.decimals || 18;
          approve_amount = BigNumber.from(xcallParams.amount).add(BigNumber.from(relayerFeeAssetType === 'transacting' && fees && Number(relayer_fee) > 0 ? utils.parseUnits(Number(relayer_fee).toFixed(decimals), decimals).toString() : '0')).toString()

          console.log(
            '[approveIfNeeded before xcall]',
            {
              domain_id: xcallParams.origin,
              contract_address: xcallParams.asset,
              amount: xcallParams.amount,
              approve_amount,
              infiniteApprove,
            },
          )

          const approve_request = await sdk.sdkBase.approveIfNeeded(xcallParams.origin, xcallParams.asset, approve_amount, infiniteApprove)

          if (approve_request) {
            setApproving(true)

            const approve_response = await signer.sendTransaction(approve_request)

            const {
              hash,
            } = { ...approve_response }

            setApproveResponse(
              {
                status: 'pending',
                message: `Waiting for ${symbol} approval`,
                tx_hash: hash,
              }
            )

            setApproveProcessing(true)

            const approve_receipt = await signer.provider.waitForTransaction(hash)

            const {
              status,
            } = { ...approve_receipt }

            setApproveResponse(
              status ?
                null :
                {
                  status: 'failed',
                  message: `Failed to approve ${symbol}`,
                  tx_hash: hash,
                }
            )

            failed = !status

            setApproveProcessing(false)
            setApproving(false)
          }
          else {
            setApproving(false)
          }
        } catch (error) {
          failed = true

          const response = parseError(error)

          console.log(
            '[approveIfNeeded error before xcall]',
            {
              domain_id: xcallParams.origin,
              contract_address: xcallParams.asset,
              amount: xcallParams.amount,
              approve_amount,
              error,
              ...response,
            },
          )

          setApproveResponse(
            {
              status: 'failed',
              ...response,
            }
          )

          setApproveProcessing(false)
          setApproving(false)
        }
      }

      if (!failed) {
        const is_wrap_eth = (equalsIgnoreCase(source_contract_data?.contract_address, constants.AddressZero) || (source_contract_data?.wrapable && !source_contract_data.symbol?.startsWith(WRAPPED_PREFIX))) && ['ETH'].includes(source_asset_data?.symbol)

        try {
          if (is_wrap_eth) {
            xcallParams.asset = _source_contract_data?.contract_address
            xcallParams.wrapNativeOnOrigin = source_contract_data?.contract_address === constants.AddressZero
          }

          if (['ETH'].includes(source_asset_data?.symbol) && _.head(destination_chain_data?.provider_params)?.nativeCurrency?.symbol?.endsWith('ETH')) {
            xcallParams.unwrapNativeOnDestination = xcallParams.receiveLocal || receive_wrap ? false : true
          }

          console.log(
            '[xcall]',
            {
              xcallParams,
            },
          )

          const xcall_request = await sdk.sdkBase.xcall(xcallParams)

          if (xcall_request) {
            try {
              let gasLimit = await signer.estimateGas(xcall_request)

              if (gasLimit) {
                gasLimit =
                  FixedNumber.fromString(gasLimit.toString())
                    .mulUnsafe(
                      FixedNumber.fromString(GAS_LIMIT_ADJUSTMENT.toString())
                    )
                    .round(0)
                    .toString()
                    .replace('.0', '')

                xcall_request.gasLimit = gasLimit
              }
            } catch (error) {}

            const xcall_response = await signer.sendTransaction(xcall_request)

            const {
              hash,
            } = { ...xcall_response }

            setCallProcessing(true)

            const xcall_receipt = await signer.provider.waitForTransaction(hash)

            setXcall(xcall_receipt)

            const {
              transactionHash,
              status,
            } = { ...xcall_receipt }

            failed = !status

            setXcallResponse(
              {
                status: failed ? 'failed' : 'success',
                message: failed ? 'Failed to send transaction' : `Transferring ${symbol}. (It's ok to close the browser)`,
                tx_hash: hash,
              }
            )

            success = true

            if (!failed) {
              const destination_transacting_asset =
                receiveLocal || estimatedValues?.isNextAsset ?
                  destination_contract_data?.next_asset?.contract_address || destination_contract_data?.contract_address :
                  destination_contract_data?.contract_address

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
                        origin_transacting_amount: Number(utils.parseUnits((amount || 0).toString(), source_contract_data?.decimals || 18).toString()),
                        destination_chain: destination_chain_data?.chain_id,
                        destination_domain: xcallParams.destination,
                        destination_transacting_asset,
                        destination_transacting_amount:
                          estimatedValues?.amountReceived ?
                            utils.parseUnits(
                              estimatedValues.amountReceived.toString(),
                              (equalsIgnoreCase(destination_transacting_asset, destination_contract_data?.next_asset?.contract_address) && destination_contract_data?.next_asset ?
                                destination_contract_data.next_asset?.decimals :
                                destination_contract_data?.decimals
                              ) || 18,
                            )
                            .toString() :
                            undefined,
                        to: xcallParams.to,
                        force_slow: forceSlow,
                        receive_local: receiveLocal || estimatedValues?.isNextAsset,
                      },
                      latestTransfers,
                    ),
                    'xcall_transaction_hash',
                  ),
                  ['xcall_timestamp'],
                  ['desc'],
                )
              )

              setOpenTransferStatus(true)
            }
          }
        } catch (error) {
          const response = parseError(error)

          console.log(
            '[xcall error]',
            {
              xcallParams,
              error,
            },
          )

          let {
            message,
          } = { ...response }

          if (message?.includes('insufficient funds for gas')) {
            message = 'Insufficient gas for the destination gas fee.'
          }

          switch (response.code) {
            case 'user_rejected':
              reset(response.code)
              break
            default:
              setXcallResponse(
                {
                  status: 'failed',
                  ...response,
                }
              )
              break
          }

          failed = true
        }
      }

      if (failed) {
        setXcall(null)
      }
    }

    setCallProcessing(false)
    setCalling(false)

    if (sdk && address && success) {
      await sleep(1 * 1000)

      setBalanceTrigger(moment().valueOf())
      setTransfersTrigger(moment().valueOf())
    }
  }

  const {
    source_chain,
    destination_chain,
    asset,
    symbol,
    amount,
    receive_next,
    receive_wrap,
  } = { ...bridge }

  const {
    to,
    infiniteApprove,
    slippage,
    forceSlow,
    receiveLocal,
    showNextAssets,
  } = { ...options }

  const source_chain_data = getChain(source_chain, chains_data)
  const {
    color,
  } = { ...source_chain_data }
  const source_asset_data = getAsset(asset, assets_data)

  let source_contract_data = getContract(source_chain_data?.chain_id, source_asset_data?.contracts)
  const _source_contract_data = _.cloneDeep(source_contract_data)
  if (symbol) {
    // next asset
    if (equalsIgnoreCase(source_contract_data?.next_asset?.symbol, symbol)) {
      source_contract_data = {
        ...source_contract_data,
        ...source_contract_data.next_asset,
      }
    }
    // native asset
    else if (source_contract_data?.wrapable && equalsIgnoreCase(source_asset_data?.symbol, symbol)) {
      source_contract_data = {
        ...source_contract_data,
        contract_address: constants.AddressZero,
        symbol: source_asset_data.symbol,
        image: source_asset_data.image,
      }
    }
  }

  const destination_chain_data = getChain(destination_chain, chains_data)
  const destination_asset_data = getAsset(asset, assets_data)

  let destination_contract_data = getContract(destination_chain_data?.chain_id, destination_asset_data?.contracts)
  const _destination_contract_data = _.cloneDeep(destination_contract_data)

  let is_wrapable_asset = false
  // next asset
  if ((receiveLocal || estimatedValues?.isNextAsset) && destination_contract_data?.next_asset) {
    destination_contract_data = {
      ...destination_contract_data,
      ...destination_contract_data.next_asset,
    }
  }
  // native asset
  else if (destination_contract_data?.wrapable && (!symbol || equalsIgnoreCase(destination_asset_data?.symbol, symbol) || equalsIgnoreCase(destination_contract_data?.symbol, symbol))) {
    is_wrapable_asset = true

    if (!receive_wrap) {
      destination_contract_data = {
        ...destination_contract_data,
        contract_address: constants.AddressZero,
        symbol: destination_asset_data.symbol,
        image: destination_asset_data.image,
      }
    }
  }

  const source_decimals = source_contract_data?.decimals || 18
  const source_symbol = source_contract_data?.symbol || source_asset_data?.symbol
  const source_amount = getBalance(source_chain_data?.chain_id, source_contract_data?.contract_address, balances_data)?.amount

  const source_gas_native_token = _.head(source_chain_data?.provider_params)?.nativeCurrency
  const source_gas_amount = getBalance(source_chain_data?.chain_id, constants.AddressZero, balances_data)?.amount

  const destination_decimals = destination_contract_data?.decimals || 18
  const destination_symbol = destination_contract_data?.symbol || destination_asset_data?.symbol
  const destination_amount = getBalance(destination_chain_data?.chain_id, destination_contract_data?.contract_address, balances_data)?.amount

  const relayer_fee = fees && (fees.relayerFee || 0)
  const router_fee = estimatedValues?.routerFee ? estimatedValues.routerFee : fees && (forceSlow ? 0 : fees.routerFee || 0)
  const price_impact = null

  const routers_liquidity_amount =
    _.sum(
      toArray(router_asset_balances_data?.[destination_chain_data?.chain_id])
        .filter(a =>
          toArray(_.concat(destination_contract_data?.contract_address, destination_contract_data?.next_asset?.contract_address)).findIndex(_a => equalsIgnoreCase(a?.contract_address, _a)) > -1
        )
        .map(a =>
          Number(utils.formatUnits(BigInt(a?.amount || '0'), equalsIgnoreCase(a?.contract_address, destination_contract_data?.next_asset?.contract_address) && destination_contract_data?.next_asset ? destination_contract_data.next_asset?.decimals || 18 : destination_decimals))
        )
    )

  const pool_data = toArray(pools_data).find(p => p?.chain_data?.id === destination_chain && p.asset_data?.id === asset)
  const {
    adopted,
    local,
  } = { ...pool_data }
  const next_asset_data = adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local?.symbol?.startsWith(WRAPPED_PREFIX) ? local : local

  const pool_amounts = toArray(_.concat(adopted, local)).filter(a => ['string', 'number'].includes(typeof a.balance)).map(a => Number(a.balance))
  const pool_amount = receiveLocal || estimatedValues?.isNextAsset ? null : Number(next_asset_data?.balance) > -1 ? Number(next_asset_data.balance) : _.min(pool_amounts)
  const min_amount = 0
  const max_amount = source_amount && utils.formatUnits(utils.parseUnits(source_amount, source_decimals).toBigInt() - utils.parseUnits(relayer_fee && source_contract_data?.contract_address === constants.AddressZero ? relayer_fee : '0', source_decimals).toBigInt(), source_decimals)

  const estimated_received = estimatedValues?.amountReceived ? estimatedValues.amountReceived : Number(amount) > 0 && typeof router_fee === 'number' ? Number(amount) - router_fee : null
  const estimated_slippage = estimatedValues?.destinationSlippage && estimatedValues?.originSlippage ? (Number(estimatedValues.destinationSlippage) + Number(estimatedValues.originSlippage)) * 100 : null
  const recipient_address = to || address

  const latest_transfer = _.head(latestTransfers)
  const estimated_time_seconds = (latest_transfer?.routers && latest_transfer.routers.length < 1) || latest_transfer?.force_slow ? 5400 : 240
  const time_spent_seconds = moment().diff(moment(latest_transfer?.xcall_timestamp ? latest_transfer.xcall_timestamp * 1000 : undefined), 'seconds')
  const errored = latest_transfer?.error_status && !latest_transfer.execute_transaction_hash && [XTransferStatus.XCalled, XTransferStatus.Reconciled].includes(latest_transfer.status)
  const bumped = [XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.ExecutionError].includes(latest_transfer?.error_status) && toArray(latest_bumped_transfers_data).findIndex(t => equalsIgnoreCase(t.transfer_id, latest_transfer.transfer_id) && moment().diff(moment(t.updated), 'minutes', true) <= 5) > -1
  const has_latest_transfers = typeof latestTransfersSize === 'number' && latestTransfersSize > 0

  const disabled = calling || approving

  const wrong_chain = source_chain_data && wallet_chain_id !== source_chain_data.chain_id && !xcall

  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  const boxShadow = color && `${color}${theme === 'light' ? '44' : '33'} 0px 16px 128px 64px`

  return (
    <div className={`grid grid-cols-1 ${has_latest_transfers ? 'lg:grid-cols-8' : ''} items-start gap-4 my-4 sm:my-0 xl:my-4`}>
      <div className="hidden xl:block col-span-0 xl:col-span-2" />
      <div className={`col-span-1 ${has_latest_transfers ? 'lg:col-span-5' : ''} xl:col-span-4 3xl:mt-16`}>
        <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-6 my-4 sm:my-0 xl:my-6 mx-1 sm:mx-4 3xl:justify-start">
          <div className={`w-full ${openTransferStatus && latest_transfer ? 'max-w-xl 3xl:max-w-2xl' : 'max-w-md 3xl:max-w-xl'} space-y-3`}>
            {openTransferStatus && latest_transfer ?
              <div className="bg-slate-50 dark:bg-slate-900 rounded border dark:border-slate-700 space-y-4 pt-5 sm:pt-5 pb-6 sm:pb-6 px-4 sm:px-6">
                <div className="flex items-center justify-between space-x-2">
                  <span className="text-lg font-semibold">
                    Transfer status
                  </span>
                  <button
                    onClick={
                      () => {
                        setXcall(null)
                        setXcallResponse(null)
                        setOpenTransferStatus(false)
                      }
                    }
                  >
                    <MdClose
                      size={20}
                      className="-mr-1"
                    />
                  </button>
                </div>
                <div className="flex items-center justify-center">
                  <ActionRequired
                    forceDisabled={latest_transfer.execute_transaction_hash || !errored || [XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(latest_transfer?.error_status) || bumped}
                    transferData={latest_transfer}
                    buttonTitle={
                      <Image
                        src={
                          latest_transfer.execute_transaction_hash ?
                            '/images/transfer-statuses/Success-End.gif' :
                            errored ?
                              `/images/transfer-statuses/${
                                latest_transfer.error_status === XTransferErrorStatus.LowSlippage ?
                                  'Error-Slippage.gif' :
                                  latest_transfer.error_status === XTransferErrorStatus.LowRelayerFee ?
                                    'Error-Gas.gif' :
                                    'Error-Generic.gif'
                              }` :
                              '/images/transfer-statuses/Start.gif'
                        }
                        srcEnd={
                          latest_transfer.execute_transaction_hash ?
                            '/images/transfer-statuses/Success-End.jpeg' :
                            errored ?
                              `/images/transfer-statuses/${
                                latest_transfer.error_status === XTransferErrorStatus.LowSlippage ?
                                  'Error-Slippage.jpeg' :
                                  latest_transfer.error_status === XTransferErrorStatus.LowRelayerFee ?
                                    'Error-Gas.jpeg' :
                                    'Error-Generic.jpeg'
                              }` :
                              '/images/transfer-statuses/Processing.gif'
                        }
                        duration={2}
                        width={526}
                        height={295.875}
                      />
                    }
                    onTransferBumped={
                      relayer_fee_data => {
                        if (latestTransfers) {
                          const index = latestTransfers.findIndex(t => (t?.transfer_id && t.transfer_id === latest_transfer?.transfer_id) || (t?.xcall_transaction_hash && t.xcall_transaction_hash === latest_transfer?.transaction_hash))

                          if (index > -1) {
                            latestTransfers[index] = {
                              ...latestTransfers[index],
                              ...relayer_fee_data,
                              error_status: null,
                            }

                            setLatestTransfers(latestTransfers)
                          }
                        }
                      }
                    }
                    onSlippageUpdated={
                      slippage => {
                        if (latestTransfers) {
                          const index = latestTransfers.findIndex(t => (t?.transfer_id && t.transfer_id === latest_transfer?.transfer_id) || (t?.xcall_transaction_hash && t.xcall_transaction_hash === latest_transfer?.transaction_hash))

                          if (index > -1) {
                            latestTransfers[index] = {
                              ...latestTransfers[index],
                              slippage,
                              error_status: null,
                            }

                            setLatestTransfers(latestTransfers)
                          }
                        }
                      }
                    }
                  />
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-slate-500 dark:text-slate-500 text-xs sm:text-sm font-medium">
                    {latest_transfer.execute_transaction_hash ?
                      <div className="flex flex-col items-center space-y-1">
                        <a
                          href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.transaction_path?.replace('{tx}', latest_transfer.execute_transaction_hash)}`}
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
                            forceDisabled={[XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(latest_transfer.error_status) || bumped}
                            transferData={latest_transfer}
                            buttonTitle={
                              <span className="text-center">
                                {bumped ? 'Waiting for bump' : `Please click here to bump the ${latest_transfer?.error_status === XTransferErrorStatus.LowSlippage ? 'slippage' : 'gas amount'} higher.`}
                              </span>
                            }
                            onTransferBumped={
                              relayer_fee_data => {
                                if (latestTransfers) {
                                  const index = latestTransfers.findIndex(t => (t?.transfer_id && t.transfer_id === latest_transfer?.transfer_id) || (t?.xcall_transaction_hash && t.xcall_transaction_hash === latest_transfer?.transaction_hash))

                                  if (index > -1) {
                                    latestTransfers[index] = {
                                      ...latestTransfers[index],
                                      ...relayer_fee_data,
                                      error_status: null,
                                    }

                                    setLatestTransfers(latestTransfers)
                                  }
                                }
                              }
                            }
                            onSlippageUpdated={
                              slippage => {
                                if (latestTransfers) {
                                  const index = latestTransfers.findIndex(t => (t?.transfer_id && t.transfer_id === latest_transfer?.transfer_id) || (t?.xcall_transaction_hash && t.xcall_transaction_hash === latest_transfer?.transaction_hash))

                                  if (index > -1) {
                                    latestTransfers[index] = {
                                      ...latestTransfers[index],
                                      slippage,
                                      error_status: null,
                                    }

                                    setLatestTransfers(latestTransfers)
                                  }
                                }
                              }
                            }
                          />
                        </div> :
                        <div className="flex flex-col items-center space-y-1">
                          {time_spent_seconds > estimated_time_seconds ?
                            <span className="text-center">
                              Your assets are on the way! We will keep you informed.
                            </span> :
                            <div className="flex flex-wrap items-center justify-center space-x-1">
                              <span>
                                Your funds will arrive at the destination in about
                              </span>
                              <TimeSpent
                                fromTime={time_spent_seconds}
                                toTime={estimated_time_seconds}
                                noTooltip={true}
                                className="text-black dark:text-white font-semibold"
                              />.
                            </div>
                          }
                          <span className="text-center">
                            If you close this window, your transaction will still be processed.
                          </span>
                        </div>
                    }
                  </span>
                </div>
              </div> :
              <div className="space-y-3 3xl:space-y-4">
                {
                  bridge._receiveLocal && destination_contract_data && !destination_contract_data.next_asset &&
                  (
                    <AlertNotification
                      show={typeof displayReceiveNextInfo !== 'boolean' || displayReceiveNextInfo}
                      icon={
                        <IoInformationCircleOutline
                          size={26}
                          className="mb-0.5"
                        />
                      }
                      animate={{ mount: { y: 0 }, unmount: { y: 32 } }}
                      dismissible={{ onClose: () => setDisplayReceiveNextInfo(false) }}
                      className="alert-box flex"
                    >
                      <span className="text-sm">
                        Receive NextAsset setting turned off for {destination_chain_data?.name}.
                      </span>
                    </AlertNotification>
                  )
                }
                {
                  chains_data && assets_data &&
                  (
                    <div
                      className="bg-white dark:bg-slate-900 rounded border dark:border-slate-700 space-y-8 3xl:space-y-10 pt-5 sm:pt-6 3xl:pt-8 pb-6 sm:pb-7 3xl:pb-10 px-4 sm:px-6 3xl:px-8"
                      style={
                        checkSupport() && boxShadow ?
                          {
                            boxShadow,
                            WebkitBoxShadow: boxShadow,
                            MozBoxShadow: boxShadow,
                          } :
                          undefined
                      }
                    >
                      <div className="space-y-7 3xl:space-y-10">
                        <div className="flex items-center justify-between space-x-2">
                          <h1 className="text-xl 3xl:text-2xl font-semibold">
                            Bridge
                            {
                              receive_next &&
                              (
                                <span className="ml-1 3xl:ml-2">
                                  into nextAsset
                                </span>
                              )
                            }
                          </h1>
                          {
                            !['pool'].includes(source) &&
                            (
                              <Options
                                disabled={disabled}
                                applied={
                                  !_.isEqual(
                                    Object.fromEntries(
                                      Object.entries(options)
                                        .filter(([k, v]) =>
                                          !toArray(['slippage', 'forceSlow', 'showNextAssets', isApproveNeeded !== false && 'infiniteApprove']).includes(k)
                                        )
                                    ),
                                    Object.fromEntries(
                                      Object.entries(DEFAULT_OPTIONS)
                                        .filter(([k, v]) =>
                                          !toArray(['slippage', 'forceSlow', 'showNextAssets', isApproveNeeded !== false && 'infiniteApprove']).includes(k)
                                        )
                                    ),
                                  )
                                }
                                initialData={options}
                                onChange={
                                  o => {
                                    const {
                                      receiveLocal,
                                    } = { ...o }

                                    setOptions(o)

                                    if ((receiveLocal && !options?.receiveLocal) || (!receiveLocal && options?.receiveLocal)) {
                                      if (amount && !['0', '0.0'].includes(amount)) {
                                        calculateAmountReceived(amount, receiveLocal)
                                        checkApprovedNeeded(amount)
                                      }
                                      else {
                                        setEstimatedValues(
                                          {
                                            amountReceived: '0',
                                            routerFee: '0',
                                            isNextAsset: receiveLocal,
                                          }
                                        )
                                        setIsApproveNeeded(false)
                                      }

                                      if (query?.receive_next && !receiveLocal) {
                                        const params = { amount, receive_next: receiveLocal }

                                        router.push(
                                          `/${source_chain && destination_chain ? `${asset ? `${asset.toUpperCase()}-` : ''}from-${source_chain}-to-${destination_chain}` : ''}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`,
                                          undefined,
                                          {
                                            shallow: true,
                                          },
                                        )
                                      }
                                    }
                                  }
                                }
                                showInfiniteApproval={isApproveNeeded}
                                hasNextAsset={destination_contract_data?.next_asset}
                                chainData={destination_chain_data}
                              />
                            )
                          }
                        </div>
                        {chains_data && assets_data ?
                          <div className="grid grid-cols-5 sm:grid-cols-5 gap-3 sm:gap-6">
                            <div className="col-span-2 sm:col-span-2 flex flex-col items-center sm:items-start space-y-0.5 sm:space-y-2">
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

                                    setBridge(
                                      {
                                        ...bridge,
                                        source_chain: _source_chain,
                                        destination_chain: _destination_chain,
                                        symbol: equalsIgnoreCase(_source_chain, source_chain) ? symbol : undefined,
                                      }
                                    )

                                    getBalances(_source_chain)
                                    getBalances(_destination_chain)
                                  }
                                }
                                source={source_chain}
                                destination={destination_chain}
                                origin="from"
                                fixed={['pool'].includes(source)}
                              />
                            </div>
                            <div className="flex items-center justify-center mt-5.5 sm:mt-7">
                              <button
                                disabled={disabled}
                                onClick={
                                  () => {
                                    if (!disabled) {
                                      setBridge(
                                        {
                                          ...bridge,
                                          source_chain: destination_chain,
                                          destination_chain: source_chain,
                                          amount: null,
                                        }
                                      )
                                      setButtonDirection(buttonDirection * -1)

                                      getBalances(source_chain)
                                      getBalances(destination_chain)
                                    }
                                  }
                                }
                                className={`bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 ${disabled ? 'cursor-not-allowed' : ''} ${['pool'].includes(source) ? 'pointer-events-none dark:border-slate-800' : 'dark:border-slate-700'} rounded border flex items-center justify-center p-1 sm:p-1.5`}
                              >
                                <HiArrowRight
                                  size={18}
                                  className="3xl:w-6 3xl:h-6"
                                />
                              </button>
                            </div>
                            <div className="col-span-2 sm:col-span-2 flex flex-col items-center sm:items-end space-y-0.5 sm:space-y-2">
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

                                    setBridge(
                                      {
                                        ...bridge,
                                        source_chain: _source_chain,
                                        destination_chain: _destination_chain,
                                      }
                                    )

                                    getBalances(_source_chain)
                                    getBalances(_destination_chain)
                                  }
                                }
                                source={source_chain}
                                destination={destination_chain}
                                origin="to"
                                fixed={['pool'].includes(source)}
                              />
                            </div>
                          </div> :
                          <div className="h-64 sm:h-96 flex flex-col items-center justify-center space-y-3">
                            <TailSpin
                              width="36"
                              height="36"
                              color={loaderColor(theme)}
                            />
                            <span className="text-slate-400 dark:text-slate-500 text-base 3xl:text-xl">
                              Loading configuration
                            </span>
                          </div>
                        }
                      </div>
                      {
                        chains_data && assets_data &&
                        (
                          <>
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between space-x-2">
                                <div className="text-slate-600 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                  You send
                                </div>
                                {
                                  source_chain_data && asset &&
                                  (
                                    <div className="flex items-center justify-between space-x-2">
                                      <div className="flex items-center space-x-1">
                                        <div className="text-slate-400 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                          Balance:
                                        </div>
                                        <button
                                          disabled={disabled || (source_contract_data?.contract_address === constants.AddressZero ? !fees : false)}
                                          onClick={
                                            () => {
                                              if (utils.parseUnits(max_amount || '0', source_decimals).toBigInt() > 0) {
                                                setBridge(
                                                  {
                                                    ...bridge,
                                                    amount: max_amount,
                                                  }
                                                )

                                                if (['string', 'number'].includes(typeof max_amount)) {
                                                  if (max_amount && !['0', '0.0'].includes(max_amount)) {
                                                    calculateAmountReceived(max_amount)
                                                    checkApprovedNeeded(max_amount)
                                                  }
                                                  else {
                                                    setEstimatedValues(
                                                      {
                                                        amountReceived: '0',
                                                        routerFee: '0',
                                                        isNextAsset: receiveLocal,
                                                      }
                                                    )
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
                                            decimals={source_decimals}
                                            symbol={source_symbol}
                                            hideSymbol={false}
                                            trigger={balanceTrigger}
                                          />
                                        </button>
                                      </div>
                                    </div>
                                  )
                                }
                              </div>
                              <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-700 space-y-0.5 py-2.5 px-3">
                                <div className="flex items-center justify-between space-x-2">
                                  <SelectAsset
                                    disabled={disabled}
                                    value={asset}
                                    onSelect={
                                      (a, s) => {
                                        setBridge(
                                          {
                                            ...bridge,
                                            asset: a,
                                            symbol: s,
                                            amount:  a !== asset || !equalsIgnoreCase(s, symbol) ? null : amount,
                                          }
                                        )

                                        if (a !== asset) {
                                          getBalances(source_chain)
                                          getBalances(destination_chain)
                                        }
                                      }
                                    }
                                    chain={source_chain}
                                    isBridge={true}
                                    showNextAssets={showNextAssets}
                                    showNativeAssets={true}
                                    fixed={['pool'].includes(source)}
                                    data={
                                      {
                                        ...source_asset_data,
                                        ...source_contract_data,
                                      }
                                    }
                                    className="flex items-center space-x-1.5 sm:space-x-2 sm:-ml-1"
                                  />
                                  <div className="space-y-0">
                                    <DebounceInput
                                      debounceTimeout={750}
                                      size="small"
                                      type="number"
                                      placeholder="0.00"
                                      disabled={disabled || !asset}
                                      value={['string', 'number'].includes(typeof amount) && ![''].includes(amount) && !isNaN(amount) ? amount : ''}
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

                                            value = numberToFixed(value, source_decimals || 18)
                                          }

                                          setBridge(
                                            {
                                              ...bridge,
                                              amount: value,
                                            }
                                          )

                                          if (['string', 'number'].includes(typeof value)) {
                                            if (value && !['0', '0.0'].includes(value)) {
                                              calculateAmountReceived(value)
                                              checkApprovedNeeded(value)
                                            }
                                            else {
                                              setEstimatedValues(
                                                {
                                                  amountReceived: '0',
                                                  routerFee: '0',
                                                  isNextAsset: receiveLocal,
                                                }
                                              )
                                              setIsApproveNeeded(false)
                                            }
                                          }
                                        }
                                      }
                                      onWheel={e => e.target.blur()}
                                      onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                                      className={
                                        `w-36 sm:w-48 bg-transparent ${disabled ? 'cursor-not-allowed' : ''} rounded border-0 focus:ring-0 sm:text-lg 3xl:text-2xl font-semibold text-right ${
                                          amount && typeof source_asset_data?.price === 'number' && !source_asset_data.is_stablecoin ?
                                            'py-0' :
                                            'py-1.5'
                                        }`
                                      }
                                    />
                                    {
                                      relayerFeeAssetType === 'transacting' && fees && Number(relayer_fee) > 0 &&
                                      (
                                        <div className="text-slate-400 dark:text-slate-500 text-right">
                                          <span className="text-xs 3xl:text-xl font-medium mr-1.5">
                                            + Relayer fee
                                          </span>
                                          <DecimalsFormat
                                            value={Number(relayer_fee) <= 0 ? 0 : relayer_fee}
                                            className="text-xs 3xl:text-xl font-medium"
                                          />
                                        </div>
                                      )
                                    }
                                    {
                                      amount && typeof source_asset_data?.price === 'number' && !source_asset_data.is_stablecoin &&
                                      (
                                        <div className="text-slate-400 dark:text-slate-500 text-right">
                                          <DecimalsFormat
                                            value={(Number(amount) + (relayerFeeAssetType === 'transacting' && fees && Number(relayer_fee) > 0 ? Number(relayer_fee) : 0)) * source_asset_data.price}
                                            prefix={currency_symbol}
                                            className="text-xs 3xl:text-xl font-medium"
                                          />
                                        </div>
                                      )
                                    }
                                  </div>
                                </div>
                              </div>
                            </div>
                            {source_chain && destination_chain && asset && !checkSupport() ?
                              <div className="text-slate-400 dark:text-slate-200 3xl:text-2xl font-medium text-center">
                                Route not supported
                              </div> :
                              checkSupport() &&
                              (
                                <div className="space-y-6">
                                  <div className="space-y-2.5">
                                    <div className="flex items-center justify-between space-x-2">
                                      <div className="text-slate-600 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                        You receive
                                      </div>
                                      {
                                        destination_chain_data && asset &&
                                        (
                                          <div className="flex items-center justify-between space-x-2">
                                            <div className="flex items-center space-x-1">
                                              <div className="text-slate-400 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                                Balance:
                                              </div>
                                              <Balance
                                                chainId={destination_chain_data.chain_id}
                                                asset={asset}
                                                contractAddress={destination_contract_data?.contract_address}
                                                decimals={destination_decimals}
                                                symbol={destination_symbol}
                                                hideSymbol={false}
                                                trigger={balanceTrigger}
                                              />
                                            </div>
                                          </div>
                                        )
                                      }
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-800 space-y-0.5 py-4 px-3">
                                      <div className="flex items-center justify-between space-x-2">
                                        <SelectAsset
                                          disabled={disabled}
                                          value={asset}
                                          onSelect={
                                            (a, s) => {
                                              if (!(['pool'].includes(source) || !is_wrapable_asset)) {
                                                setBridge(
                                                  {
                                                    ...bridge,
                                                    asset: a,
                                                    receive_wrap: s?.startsWith('W'),
                                                  }
                                                )

                                                if (a !== asset) {
                                                  getBalances(source_chain)
                                                  getBalances(destination_chain)
                                                }
                                              }
                                            }
                                          }
                                          chain={destination_chain}
                                          isBridge={true}
                                          showNextAssets={!is_wrapable_asset}
                                          showNativeAssets={true}
                                          showOnlyWrapable={is_wrapable_asset}
                                          fixed={['pool'].includes(source) || !is_wrapable_asset}
                                          data={
                                            {
                                              ...destination_asset_data,
                                              ...destination_contract_data,
                                            }
                                          }
                                          className="flex items-center space-x-1.5 sm:space-x-2 sm:-ml-1"
                                        />
                                        {!['string', 'number'].includes(typeof amount) || [''].includes(amount) || ['string', 'number'].includes(typeof estimatedValues?.amountReceived) || estimateResponse ?
                                          <span className="text-lg font-semibold">
                                            {['string', 'number'].includes(typeof amount) && ['string', 'number'].includes(typeof estimated_received) && !estimateResponse ?
                                              <DecimalsFormat
                                                value={estimated_received}
                                                className={`w-36 sm:w-48 bg-transparent ${['', undefined].includes(estimated_received) ? 'text-slate-500 dark:text-slate-500' : ''} text-lg 3xl:text-2xl font-semibold text-right py-1.5`}
                                              /> :
                                              '-'
                                            }
                                          </span> :
                                          <Oval
                                            width="20"
                                            height="20"
                                            color={loaderColor(theme)}
                                          />
                                        }
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`space-y-2.5 ${['string', 'number'].includes(typeof estimated_received) || !collapse > 0 ? 'mt-2' : 'mt-0'}`}>
                                    {
                                      !collapse &&
                                      (
                                        <div className="space-y-2.5">
                                          {
                                            'to' in options && to &&
                                            (
                                              <div className="flex items-center justify-between space-x-2">
                                                <Tooltip
                                                  placement="top"
                                                  content="The destination address that you want to send asset to."
                                                  className="z-50 bg-dark text-white text-xs"
                                                >
                                                  <div className="flex items-center">
                                                    <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm font-medium">
                                                      Recipient address
                                                    </div>
                                                    <BiInfoCircle
                                                      size={14}
                                                      className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                    />
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
                                                              value = utils.getAddress(value)
                                                            } catch (error) {
                                                              value = address
                                                            }

                                                            setOptions(
                                                              {
                                                                ...options,
                                                                to: value,
                                                              }
                                                            )
                                                          }
                                                        }
                                                        className={`w-40 sm:w-56 bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 rounded border-0 focus:ring-0 text-sm 3xl:text-xl font-semibold text-right py-1.5 px-2`}
                                                      />
                                                      <button
                                                        onClick={() => setRecipientEditing(false)}
                                                        className="bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white"
                                                      >
                                                        <BiCheckCircle
                                                          size={16}
                                                          className="3xl:w-5 3xl:h-5"
                                                        />
                                                      </button>
                                                    </div> :
                                                    <div className="flex items-center space-x-1.5">
                                                      <Tooltip
                                                        placement="top"
                                                        content={to}
                                                        className="z-50 bg-dark text-white text-xs"
                                                      >
                                                        <span className="text-sm font-semibold">
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
                                                        <BiEditAlt
                                                          size={16}
                                                          className="3xl:w-5 3xl:h-5"
                                                        />
                                                      </button>
                                                    </div>
                                                  }
                                                </div>
                                              </div>
                                            )
                                          }
                                          {
                                            !['pool'].includes(source) &&
                                            (
                                              <div className="flex flex-col space-y-0.5">
                                                <div className="flex items-start justify-between space-x-2">
                                                  <Tooltip
                                                    placement="top"
                                                    content="The maximum percentage you are willing to lose due to market changes."
                                                    className="z-50 bg-dark text-white text-xs"
                                                  >
                                                    <div className="flex items-center">
                                                      <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                                        Slippage tolerance
                                                      </div>
                                                      <BiInfoCircle
                                                        size={14}
                                                        className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                      />
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
                                                            value={typeof slippage === 'number' && slippage >= 0 ? slippage : ''}
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

                                                                  if (!isNaN(value)) {
                                                                    value = Number(value)
                                                                  }
                                                                }

                                                                value = value && !isNaN(value) ? parseFloat(Number(value).toFixed(2)) : value
                                                                value = value <= 0 ? 0.01 : value > 100 ? DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE : value

                                                                setOptions(
                                                                  {
                                                                    ...options,
                                                                    slippage: value,
                                                                  }
                                                                )
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
                                                            <BiCheckCircle
                                                              size={16}
                                                              className="3xl:w-5 3xl:h-5"
                                                            />
                                                          </button>
                                                        </div>
                                                        <div className="flex items-center space-x-1.5 -mr-1.5">
                                                          {[3.0, 1.0, 0.5].map((s, i) => (
                                                            <div
                                                              key={i}
                                                              onClick={
                                                                () => {
                                                                  setOptions(
                                                                    {
                                                                      ...options,
                                                                      slippage: s,
                                                                    }
                                                                  )
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
                                                        <DecimalsFormat
                                                          value={slippage}
                                                          suffix="%"
                                                          className="text-sm 3xl:text-xl font-semibold"
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
                                                          <BiEditAlt
                                                            size={16}
                                                            className="3xl:w-5 3xl:h-5"
                                                          />
                                                        </button>
                                                      </div>
                                                    }
                                                  </div>
                                                </div>
                                                {
                                                  typeof slippage === 'number' && (estimated_slippage > slippage || slippage < 0.2 || slippage > 5.0) &&
                                                  (
                                                    <div className="flex items-start space-x-1">
                                                      <IoWarning
                                                        size={14}
                                                        className="min-w-max 3xl:w-5 3xl:h-5 text-yellow-500 dark:text-yellow-400 mt-0.5"
                                                      />
                                                      <div className="text-yellow-500 dark:text-yellow-400 text-xs 3xl:text-xl">
                                                        {estimated_slippage > slippage ?
                                                          <>
                                                            Slippage tolerance is too low
                                                            <br />
                                                            (use a larger amount or set tolerance higher)
                                                          </> :
                                                          slippage < 0.2 ?
                                                            'Your transfer may not complete due to low slippage tolerance.' :
                                                            'Your transfer may be frontrun due to high slippage tolerance.'
                                                        }
                                                      </div>
                                                    </div>
                                                  )
                                                }
                                              </div>
                                            )
                                          }
                                          {
                                            isApproveNeeded &&
                                            (
                                              <div className="flex flex-col space-y-0.5">
                                                <div className="flex items-center justify-between space-x-2">
                                                  <Tooltip
                                                    placement="top"
                                                    content="We need your approval to execute this transaction on your behalf."
                                                    className="z-50 bg-dark text-white text-xs"
                                                  >
                                                    <div className="flex items-center">
                                                      <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                                        Infinite approval
                                                      </div>
                                                      <BiInfoCircle
                                                        size={14}
                                                        className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                      />
                                                    </div>
                                                  </Tooltip>
                                                  <Tooltip
                                                    placement="top"
                                                    content={isApproveNeeded ? 'We need your approval to execute this transaction on your behalf.' : 'Approval sufficient. If you need to, please revoke using other tools.'}
                                                    className="z-50 bg-dark text-white text-xs"
                                                  >
                                                    <div className="w-fit flex items-center">
                                                      <Switch
                                                        disabled={disabled || !isApproveNeeded}
                                                        width={32}
                                                        height={16}
                                                        checked={typeof infiniteApprove === 'boolean' ? infiniteApprove : false}
                                                        onChange={
                                                          e => {
                                                            setOptions(
                                                              {
                                                                ...options,
                                                                infiniteApprove: !infiniteApprove,
                                                              }
                                                            )
                                                          }
                                                        }
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
                                                {
                                                  typeof slippage === 'number' && (estimated_slippage > slippage || slippage < 0.2 || slippage > 5.0) &&
                                                  (
                                                    <div className="flex items-start space-x-1">
                                                      <IoWarning
                                                        size={14}
                                                        className="min-w-max 3xl:w-5 3xl:h-5 text-yellow-500 dark:text-yellow-400 mt-0.5"
                                                      />
                                                      <div className="text-yellow-500 dark:text-yellow-400 text-xs 3xl:text-xl">
                                                        {estimated_slippage > slippage ?
                                                          <>
                                                            Slippage tolerance is too low
                                                            <br />
                                                            (use a larger amount or set tolerance higher)
                                                          </> :
                                                          slippage < 0.2 ?
                                                            'Your transfer may not complete due to low slippage tolerance.' :
                                                            'Your transfer may be frontrun due to high slippage tolerance.'
                                                        }
                                                      </div>
                                                    </div>
                                                  )
                                                }
                                              </div>
                                            )
                                          }
                                          <div className="flex items-center justify-between space-x-2">
                                            <Tooltip
                                              placement="top"
                                              content="This supports our router users providing fast liquidity."
                                              className="z-50 bg-dark text-white text-xs"
                                            >
                                              <div className="flex items-center">
                                                <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                                  Bridge fee
                                                </div>
                                                <BiInfoCircle
                                                  size={14}
                                                  className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                />
                                              </div>
                                            </Tooltip>
                                            {!['string', 'number'].includes(typeof amount) || [''].includes(amount) || ['string', 'number'].includes(typeof estimatedValues?.routerFee) || estimateResponse ?
                                              <span className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-semibold space-x-1.5">
                                                {['string', 'number'].includes(typeof amount) && ['string', 'number'].includes(typeof estimatedValues?.routerFee) && !estimateResponse ?
                                                  <DecimalsFormat
                                                    value={Number(router_fee) <= 0 ? 0 : router_fee}
                                                    className="text-sm 3xl:text-xl"
                                                  /> :
                                                  <span>
                                                    -
                                                  </span>
                                                }
                                                <span>
                                                  {source_symbol}
                                                </span>
                                              </span> :
                                              <Oval
                                                width="14"
                                                height="14"
                                                color={loaderColor(theme)}
                                              />
                                            }
                                          </div>
                                          <div className="flex items-center justify-between space-x-2">
                                            <Tooltip
                                              placement="top"
                                              content="This covers costs to execute your transfer on the destination chain."
                                              className="z-50 bg-dark text-white text-xs"
                                            >
                                              <div className="flex items-center">
                                                <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                                  Destination gas fee
                                                </div>
                                                <BiInfoCircle
                                                  size={14}
                                                  className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                />
                                              </div>
                                            </Tooltip>
                                            {fees ?
                                              <div className="flex items-center space-x-1.5">
                                                <span className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-semibold space-x-1.5">
                                                  <DecimalsFormat
                                                    value={Number(relayer_fee) <= 0 ? 0 : relayer_fee}
                                                    className="text-sm 3xl:text-xl"
                                                  />
                                                  {is_staging || true ?
                                                    <select
                                                      disabled={disabled}
                                                      value={relayerFeeAssetType}
                                                      onChange={
                                                        e => {
                                                          setRelayerFeeAssetType(e.target.value)
                                                          setEstimateFeesTrigger(moment().valueOf())
                                                          checkApprovedNeeded(amount)
                                                        }
                                                      }
                                                      className="bg-slate-100 dark:bg-slate-800 rounded border-0 focus:ring-0"
                                                    >
                                                      {RELAYER_FEE_ASSET_TYPES.map((t, i) => {
                                                        return (
                                                          <option
                                                            key={i}
                                                            title={`${t} asset`}
                                                            value={t}
                                                          >
                                                            {t === 'transacting' ? source_symbol : source_gas_native_token?.symbol}
                                                          </option>
                                                        )
                                                      })}
                                                    </select> :
                                                    <span>
                                                      {relayerFeeAssetType === 'transacting' ? source_symbol : source_gas_native_token?.symbol}
                                                    </span>
                                                  }
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
                                                  <MdRefresh
                                                    size={16}
                                                    className="3xl:w-5 3xl:h-5"
                                                  />
                                                </button>
                                              </div> :
                                              <Oval
                                                width="14"
                                                height="14"
                                                color={loaderColor(theme)}
                                              />
                                            }
                                          </div>
                                          {/*
                                            <WarningGasVsAmount
                                              amount={amount}
                                              assetPrice={source_asset_data?.price}
                                              gasFee={relayer_fee}
                                              gasSymbol={relayerFeeAssetType === 'transacting' ? source_symbol : source_gas_native_token?.symbol}
                                            />
                                          */}
                                          <div className="flex items-center justify-between space-x-2">
                                            <Tooltip
                                              placement="top"
                                              content={`Minimum amount received after slippage${typeof slippage === 'number' && slippage >= 0 ? ` ${slippage}%` : ''}`}
                                              className="z-50 bg-dark text-white text-xs"
                                            >
                                              <div className="flex items-center">
                                                <div className="sm:whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                                  Min amount received (with max slippage)
                                                </div>
                                                <BiInfoCircle
                                                  size={14}
                                                  className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                />
                                              </div>
                                            </Tooltip>
                                            {!['string', 'number'].includes(typeof amount) || [''].includes(amount) || ['string', 'number'].includes(typeof estimatedValues?.amountReceived) || estimateResponse ?
                                              <span className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-semibold space-x-1.5">
                                                {['string', 'number'].includes(typeof amount) && ['string', 'number'].includes(typeof estimated_received) && !estimateResponse ?
                                                  <DecimalsFormat
                                                    value={(estimated_received * ((100 - (typeof slippage === 'number' && slippage >= 0 ? slippage : DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE)) / 100)).toFixed(destination_decimals)}
                                                    className="text-sm 3xl:text-xl"
                                                  /> :
                                                  <span>
                                                    -
                                                  </span>
                                                }
                                                <span>
                                                  {destination_symbol}
                                                </span>
                                              </span> :
                                              <Oval
                                                width="14"
                                                height="14"
                                                color={loaderColor(theme)}
                                              />
                                            }
                                          </div>
                                          {
                                            typeof price_impact === 'number' &&
                                            (
                                              <div className="flex items-center justify-between space-x-2">
                                                <Tooltip
                                                  placement="top"
                                                  content="Price impact"
                                                  className="z-50 bg-dark text-white text-xs"
                                                >
                                                  <div className="flex items-center">
                                                    <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                                      Price impact
                                                    </div>
                                                    <BiInfoCircle
                                                      size={14}
                                                      className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                    />
                                                  </div>
                                                </Tooltip>
                                                <span className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-semibold space-x-1.5">
                                                  <DecimalsFormat
                                                    value={price_impact}
                                                    suffix="%"
                                                    className="text-sm 3xl:text-xl"
                                                  />
                                                </span>
                                              </div>
                                            )
                                          }
                                        </div>
                                      )
                                    }
                                    {
                                      Number(amount) > 0 && ['string', 'number'].includes(typeof estimated_received) && (Number(amount) < routers_liquidity_amount || router_asset_balances_data) &&
                                      (
                                        <div className="flex items-center justify-between space-x-1">
                                          <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                                            Estimated time
                                          </div>
                                          <Tooltip
                                            placement="top"
                                            content={
                                              Number(amount) > routers_liquidity_amount || forceSlow || estimatedValues?.isFastPath === false ?
                                                'Unable to leverage fast liquidity. Your transfer will still complete.' :
                                                'Fast transfer enabled by Connext router network.'
                                            }
                                            className="z-50 bg-dark text-white text-xs"
                                          >
                                            <div className="flex items-center">
                                              <span className="whitespace-nowrap text-sm 3xl:text-xl font-semibold space-x-1.5">
                                                {Number(amount) > routers_liquidity_amount || forceSlow || estimatedValues?.isFastPath === false ?
                                                  <span className="text-yellow-500 dark:text-yellow-400">
                                                    90 minutes
                                                  </span> :
                                                  <span className="text-green-500 dark:text-green-500">
                                                    4 minutes
                                                  </span>
                                                }
                                              </span>
                                              <BiInfoCircle
                                                size={14}
                                                className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                              />
                                            </div>
                                          </Tooltip>
                                        </div>
                                      )
                                    }
                                  </div>
                                </div>
                              )
                            }
                          </>
                        )
                      }
                      {browser_provider && checkSupport() && (xcall || source_amount) && (wrong_chain || (['string', 'number'].includes(typeof amount) && ![''].includes(amount))) ?
                        wrong_chain ?
                          <Wallet
                            connectChainId={source_chain_data?.chain_id}
                            className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base 3xl:text-2xl font-medium space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                          >
                            <span>
                              {is_walletconnect ? 'Reconnect' : 'Switch'} to
                            </span>
                            {
                              source_chain_data?.image &&
                              (
                                <Image
                                  src={source_chain_data.image}
                                  width={28}
                                  height={28}
                                  className="3xl:w-8 3xl:h-8 rounded-full"
                                />
                              )
                            }
                            <span className="font-medium">
                              {source_chain_data?.name}
                            </span>
                          </Wallet> :
                          !xcall && !xcallResponse && !calling && ['string', 'number'].includes(typeof amount) && ![''].includes(amount) &&
                          (
                            (utils.parseUnits(amount || '0', source_decimals).toBigInt() > utils.parseUnits(source_amount || '0', source_decimals).toBigInt() && ['string', 'number'].includes(typeof source_amount)) ||
                            Number(amount) < 0 || Number(amount) < min_amount ||
                            (typeof pool_amount === 'number' && Number(amount) > pool_amount) ||
                            (fees && (!relayer_fee || Number(relayer_fee) <= 0) && process.env.NEXT_PUBLIC_NETWORK !== 'testnet') ||
                            (fees && Number(relayer_fee) > 0 && relayerFeeAssetType === 'native' && source_gas_amount && utils.parseEther(source_gas_amount).toBigInt() < utils.parseEther(relayer_fee).toBigInt() + utils.parseEther(source_contract_data?.contract_address === constants.AddressZero ? amount : '0').toBigInt())
                          ) ?
                            <Alert
                              color="bg-red-400 dark:bg-red-500 text-white text-sm 3xl:text-xl font-medium"
                              icon={
                                <BiMessageError
                                  className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                />
                              }
                              closeDisabled={true}
                              rounded={true}
                              className="rounded p-4.5"
                            >
                              <span>
                                {utils.parseUnits(amount || '0', source_decimals).toBigInt() > utils.parseUnits(source_amount || '0', source_decimals).toBigInt() && ['string', 'number'].includes(typeof source_amount) ?
                                  'Insufficient Balance' :
                                  Number(amount) < min_amount ?
                                    'The amount cannot be less than the transfer fee.' :
                                    Number(amount) < 0 ?
                                      'The amount cannot be equal to or less than 0.' :
                                      typeof pool_amount === 'number' && Number(amount) > pool_amount ?
                                        `Exceed Pool Balances: ${pool_amount >= 1000 ? numberFormat(pool_amount, '0,0.00') : pool_amount}` :
                                        fees && (!relayer_fee || Number(relayer_fee) <= 0) ?
                                          'Cannot estimate the relayer fee at the moment. Please try again later.' :
                                          fees && Number(relayer_fee) > 0 && relayerFeeAssetType === 'native' && source_gas_amount && utils.parseEther(source_gas_amount).toBigInt() < utils.parseEther(relayer_fee).toBigInt() + utils.parseEther(source_contract_data?.contract_address === constants.AddressZero ? amount : '0').toBigInt() ?
                                            'Insufficient gas for the destination gas fee.' :
                                            ''
                                }
                              </span>
                            </Alert> :
                            !xcall && !xcallResponse && !estimateResponse ?
                              <button
                                disabled={disabled || ['', '0', '0.0'].includes(amount) || ((!relayer_fee || Number(relayer_fee) <= 0) && process.env.NEXT_PUBLIC_NETWORK !== 'testnet')}
                                onClick={
                                  () => {
                                    setRecipientEditing(false)
                                    setSlippageEditing(false)
                                    call(relayer_fee)
                                  }
                                }
                                className={
                                  `w-full ${
                                    disabled ?
                                      'bg-blue-400 dark:bg-blue-500' :
                                      ['', '0', '0.0'].includes(amount) || ((!relayer_fee || Number(relayer_fee) <= 0) && process.env.NEXT_PUBLIC_NETWORK !== 'testnet') ?
                                        'bg-slate-200 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' :
                                        'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                                  } rounded flex items-center ${
                                    calling && !approving && callProcessing ?
                                      'justify-center' :
                                      'justify-center'
                                  } text-white text-base 3xl:text-2xl py-3 sm:py-4 px-2 sm:px-3`
                                }
                              >
                                <span className={`flex items-center justify-center ${calling && !approving && callProcessing ? 'space-x-3 ml-1.5' : 'space-x-3'}`}>
                                  {
                                    disabled &&
                                    (
                                      <TailSpin
                                        width="20"
                                        height="20"
                                        color="white"
                                      />
                                    )
                                  }
                                  <span>
                                    {calling ?
                                      approving ?
                                        approveProcessing ?
                                          'Approving' :
                                          'Please Approve' :
                                        callProcessing ?
                                          'Transfer in progress ...' :
                                          typeof approving === 'boolean' ?
                                            'Please Confirm' :
                                            'Checking Approval' :
                                      'Send'
                                    }
                                  </span>
                                </span>
                              </button> :
                              (xcallResponse || (!xcall && approveResponse) || estimateResponse) &&
                              (toArray(xcallResponse || approveResponse || estimateResponse)
                                .map((r, i) => {
                                  const {
                                    status,
                                    message,
                                    code,
                                  } = { ...r }

                                  return (
                                    <Alert
                                      key={i}
                                      color={
                                        `${
                                          status === 'failed' ?
                                            'bg-red-400 dark:bg-red-500' :
                                            status === 'success' ?
                                              xcallResponse ?
                                                'bg-blue-500 dark:bg-blue-500' :
                                                'bg-green-400 dark:bg-green-500' :
                                              'bg-blue-400 dark:bg-blue-500'
                                        } text-white text-base`
                                      }
                                      icon={
                                        status === 'failed' ?
                                          <BiMessageError
                                            className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                          /> :
                                          status === 'success' ?
                                            xcallResponse ?
                                              <div className="mr-3">
                                                <TailSpin
                                                  width="20"
                                                  height="20"
                                                  color="white"
                                                />
                                              </div> :
                                              <BiMessageCheck
                                                className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                              /> :
                                            <BiMessageDetail
                                              className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                            />
                                      }
                                      closeDisabled={true}
                                      rounded={true}
                                      className="rounded p-4.5"
                                    >
                                      <div className="flex items-center justify-between space-x-2">
                                        <span className="break-all text-sm 3xl:text-xl font-medium">
                                          {ellipse(
                                            split(message, 'normal', ' ')
                                              .join(' ')
                                              .substring(0, status === 'failed' && errorPatterns.findIndex(c => message?.indexOf(c) > -1) > -1 ? message.indexOf(errorPatterns.find(c => message.indexOf(c) > -1)) : undefined) ||
                                            message,
                                            128,
                                          )}
                                        </span>
                                        <div className="flex items-center space-x-1">
                                          {
                                            status === 'failed' && message &&
                                            (
                                              <Copy
                                                value={message}
                                                className="cursor-pointer text-slate-200 hover:text-white"
                                              />
                                            )
                                          }
                                          {status === 'failed' ?
                                            <button
                                              onClick={() => reset(code)}
                                              className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                                            >
                                              <MdClose
                                                size={14}
                                              />
                                            </button> :
                                            status === 'success' ?
                                              <button
                                                onClick={() => reset()}
                                                className={`${xcallResponse ? 'bg-blue-600 dark:bg-blue-400' : 'bg-green-500 dark:bg-green-400'} rounded-full flex items-center justify-center text-white p-1`}
                                              >
                                                <MdClose
                                                  size={14}
                                                />
                                              </button> :
                                              null
                                          }
                                        </div>
                                      </div>
                                    </Alert>
                                  )
                                })
                              ) :
                        browser_provider ?
                          <button
                            disabled={true}
                            className="w-full bg-slate-100 dark:bg-slate-800 cursor-not-allowed rounded text-slate-400 dark:text-slate-500 text-base 3xl:text-2xl text-center py-3 sm:py-4 px-2 sm:px-3"
                          >
                            Send
                          </button> :
                          <Wallet
                            connectChainId={source_chain_data?.chain_id}
                            buttonConnectTitle="Connect Wallet"
                            className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base 3xl:text-2xl font-medium text-center sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                          >
                            <span>
                              Connect Wallet
                            </span>
                          </Wallet>
                      }
                    </div>
                  )
                }
              </div>
            }
          </div>
          {
            !openTransferStatus && _source_contract_data?.mintable &&
            (
              <Faucet
                tokenId={asset}
                contractData={_source_contract_data}
              />
            )
          }
        </div>
      </div>
      <div className={`col-span-1 ${has_latest_transfers ? 'lg:col-span-3' : ''} xl:col-span-2 3xl:mt-8`}>
        <LatestTransfers
          data={latestTransfers}
          trigger={transfersTrigger}
          onUpdateSize={size => setLatestTransfersSize(size)}
        />
      </div>
    </div>
  )
}
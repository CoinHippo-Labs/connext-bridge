import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { getDeployedTransactionManagerContract } from '@connext/nxtp-sdk'
import { getRandomBytes32 } from '@connext/nxtp-utils'
import { constants } from 'ethers'
import BigNumber from 'bignumber.js'
import { Img } from 'react-image'
import Loader from 'react-loader-spinner'
import { MdSwapVerticalCircle, MdSwapHorizontalCircle } from 'react-icons/md'
import { IoWallet } from 'react-icons/io5'
import { IoMdInformationCircle } from 'react-icons/io'
import { BiMessageError, BiMessageCheck, BiMessageDetail } from 'react-icons/bi'
import { FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa'
import { TiArrowRight, TiWarning } from 'react-icons/ti'

import Network from './network'
import Asset from './asset'
import AdvancedOptions from './advanced-options'
import Wallet from '../wallet'
import Popover from '../popover'
import Alert from '../alerts'
import Notification from '../notifications'

import { balances as getBalances } from '../../lib/api/covalent'
import { getApproved, approve } from '../../lib/object/contract'
import { smallNumber, numberFormat } from '../../lib/utils'

import { CHAINS_STATUS_DATA, CHAINS_STATUS_SYNC_DATA, BALANCES_DATA } from '../../reducers/types'

const refresh_estimated_fees_second = Number(process.env.NEXT_PUBLIC_REFRESH_ESTIMATED_FEES_SECOND)
const expiry_hours = Number(process.env.NEXT_PUBLIC_EXPIRY_HOURS)
const bid_expires_second = Number(process.env.NEXT_PUBLIC_BID_EXPIRES_SECOND)

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function CrosschainBridge() {
  const dispatch = useDispatch()
  const { chains, assets, chains_status, balances, wallet, sdk, preferences } = useSelector(state => ({ chains: state.chains, assets: state.assets, chains_status: state.chains_status, balances: state.balances, wallet: state.wallet, sdk: state.sdk, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { chains_status_data } = { ...chains_status }
  const { balances_data } = { ...balances }
  const { wallet_data } = { ...wallet }
  const { web3_provider, signer, chain_id, address } = { ...wallet_data }
  const { sdk_data } = { ...sdk }
  const { theme } = { ...preferences }

  const [fromChainId, setFromChainId] = useState(null)
  const [toChainId, setToChainId] = useState(null)
  const [assetId, setAssetId] = useState(null)
  const [amount, setAmount] = useState(null)
  const [estimatedAmount, setEstimatedAmount] = useState(null)
  const [estimatingAmount, setEstimatingAmount] = useState(null)
  const [estimatedAmountResponse, setEstimatedAmountResponse] = useState(null)
  const [tokenApproved, setTokenApproved] = useState(null)
  const [tokenApprovingTx, setTokenApprovingTx] = useState(null)
  const [tokenApproveResponse, setTokenApproveResponse] = useState(null)
  const [advancedOptions, setAdvancedOptions] = useState({
    infinite_approval: true,
    receiving_address: null,
    contract_address: null,
    call_data: null,
    preferred_router: null,
  })

  const [gasFee, setGasFee] = useState(null)
  const [relayerFee, setRelayerFee] = useState(null)
  const [routerFee, setRouterFee] = useState(null)
  const [gasFeeEstimating, setGasFeeEstimating] = useState(null)
  const [relayerFeeEstimating, setRelayerFeeEstimating] = useState(null)
  const [routerFeeEstimating, setRouterFeeEstimating] = useState(null)
  const [refreshEstimatedFeesSecond, setRefreshEstimatedFeesSecond] = useState(refresh_estimated_fees_second)
  // const [bidExpiresSecond, setBidExpiresSecond] = useState(bid_expires_second)

  useEffect(() => {
    if (chain_id && !fromChainId && toChainId !== chain_id) {
      setFromChainId(chain_id)
    }
  }, [chain_id])

  useEffect(() => {
    if (address) {
      dispatch({
        type: BALANCES_DATA,
        value: null,
      })

      if (assetId) {
        if (fromChainId) {
          getChainBalances(fromChainId)
        }
        if (toChainId) {
          getChainBalances(toChainId)
        }
      }
    }
    else {
      dispatch({
        type: BALANCES_DATA,
        value: null,
      })
    }
  }, [address])

  useEffect(() => {
    const interval = setInterval(() => {
      if (refreshEstimatedFeesSecond - 1 > -1) {
        setRefreshEstimatedFeesSecond(refreshEstimatedFeesSecond - 1)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [refreshEstimatedFeesSecond])

  useEffect(() => {
    if (refreshEstimatedFeesSecond === 0) {
      estimateFees()
    }
  }, [refreshEstimatedFeesSecond])

  useEffect(() => {
    if (typeof gasFeeEstimating === 'boolean' && !gasFeeEstimating &&
      typeof relayerFeeEstimating === 'boolean' && !relayerFeeEstimating &&
      typeof routerFeeEstimating === 'boolean' && !routerFeeEstimating
    ) {
      setRefreshEstimatedFeesSecond(refresh_estimated_fees_second)
    }
  }, [gasFeeEstimating, relayerFeeEstimating, routerFeeEstimating])

  useEffect(() => {
    setGasFee(null)
    setRelayerFee(null)
    setRouterFee(null)

    estimateFees()
  }, [fromChainId, toChainId, assetId])

  useEffect(() => {
    const getData = async () => {
      const _approved = await isTokenApproved()

      if (_approved !== tokenApproved) {
        setTokenApproved(_approved)
      }
    }

    getData()
  }, [address, chain_id, fromChainId, assetId, amount])

  useEffect(() => {
    setTokenApprovingTx(null)
    setTokenApproveResponse(null)
  }, [address, fromChainId, assetId])

  useEffect(() => {
    if (tokenApproved) {
      if (address && chain_id && chain_id === fromChainId && toChainId && assetId && typeof amount === 'number') {
        findingRoutes()
      }
      else {
        setEstimatingAmount(true)
        setEstimatedAmount(null)
        setEstimatingAmount(false)
      }
    }
    else {
      setEstimatingAmount(true)
      setEstimatedAmount(null)
      setEstimatingAmount(false)
    }
  }, [address, chain_id, fromChainId, toChainId, assetId, amount, tokenApproved, advancedOptions])

  useEffect(() => {
    estimateFees()
  }, [estimatedAmount])

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (bidExpiresSecond - 1 > -1) {
  //       setBidExpiresSecond(bidExpiresSecond - 1)
  //     }
  //   }, 1000)
  //   return () => clearInterval(interval)
  // }, [bidExpiresSecond])

  // useEffect(() => {
  //   if (bidExpiresSecond === 0) {
  //     findingRoutes()
  //   }
  // }, [bidExpiresSecond])

  const isSupport = () => {
    const asset = assets_data?.find(_asset => _asset?.id === assetId)

    const support = asset && !((fromChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(fromChainId)) ||
    (toChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(toChainId)))

    return support
  }

  const getChainSynced = _chain_id => !chains_status_data || chains_status_data.find(_chain => _chain.chain_id === _chain_id)?.synced

  const isTokenApproved = async isAfterApprove => {
    let approved = tokenApproved

    if (address && chain_id && chain_id === fromChainId && assetId && (isAfterApprove || !tokenApprovingTx)) {
      const fromChainSynced = getChainSynced(fromChainId)
      const toChainSynced = getChainSynced(toChainId)

      const fromBalance = getChainBalance(fromChainId)
      const fromBalanceAmount = (fromBalance?.balance || 0) / Math.pow(10, fromBalance?.contract_decimals || 0)

      const feesEstimated = (typeof gasFee === 'number' || typeof gasFee === 'boolean') && (typeof relayerFee === 'number' || typeof relayerFee === 'boolean') && (typeof routerFee === 'number' || typeof routerFee === 'boolean')
      const estimatedFees = feesEstimated && ((gasFee || 0) + (relayerFee || 0) + (routerFee || 0))

      if (isSupport() && amount >= estimatedFees && fromBalanceAmount >= amount && fromChainSynced && toChainSynced) {
        const asset = assets_data?.find(_asset => _asset?.id === assetId)
        const contract = asset.contracts?.find(_contract => _contract?.chain_id === fromChainId)

        if (contract?.contract_address) {
          if (contract.contract_address !== constants.AddressZero) {
            approved = await getApproved(signer, contract.contract_address, getDeployedTransactionManagerContract(fromChainId)?.address)
            approved = approved.gte(BigNumber(amount).shiftedBy(contract?.contract_decimals))
          }
          else {
            approved = true
          }
        }
      }
    }

    return approved || true
  }

  const approveToken = async () => {
    const asset = assets_data?.find(_asset => _asset?.id === assetId)
    const contract = asset.contracts?.find(_contract => _contract?.chain_id === fromChainId)

    setTokenApproveResponse(null)

    try {
      const tx_approve = await approve(signer, contract?.contract_address, getDeployedTransactionManagerContract(fromChainId)?.address, BigNumber(amount).shiftedBy(contract?.contract_decimals).toString())

      const tx_hash = tx_approve?.hash

      setTokenApprovingTx(tx_hash)
      setTokenApproveResponse({ status: 'pending', message: `Wait for ${asset?.symbol} Approval Confirmation` })

      await tx_approve.wait()

      const _approved = await isTokenApproved(true)

      if (_approved !== tokenApproved) {
        setTokenApproved(_approved)
      }

      setTokenApproveResponse({ status: 'success', message: `${asset?.symbol} Approval Transaction Confirmed.`, tx_hash })
    } catch (error) {
      setTokenApproveResponse({ status: 'failed', message: error?.message })
    }

    setTokenApprovingTx(null)
  }

  const getChainBalances = async _chain_id => {
    if (_chain_id && address) {
      const response = await getBalances(_chain_id, address)

      if (response?.data?.items) {
        dispatch({
          type: BALANCES_DATA,
          value: { [`${_chain_id}`]: response.data.items },
        })
      }
      else if (!(balances_data?.[_chain_id]?.length > 0)) {
        dispatch({
          type: BALANCES_DATA,
          value: { [`${_chain_id}`]: [] },
        })
      }
    }
  }

  const getChainBalance = _chain_id => {
    const chain = chains_data?.find(_chain => _chain?.chain_id === _chain_id)
    const asset = assets_data?.find(_asset => _asset?.id === assetId)

    let balance = balances_data?.[_chain_id]?.find(_contract => _contract?.contract_address === asset?.contracts?.find(__contract => __contract?.chain_id === _chain_id)?.contract_address)
    balance = balance || balances_data?.[_chain_id]?.find(_contract => asset?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase() && chain?.provider_params?.[0]?.nativeCurrency?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase())

    return balance
  }

  const estimateFees = () => {
    if (fromChainId && toChainId && assetId) {
      estimateGasFee()
      estimateRelayerFee()
      estimateRouterFee()
    }
    else {
      setGasFee(null)
      setRelayerFee(null)
      setRouterFee(null)
    }
  }

  const estimateGasFee = async () => {
    if (sdk_data) {
      const asset = fromChainId && toChainId && assetId && assets_data?.find(_asset => _asset?.id === assetId && _asset.contracts?.findIndex(_contract => _contract?.chain_id === fromChainId) > -1 && _asset.contracts?.findIndex(_contract => _contract?.chain_id === toChainId) > -1)

      if (isSupport()) {
        setGasFeeEstimating(true)

        const fromContract = asset.contracts?.find(_contract => _contract?.chain_id === fromChainId)
        const toContract = asset.contracts?.find(_contract => _contract?.chain_id === toChainId)

        if (estimatedAmount?.gasFeeInReceivingToken) {
          setGasFee(BigNumber(estimatedAmount.gasFeeInReceivingToken).shiftedBy(-toContract?.contract_decimals).toNumber())
        }
        else {
          const response = await sdk_data.estimateFeeForRouterTransferInReceivingToken(
            fromChainId,
            fromContract?.contract_address,
            toChainId,
            toContract?.contract_address,
          )

          setGasFee(response ? BigNumber(response.toString()).shiftedBy(-toContract?.contract_decimals).toNumber() : false)
        }

        setGasFeeEstimating(false)
      }
      else {
        setGasFee(null)
      }
    }
  }

  const estimateRelayerFee = async () => {
    if (sdk_data) {
      const asset = fromChainId && toChainId && assetId && assets_data?.find(_asset => _asset?.id === assetId && _asset.contracts?.findIndex(_contract => _contract?.chain_id === fromChainId) > -1 && _asset.contracts?.findIndex(_contract => _contract?.chain_id === toChainId) > -1)

      if (isSupport()) {
        setRelayerFeeEstimating(true)

        const fromContract = asset.contracts?.find(_contract => _contract?.chain_id === fromChainId)
        const toContract = asset.contracts?.find(_contract => _contract?.chain_id === toChainId)

        if (estimatedAmount) {
          setRelayerFee(BigNumber(estimatedAmount.metaTxRelayerFee || '0').shiftedBy(-toContract?.contract_decimals).toNumber())
        }
        else {
          const response = await sdk_data.estimateMetaTxFeeInReceivingToken(
            fromChainId,
            fromContract?.contract_address,
            toChainId,
            toContract?.contract_address,
          )

          setRelayerFee(response ? BigNumber(response.toString()).shiftedBy(-toContract?.contract_decimals).toNumber() : false)
        }

        setRelayerFeeEstimating(false)
      }
      else {
        setRelayerFee(null)
      }
    }
  }

  const estimateRouterFee = async () => {
    if (sdk_data) {
      if (isSupport()) {
        setRouterFeeEstimating(true)

        if (estimatedAmount?.bid?.amountReceived) {
          const asset = fromChainId && toChainId && assetId && assets_data?.find(_asset => _asset?.id === assetId && _asset.contracts?.findIndex(_contract => _contract?.chain_id === fromChainId) > -1 && _asset.contracts?.findIndex(_contract => _contract?.chain_id === toChainId) > -1)
          const toContract = asset.contracts?.find(_contract => _contract?.chain_id === toChainId)

          setRouterFee(amount - BigNumber(estimatedAmount.bid.amountReceived).shiftedBy(-toContract?.contract_decimals).toNumber())
        }
        else {
          setRouterFee(false)
        }

        setRouterFeeEstimating(false)
      }
      else {
        setRouterFee(null)
      }
    }
  }

  const findingRoutes = async () => {
    setTokenApprovingTx(null)
    setTokenApproveResponse(null)
    setEstimatedAmountResponse(null)
    setEstimatingAmount(true)

    if (sdk_data) {
      const asset = fromChainId && toChainId && assetId && assets_data?.find(_asset => _asset?.id === assetId && _asset.contracts?.findIndex(_contract => _contract?.chain_id === fromChainId) > -1 && _asset.contracts?.findIndex(_contract => _contract?.chain_id === toChainId) > -1)

      if (isSupport()) {
        setGasFeeEstimating(true)

        const fromContract = asset.contracts?.find(_contract => _contract?.chain_id === fromChainId)
        const toContract = asset.contracts?.find(_contract => _contract?.chain_id === toChainId)

        try {
          const response = await sdk_data.getTransferQuote({
            sendingChainId: fromChainId,
            sendingAssetId: fromContract?.contract_address,
            receivingChainId: toChainId,
            receivingAssetId: toContract?.contract_address,
            receivingAddress: advancedOptions?.receiving_address || address,
            amount: BigNumber(amount).shiftedBy(fromContract?.contract_decimals).toString(),
            transactionId: getRandomBytes32(),
            expiry: moment().add(expiry_hours, 'hours').unix(),
            callTo: advancedOptions?.contract_address || undefined,
            callData: advancedOptions?.call_data || undefined,
            initiator: undefined,
            preferredRouters: advancedOptions?.preferredRouters?.split(',') || undefined,
            dryRun: false,
          })

          setEstimatedAmount(response)
          // setBidExpiresSecond(bid_expires_second)
        } catch (error) {
          if (error?.message?.includes('Error validating or retrieving bids')) {
            findingRoutes()
          }
          else {
            setEstimatedAmount(null)
            setEstimatedAmountResponse({ status: 'failed', message: error?.message })
          }
        }
      }
    }

    setEstimatingAmount(false)
  }

  const fromChain = chains_data?.find(_chain => _chain?.chain_id === fromChainId)
  const toChain = chains_data?.find(_chain => _chain?.chain_id === toChainId)

  const fromChainSynced = getChainSynced(fromChainId)
  const toChainSynced = getChainSynced(toChainId)
  const unsyncedChains = [!fromChainSynced && fromChain, !toChainSynced && toChain].filter(_chain => _chain)

  const asset = assets_data?.find(_asset => _asset?.id === assetId)
  const toContract = asset?.contracts?.find(_contract => _contract?.chain_id === toChainId)

  const fromBalance = getChainBalance(fromChainId)
  const fromBalanceAmount = (fromBalance?.balance || 0) / Math.pow(10, fromBalance?.contract_decimals || 0)
  const toBalance = getChainBalance(toChainId)

  const feesEstimated = (typeof gasFee === 'number' || typeof gasFee === 'boolean') && (typeof relayerFee === 'number' || typeof relayerFee === 'boolean') && (typeof routerFee === 'number' || typeof routerFee === 'boolean')
  const estimatedFees = feesEstimated && ((gasFee || 0) + (relayerFee || 0) + (routerFee || 0))

  const mustChangeChain = fromChainId && chain_id !== fromChainId
  const mustApproveToken = !tokenApproved

  const actionDisabled = tokenApprovingTx

  return (
    <div className="flex flex-col items-center justify-center space-y-2 sm:space-y-3 mt-4 sm:mt-12">
      <div className="w-full max-w-md flex items-center justify-center sm:justify-between space-x-2">
        <div className="flex items-center space-x-2">
          <Img
            src="/logos/connext/logo.png"
            alt=""
            className="w-7 sm:w-8 h-7 sm:h-8 rounded-full"
          />
          <h1 className="uppercase text-base sm:text-lg font-semibold">Cross-Chain Swap</h1>
        </div>
        <div className="flex items-center space-x-2">
          {toChain && (
            <a
              href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/${toChain.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 cursor-pointer rounded-lg capitalize flex items-center text-gray-700 dark:text-gray-300 text-xs font-semibold py-1.5 px-2.5"
            >
              <span>Liquidity</span>
              <TiArrowRight size={16} className="transform -rotate-45 -mr-1" />
            </a>
          )}
          <AdvancedOptions
            initialOptions={advancedOptions}
            updateOptions={_options => setAdvancedOptions(_options)}
          />
        </div>
      </div>
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-lg space-y-12 sm:space-y-4 py-6 px-6 sm:px-7">
        <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-6">
          <div className="sm:col-span-2 flex flex-col items-center space-y-0">
            <span className="text-gray-400 dark:text-gray-500 text-lg font-medium">From Chain</span>
            <Network
              disabled={actionDisabled}
              chain_id={fromChainId}
              onSelect={_chain_id => {
                if (_chain_id === toChainId) {
                  setToChainId(fromChainId)
                }
                else if (assetId) {
                  getChainBalances(_chain_id)
                }

                setFromChainId(_chain_id)
              }}
            />
            {!address ?
              null
              :
              fromBalance ?
                <div className="flex items-center text-gray-400 dark:text-gray-600 text-2xs space-x-1 pt-1">
                  <IoWallet size={12} />
                  <span className="font-mono">{numberFormat((fromBalance.balance || 0) / Math.pow(10, fromBalance.contract_decimals), '0,0.00000000')}</span>
                  <span className="font-semibold">{fromBalance.contract_ticker_symbol}</span>
                </div>
                :
                !address || !asset || !fromChainId ?
                  null
                  :
                  balances_data?.[fromChainId] ?
                    toBalance ?
                      <div className="text-gray-400 dark:text-gray-600 text-2xs pt-1">-</div>
                      :
                      null
                    :
                    <Loader type="ThreeDots" color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="16" height="16" />
            }
          </div>
          <div className="flex items-center justify-center">
            <button
              disabled={actionDisabled}
              onClick={() => {
                setFromChainId(toChainId)
                setToChainId(fromChainId)
              }}
              className={`${actionDisabled ? 'cursor-not-allowed' : ''}`}
            >
              <MdSwapVerticalCircle size={36} className="sm:hidden rounded-full shadow-lg text-indigo-400 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-white" />
              <MdSwapHorizontalCircle size={36} className="hidden sm:block rounded-full shadow-lg text-indigo-400 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-white" />
            </button>
          </div>
          <div className="sm:col-span-2 flex flex-col items-center space-y-0">
            <span className="text-gray-400 dark:text-gray-500 text-lg font-medium">To Chain</span>
            <Network
              disabled={actionDisabled}
              chain_id={toChainId}
              onSelect={_chain_id => {
                if (_chain_id === fromChainId) {
                  setFromChainId(toChainId)
                }
                else if (assetId) {
                  getChainBalances(_chain_id)
                }

                setToChainId(_chain_id)
              }}
            />
            {!address ?
              null
              :
              toBalance ?
                <div className="flex items-center text-gray-400 dark:text-gray-600 text-2xs space-x-1 pt-1">
                  <IoWallet size={12} />
                  <span className="font-mono">{numberFormat((toBalance.balance || 0) / Math.pow(10, toBalance.contract_decimals), '0,0.00000000')}</span>
                  <span className="font-semibold">{toBalance.contract_ticker_symbol}</span>
                </div>
                :
                !asset || !toChainId ?
                  null
                  :
                  balances_data?.[toChainId] ?
                    fromBalance ?
                      <div className="text-gray-400 dark:text-gray-600 text-2xs pt-1">-</div>
                      :
                      null
                    :
                    <Loader type="ThreeDots" color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="16" height="16" />
            }
          </div>
        </div>
        <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-5 sm:gap-4 pb-0.5">
          <div className="order-1 sm:col-span-2 flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-600 text-lg font-medium">Amount</span>
          </div>
          <div className="order-2 sm:col-span-3 flex flex-col items-center space-y-0">
            <Asset
              disabled={actionDisabled}
              assetId={assetId}
              onSelect={_asset_id => {
                if (_asset_id !== assetId) {
                  if (fromChainId) {
                    getChainBalances(fromChainId)
                  }
                  if (toChainId) {
                    getChainBalances(toChainId)
                  }

                  if (amount) {
                    setAmount(null)
                  }
                }

                setAssetId(_asset_id)
              }}
              fromChainId={fromChainId}
              toChainId={toChainId}
              amount={amount}
              amountOnChange={_amount => setAmount(_amount && !isNaN(_amount) ? Number(_amount) : _amount)}
            />
          </div>
          {address && isSupport() && (
            <>
              <div className="order-4 sm:order-3 sm:col-span-2 mt-8 sm:-mt-5">
                {(gasFeeEstimating || relayerFeeEstimating || routerFeeEstimating ||
                  typeof gasFee === 'number' || typeof relayerFee === 'number' || typeof routerFee === 'number' ||
                  typeof gasFee === 'boolean' || typeof relayerFee === 'boolean' || typeof routerFee === 'boolean'
                ) && (
                  <div className="min-w-max h-4 flex items-center justify-center space-x-1.5">
                    <span className="text-gray-600 dark:text-gray-400 text-2xs font-bold">Fees:</span>
                    {gasFeeEstimating || relayerFeeEstimating || routerFeeEstimating ?
                      <>
                        <span className="text-gray-600 dark:text-gray-400 text-2xs">Estimating</span>
                        <Loader type="BallTriangle" color={theme === 'dark' ? '#F9FAFB' : '#9CA3AF'} width="14" height="14" />
                      </>
                      :
                      feesEstimated ?
                        <Popover
                          placement="bottom"
                          title={<div className="flex items-center space-x-2">
                            <span className="whitespace-nowrap text-gray-600 dark:text-gray-400 text-2xs font-semibold">{estimatedAmount ? 'Actual' : 'Estimated'} Fees:</span>
                            <span className="text-gray-800 dark:text-gray-200 text-2xs space-x-1">
                              <span className="font-mono">{typeof estimatedFees === 'number' ? `${estimatedAmount ? '' : '~'}${numberFormat(estimatedFees, '0,0.00000000')}` : 'N/A'}</span>
                              <span className="font-semibold">{asset?.symbol}</span>
                            </span>
                          </div>}
                          content={<div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between space-x-2">
                              <span className="whitespace-nowrap text-gray-600 dark:text-gray-400 text-3xs font-medium">Dest. Tx Cost:</span>
                              <span className="text-gray-800 dark:text-gray-200 text-3xs space-x-1">
                                <span className="font-mono">{typeof gasFee === 'boolean' ? 'N/A' : `${estimatedAmount ? '' : '~'}${numberFormat((gasFee || 0), '0,0.00000000')}`}</span>
                                <span className="font-semibold">{asset?.symbol}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                              <span className="whitespace-nowrap text-gray-600 dark:text-gray-400 text-3xs font-medium">Relayer Fee:</span>
                              <span className="text-gray-800 dark:text-gray-200 text-3xs space-x-1">
                                <span className="font-mono">{typeof relayerFee === 'boolean' ? 'N/A' : `${estimatedAmount ? '' : '~'}${numberFormat((relayerFee || 0), '0,0.00000000')}`}</span>
                                <span className="font-semibold">{asset?.symbol}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                              <span className="whitespace-nowrap text-gray-600 dark:text-gray-400 text-3xs font-medium">Router Fee:</span>
                              <span className="text-gray-800 dark:text-gray-200 text-3xs space-x-1">
                                <span className="font-mono">{typeof routerFee === 'boolean' ? 'N/A' : `${estimatedAmount ? '' : '~'}${numberFormat((routerFee || 0), '0,0.00000000')}`}</span>
                                <span className="font-semibold">{asset?.symbol}</span>
                              </span>
                            </div>
                          </div>}
                        >
                          <span className="flex items-center text-gray-400 dark:text-gray-200 text-2xs space-x-1">
                            <span className="font-mono">{typeof estimatedFees === 'number' ? `${estimatedAmount ? '' : '~'}${numberFormat(estimatedFees, '0,0.000000')}` : 'N/A'}</span>
                            <span className="font-semibold">{asset?.symbol}</span>
                            <IoMdInformationCircle size={14} className="mb-0.5" />
                            {!estimatedAmount && (
                              <span className="font-mono lowercase text-gray-300 dark:text-gray-600">({refreshEstimatedFeesSecond}s)</span>
                            )}
                          </span>
                        </Popover>
                        :
                        null
                    }
                  </div>
                )}
              </div>
              <div className="order-3 sm:order-4 sm:col-span-3 sm:-mt-5 mx-auto sm:-ml-0.5">
                <div className="w-40 h-4 flex items-center justify-end">
                  {balances_data?.[fromChainId] ?
                    <button
                      onClick={() => setAmount(Number(fromBalance?.balance || 0) / Math.pow(10, fromBalance?.contract_decimals) > smallNumber ? Number(fromBalance?.balance || 0) / Math.pow(10, fromBalance.contract_decimals) : 0)}
                      className="text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-500 text-2xs font-bold"
                    >
                      Max
                    </button>
                    :
                    <Loader type="ThreeDots" color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="16" height="16" />
                  }
                  <div className="sm:hidden w-8" />
                </div>
              </div>
            </>
          )}
        </div>
        {balances_data?.[fromChainId] && feesEstimated && typeof estimatedFees === 'number' && typeof amount === 'number' && (
          <div>
            {amount < estimatedFees ?
              <div className="sm:pt-2.5 pb-1">
                <Alert
                  color="bg-red-400 dark:bg-red-500 text-left text-white"
                  icon={<BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-2 sm:mr-3" />}
                  closeDisabled={true}
                  rounded={true}
                >
                  <span className="font-mono text-xs">Invalid Amount ({`<`} Estimated Fees)</span>
                </Alert>
              </div>
              :
              fromBalanceAmount < amount ?
                <div className="sm:pt-2.5 pb-1">
                  <Alert
                    color="bg-red-400 dark:bg-red-500 text-left text-white"
                    icon={<BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-2 sm:mr-3" />}
                    closeDisabled={true}
                    rounded={true}
                  >
                    <span className="font-mono text-xs">Insufficient Funds</span>
                  </Alert>
                </div>
                :
                !(fromChainSynced && toChainSynced) ?
                  <div className="sm:pt-2.5 pb-1">
                    <Alert
                      color="bg-red-400 dark:bg-red-500 text-left text-white"
                      icon={<BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-2 sm:mr-3" />}
                      closeDisabled={true}
                      rounded={true}
                    >
                      <span className="font-mono text-xs">
                        {unsyncedChains.map((_chain, i) => (
                          <span key={i} className="inline-flex items-baseline mr-2">
                            {_chain.image && (
                              <Img
                                src={_chain.image}
                                alt=""
                                className="w-4 h-4 rounded-full self-center mr-1"
                              />
                            )}
                            <span className="font-bold">{_chain.title}</span>
                            {i < unsyncedChains.length - 1 && (
                              <span className="ml-1.5">&</span>
                            )}
                          </span>
                        ))}
                        <span>subgraph{unsyncedChains.length > 1 ? 's' : ''} is out of sync. Please try again later.</span>
                      </span>
                    </Alert>
                  </div>
                  :
                  mustChangeChain ?
                    <div className="sm:pt-2.5 pb-1">
                      <Wallet
                        chainIdToConnect={fromChainId}
                        buttonDisconnectTitle={<>
                          <span>Switch to</span>
                          <Img
                            src={fromChain?.image}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                          <span className="font-semibold">{fromChain?.title}</span>
                        </>}
                        buttonDisconnectClassName="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 rounded-lg shadow-lg flex items-center justify-center text-gray-100 hover:text-white text-xs sm:text-base space-x-2 py-4 px-3"
                      />
                    </div>
                    :
                    mustApproveToken ?
                      typeof tokenApproved === 'boolean' && (
                        <div className="sm:pt-2.5 pb-1">
                          <button
                            disabled={actionDisabled}
                            onClick={() => approveToken()}
                            className={`w-full ${actionDisabled ? 'bg-blue-400 dark:bg-blue-500' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'} ${actionDisabled ? 'cursor-not-allowed' : ''} rounded-lg shadow-lg flex items-center justify-center text-gray-100 hover:text-white text-sm sm:text-lg space-x-2 py-4 px-3`}
                          >
                            {tokenApprovingTx ?
                              <>
                                <Loader type="Oval" color={theme === 'dark' ? '#FFFFFF' : '#F9FAFB'} width="24" height="24" />
                                <span>Approving</span>
                              </>
                              :
                              <span>Approve</span>
                            }
                            <span className="font-semibold">{asset?.symbol}</span>
                          </button>
                        </div>
                      )
                      :
                      estimatedAmount || estimatingAmount ?
                        <>
                          {estimatedAmount && (
                            <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-5 sm:gap-4 -mt-8 sm:mt-0 pb-6 sm:pb-1.5">
                              <div className="order-1 sm:col-span-2 flex justify-center">
                                <span className="min-w-max text-gray-400 dark:text-gray-600 text-lg font-medium">~ Received</span>
                              </div>
                              <div className="order-2 sm:col-span-3 flex flex-col items-center space-y-0">
                                <div className="h-7 flex items-center justify-center sm:justify-start space-x-2">
                                  <div className="sm:w-40 font-mono flex items-center justify-end text-sm font-semibold text-right sm:px-3">
                                    {estimatingAmount ?
                                      <Loader type="ThreeDots" color={theme === 'dark' ? '#F9FAFB' : '#4B5563'} width="16" height="16" className="mt-1" />
                                      :
                                      numberFormat(BigNumber(estimatedAmount.bid?.amountReceived).shiftedBy(-toContract?.contract_decimals).toNumber(), '0,0.00000000')
                                    }
                                  </div>
                                  <span className="text-sm font-semibold">{asset.symbol}</span>
                                </div>
                              </div>
                              {!estimatingAmount && estimatedFees > BigNumber(estimatedAmount.bid?.amountReceived).shiftedBy(-toContract?.contract_decimals).toNumber() && (
                                <div className="order-2 sm:col-span-5 flex flex-wrap items-center justify-center text-yellow-500 dark:text-yellow-400 mt-4 sm:mt-0 -mb-4 sm:-mb-2">
                                  <TiWarning size={16} className="mb-0.5 mr-1.5" />
                                  <span>Fee is greater than estimated received.</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="sm:pt-2.5 pb-1">
                            <button
                              disabled={estimatingAmount}
                              onClick={() => {}}
                              className={`w-full ${estimatingAmount ? 'bg-blue-400 dark:bg-blue-500' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'} ${estimatingAmount ? 'cursor-not-allowed' : ''} rounded-lg shadow-lg flex items-center justify-center text-gray-100 hover:text-white text-sm sm:text-lg space-x-2 py-4 px-3`}
                            >
                              {estimatingAmount ?
                                <>
                                  <Loader type="Oval" color={theme === 'dark' ? '#FFFFFF' : '#F9FAFB'} width="24" height="24" className="w-6 h-6" />
                                  <span>Searching Routes</span>
                                </>
                                :
                                <span>Swap</span>
                              }
                              <span className="font-semibold">{asset?.symbol}</span>
                              {/*!estimatingAmount && typeof bidExpiresSecond === 'number' && (
                                <span className="text-gray-300 dark:text-gray-200 text-xs font-medium">(expire in {bidExpiresSecond}s)</span>
                              )*/}
                            </button>
                          </div>
                        </>
                        :
                        estimatedAmountResponse ?
                          <div className="sm:pt-2.5 pb-1">
                            <Alert
                              color={`${estimatedAmountResponse.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : estimatedAmountResponse.status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white`}
                              icon={estimatedAmountResponse.status === 'failed' ? <BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-2 sm:mr-3" /> : estimatedAmountResponse.status === 'success' ? <BiMessageCheck className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-2 sm:mr-3" /> : <BiMessageDetail className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-2 sm:mr-3" />}
                              closeDisabled={true}
                              rounded={true}
                            >
                              <span className="break-all font-mono text-xs">{estimatedAmountResponse.message}</span>
                            </Alert>
                          </div>
                          :
                          null
            }
          </div>
        )}
        {tokenApproveResponse && (
          <Notification
            hideButton={true}
            outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
            innerClassNames={`${tokenApproveResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-600' : tokenApproveResponse.status === 'success' ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-500 dark:bg-blue-600'} text-white`}
            animation="animate__animated animate__fadeInDown"
            icon={tokenApproveResponse.status === 'failed' ?
              <FaTimesCircle className="w-4 h-4 stroke-current mr-2" />
              :
              tokenApproveResponse.status === 'success' ?
                <FaCheckCircle className="w-4 h-4 stroke-current mr-2" />
                :
                <FaClock className="w-4 h-4 stroke-current mr-2" />
            }
            content={<span className="flex flex-wrap items-center">
              <span className="mr-1.5">{tokenApproveResponse.message}</span>
              {tokenApproveResponse.status === 'pending' && (
                <Loader type="ThreeDots" color={theme === 'dark' ? '#FFFFFF' : '#FFFFFF'} width="16" height="16" className="mt-1 mr-1.5" />
              )}
              {fromChain?.explorer?.url && (tokenApprovingTx || tokenApproveResponse.tx_hash) && (
                <a
                  href={`${fromChain.explorer.url}${fromChain.explorer.transaction_path?.replace('{tx}', tokenApprovingTx || tokenApproveResponse.tx_hash)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center font-semibold"
                >
                  <span>View on {fromChain.explorer.name}</span>
                  <TiArrowRight size={20} className="transform -rotate-45" />
                </a>
              )}
            </span>}
          />
        )}
      </div>
    </div>
  )
}
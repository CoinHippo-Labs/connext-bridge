import { useEffect, useState } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { NxtpSdk } from '@connext/nxtp-sdk'
import { providers } from 'ethers'
import BigNumber from 'bignumber.js'
import { Img } from 'react-image'
import Loader from 'react-loader-spinner'
import { MdSwapVerticalCircle, MdSwapHorizontalCircle } from 'react-icons/md'
import { IoWallet } from 'react-icons/io5'

import Network from './network'
import Asset from './asset'
import Wallet from '../wallet'
import Popover from '../popover'

import { balances as getBalances } from '../../lib/api/covalent'
import { smallNumber, numberFormat } from '../../lib/utils'

import { CHAINS_STATUS_DATA, CHAINS_STATUS_SYNC_DATA, BALANCES_DATA } from '../../reducers/types'

const refresh_estimated_fees_sec = Number(process.env.NEXT_PUBLIC_REFRESH_ESTIMATED_FEES_SEC)

export default function CrosschainBridge() {
  const dispatch = useDispatch()
  const { chains, assets, chains_status, balances, wallet, preferences } = useSelector(state => ({ chains: state.chains, assets: state.assets, chains_status: state.chains_status, balances: state.balances, wallet: state.wallet, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { chains_status_data } = { ...chains_status }
  const { balances_data } = { ...balances }
  const { wallet_data } = { ...wallet }
  const { web3_provider, signer, chain_id, address } = { ...wallet_data }
  const { theme } = { ...preferences }

  const [fromChainId, setFromChainId] = useState(null)
  const [toChainId, setToChainId] = useState(null)
  const [assetId, setAssetId] = useState(null)
  const [amount, setAmount] = useState(null)

  const [sdk, setSdk] = useState(null)
  const [gasFee, setGasFee] = useState(null)
  const [relayerFee, setRelayerFee] = useState(null)
  const [routerFee, setRouterFee] = useState(null)
  const [gasFeeEstimating, setGasFeeEstimating] = useState(null)
  const [relayerFeeEstimating, setRelayerFeeEstimating] = useState(null)
  const [routerFeeEstimating, setRouterFeeEstimating] = useState(null)
  const [refreshEstimatedFeesSecond, setRefreshEstimatedFeesSecond] = useState(refresh_estimated_fees_sec)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (chains_data) {
        if (!controller.signal.aborted) {
          
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [])

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
  }, [address])

  useEffect(() => {
    if (!sdk && chains_data && signer) {
      const chainConfig = {}

      for (let i = 0; i < chains_data.length; i++) {
        const _chain = chains_data[i]

        chainConfig[_chain?.chain_id] = {
          provider: new providers.FallbackProvider(_chain?.provider_params?.[0]?.rpcUrls?.filter(rpc => rpc && !rpc.startsWith('wss://') && !rpc.startsWith('ws://')).map(rpc => new providers.JsonRpcProvider(rpc)) || [])
        }
      }

      setSdk(new NxtpSdk({ chainConfig, signer }))
    }
  }, [chains_data, signer])

  useEffect(() => {
    const interval = setInterval(() => setRefreshEstimatedFeesSecond(refreshEstimatedFeesSecond - 1 || refresh_estimated_fees_sec), 1000)
    return () => clearInterval(interval)
  }, [refreshEstimatedFeesSecond])

  useEffect(() => {
    if (refreshEstimatedFeesSecond === refresh_estimated_fees_sec) {
      estimateFees()
    }
  }, [refreshEstimatedFeesSecond])

  useEffect(() => {
    estimateFees()
  }, [fromChainId, toChainId, assetId])

  const getChainBalances = async _chain_id => {
    if (_chain_id && address) {
      const response = await getBalances(_chain_id, address)

      if (response?.data?.items) {
        dispatch({
          type: BALANCES_DATA,
          value: { [`${_chain_id}`]: response.data.items },
        })
      }
      else if (!balances_data?.[_chain_id]) {
        dispatch({
          type: BALANCES_DATA,
          value: { [`${_chain_id}`]: [] },
        })
      }
    }
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
    if (sdk) {
      const asset = fromChainId && toChainId && assetId && assets_data?.find(_asset => _asset?.id === assetId && _asset.contracts?.findIndex(_contract => _contract?.chain_id === fromChainId) > -1 && _asset.contracts?.findIndex(_contract => _contract?.chain_id === toChainId) > -1)

      const support = asset && !((fromChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(fromChainId)) ||
        (toChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(toChainId)))

      if (support) {
        setGasFeeEstimating(true)

        const fromContract = asset.contracts?.find(_contract => _contract?.chain_id === fromChainId)
        const toContract = asset.contracts?.find(_contract => _contract?.chain_id === toChainId)

        const response = await sdk.estimateFeeForRouterTransferInReceivingToken(
          fromChainId,
          fromContract?.contract_address,
          toChainId,
          toContract?.contract_address,
        )

        setGasFee(response ? new BigNumber(response.toString()).shiftedBy(-toContract?.contract_decimals).toNumber() : false)

        setGasFeeEstimating(false)
      }
      else {
        setGasFee(null)
      }
    }
  }

  const estimateRelayerFee = async () => {
    if (sdk) {
      const asset = fromChainId && toChainId && assetId && assets_data?.find(_asset => _asset?.id === assetId && _asset.contracts?.findIndex(_contract => _contract?.chain_id === fromChainId) > -1 && _asset.contracts?.findIndex(_contract => _contract?.chain_id === toChainId) > -1)

      const support = asset && !((fromChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(fromChainId)) ||
        (toChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(toChainId)))

      if (support) {
        setRelayerFeeEstimating(true)

        const fromContract = asset.contracts?.find(_contract => _contract?.chain_id === fromChainId)
        const toContract = asset.contracts?.find(_contract => _contract?.chain_id === toChainId)

        const response = await sdk.estimateMetaTxFeeInReceivingToken(
          fromChainId,
          fromContract?.contract_address,
          toChainId,
          toContract?.contract_address,
        )

        setRelayerFee(response ? new BigNumber(response.toString()).shiftedBy(-toContract?.contract_decimals).toNumber() : false)

        setRelayerFeeEstimating(false)
      }
      else {
        setRelayerFee(null)
      }
    }
  }

  const estimateRouterFee = async () => {
    if (sdk) {
      const asset = fromChainId && toChainId && assetId && assets_data?.find(_asset => _asset?.id === assetId && _asset.contracts?.findIndex(_contract => _contract?.chain_id === fromChainId) > -1 && _asset.contracts?.findIndex(_contract => _contract?.chain_id === toChainId) > -1)

      const support = asset && !((fromChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(fromChainId)) ||
        (toChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(toChainId)))

      if (support) {
        setRouterFeeEstimating(true)

        setRouterFee(false)

        setRouterFeeEstimating(false)
      }
      else {
        setRouterFee(null)
      }
    }
  }

  const fromChain = chains_data?.find(_chain => _chain?.chain_id === fromChainId)
  const toChain = chains_data?.find(_chain => _chain?.chain_id === toChainId)

  const asset = assets_data?.find(_asset => _asset?.id === assetId)
  let fromBalance = balances_data?.[fromChainId]?.find(_contract => _contract?.contract_address === asset?.contracts?.find(__contract => __contract?.chain_id === fromChainId)?.contract_address)
  fromBalance = fromBalance || balances_data?.[fromChainId]?.find(_contract => asset?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase() && fromChain?.provider_params?.[0]?.nativeCurrency?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase())
  let toBalance = balances_data?.[toChainId]?.find(_contract => _contract?.contract_address === asset?.contracts?.find(__contract => __contract?.chain_id === toChainId)?.contract_address)
  toBalance = toBalance || balances_data?.[toChainId]?.find(_contract => asset?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase() && toChain?.provider_params?.[0]?.nativeCurrency?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase())

  const support = asset && !((fromChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(fromChainId)) ||
    (toChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(toChainId)))
  const feesEstimated = (typeof gasFee === 'number' || typeof gasFee === 'boolean') && (typeof relayerFee === 'number' || typeof relayerFee === 'boolean') && (typeof routerFee === 'number' || typeof routerFee === 'boolean')
  const estimatedFees = feesEstimated && ((gasFee || 0) + (relayerFee || 0) + (routerFee || 0))

  return (
    <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 mt-12">
      <div className="w-full max-w-md">
        <h1 className="uppercase text-lg font-semibold">Cross-Chain Swap</h1>
      </div>
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-lg space-y-12 sm:space-y-4 py-6 px-6 sm:px-7">
        <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-6">
          <div className="sm:col-span-2 flex flex-col items-center space-y-0">
            <span className="text-gray-400 dark:text-gray-500 text-lg font-medium">From Chain</span>
            <Network
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
                <div className="flex items-center text-gray-600 dark:text-gray-400 text-2xs space-x-1 pt-1">
                  <IoWallet size={12} />
                  <span className="font-mono">{numberFormat((fromBalance.balance || 0) / Math.pow(10, fromBalance.contract_decimals), '0,0.00000000')}</span>
                  <span className="font-semibold">{fromBalance.contract_ticker_symbol}</span>
                </div>
                :
                !address || !asset || !fromChainId ?
                  null
                  :
                  balances_data?.[fromChainId] ?
                    <div className="text-gray-600 dark:text-gray-400 text-2xs pt-1">-</div>
                    :
                    <Loader type="ThreeDots" color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="16" height="16" />
            }
          </div>
          <div className="flex items-center justify-center">
            <button
              onClick={() => {
                setFromChainId(toChainId)
                setToChainId(fromChainId)
              }}
            >
              <MdSwapVerticalCircle size={36} className="sm:hidden rounded-full shadow-lg text-indigo-400 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-white" />
              <MdSwapHorizontalCircle size={36} className="hidden sm:block rounded-full shadow-lg text-indigo-400 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-white" />
            </button>
          </div>
          <div className="sm:col-span-2 flex flex-col items-center space-y-0">
            <span className="text-gray-400 dark:text-gray-500 text-lg font-medium">To Chain</span>
            <Network
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
                <div className="flex items-center text-gray-600 dark:text-gray-400 text-2xs space-x-1 pt-1">
                  <IoWallet size={12} />
                  <span className="font-mono">{numberFormat((toBalance.balance || 0) / Math.pow(10, toBalance.contract_decimals), '0,0.00000000')}</span>
                  <span className="font-semibold">{toBalance.contract_ticker_symbol}</span>
                </div>
                :
                !asset || !toChainId ?
                  null
                  :
                  balances_data?.[toChainId] ?
                    <div className="text-gray-600 dark:text-gray-400 text-2xs pt-1">-</div>
                    :
                    <Loader type="ThreeDots" color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="16" height="16" />
            }
          </div>
        </div>
        <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-5 sm:gap-4">
          <div className="order-1 sm:col-span-2 flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-500 text-lg font-medium">Cryptocurrency</span>
          </div>
          <div className="order-2 sm:col-span-3 flex flex-col items-center space-y-0">
            <Asset
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
          {address && support && (
            <>
              <div className="order-4 sm:order-3 sm:col-span-2 mt-8 sm:-mt-4">
                {(gasFeeEstimating || relayerFeeEstimating || routerFeeEstimating ||
                  typeof gasFee === 'number' || typeof relayerFee === 'number' || typeof routerFee === 'number' ||
                  typeof gasFee === 'boolean' || typeof relayerFee === 'boolean' || typeof routerFee === 'boolean'
                ) && (
                  <div className="h-4 flex items-center justify-center space-x-1.5">
                    <span className="text-gray-700 dark:text-gray-300 text-2xs font-bold">Fees:</span>
                    {gasFeeEstimating || relayerFeeEstimating || routerFeeEstimating ?
                      <>
                        <span className="text-gray-600 dark:text-gray-400 text-2xs">Estimating</span>
                        <Loader type="BallTriangle" color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="14" height="14" />
                      </>
                      :
                      feesEstimated ?
                        <Popover
                          placement="bottom"
                          title={<div className="flex items-center space-x-2">
                            <span className="whitespace-nowrap text-gray-600 dark:text-gray-400 text-2xs font-semibold">Estimated Fees:</span>
                            <span className="text-gray-800 dark:text-gray-200 text-2xs space-x-1">
                              ~
                              <span className="font-mono">{typeof estimatedFees === 'number' ? numberFormat(estimatedFees, '0,0.00000000') : 'N/A'}</span>
                              <span className="font-semibold">{asset?.symbol}</span>
                            </span>
                          </div>}
                          content={<div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between space-x-2">
                              <span className="text-gray-600 dark:text-gray-400 text-3xs font-medium">Gas Fee:</span>
                              <span className="text-gray-800 dark:text-gray-200 text-3xs space-x-1">
                                ~
                                <span className="font-mono">{typeof gasFee === 'boolean' ? 'N/A' : numberFormat((gasFee || 0), '0,0.00000000')}</span>
                                <span className="font-semibold">{asset?.symbol}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                              <span className="text-gray-600 dark:text-gray-400 text-3xs font-medium">Relayer Fee:</span>
                              <span className="text-gray-800 dark:text-gray-200 text-3xs space-x-1">
                                ~
                                <span className="font-mono">{typeof relayerFee === 'boolean' ? 'N/A' : numberFormat((relayerFee || 0), '0,0.00000000')}</span>
                                <span className="font-semibold">{asset?.symbol}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                              <span className="text-gray-600 dark:text-gray-400 text-3xs font-medium">Router Fee:</span>
                              <span className="text-gray-800 dark:text-gray-200 text-3xs space-x-1">
                                ~
                                <span className="font-mono">{typeof routerFee === 'boolean' ? 'N/A' : numberFormat((routerFee || 0), '0,0.00000000')}</span>
                                <span className="font-semibold">{asset?.symbol}</span>
                              </span>
                            </div>
                          </div>}
                        >
                          <span className="text-gray-600 dark:text-gray-400 text-2xs space-x-1">
                            ~
                            <span className="font-mono">{typeof estimatedFees === 'number' ? numberFormat(estimatedFees, '0,0.00000000') : 'N/A'}</span>
                            <span className="font-semibold">{asset?.symbol}</span>
                            <span className="font-mono lowercase text-gray-400 dark:text-gray-600">({refreshEstimatedFeesSecond}s)</span>
                          </span>
                        </Popover>
                        :
                        null
                    }
                  </div>
                )}
              </div>
              <div className="order-3 sm:order-4 sm:col-span-3 sm:-mt-4 mx-auto sm:-ml-0.5">
                <div className="w-40 h-4 flex items-center justify-end">
                  {balances_data?.[fromChainId] ?
                    <button
                      onClick={() => setAmount(Number(fromBalance?.balance || 0) / Math.pow(10, fromBalance?.contract_decimals) > smallNumber ? Number(fromBalance?.balance || 0) / Math.pow(10, fromBalance.contract_decimals) : 0)}
                      className="text-gray-700 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-400 text-2xs font-bold"
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
        {balances_data?.[fromChainId] && feesEstimated && typeof estimatedFees === 'number' && (
          <></>
        )}
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'
import Loader from 'react-loader-spinner'
import { MdSwapVerticalCircle, MdSwapHorizontalCircle } from 'react-icons/md'
import { IoWallet } from 'react-icons/io5'

import Network from './network'
import Asset from './asset'
import Wallet from '../wallet'

import { balances as getBalances } from '../../lib/api/covalent'
import { numberFormat } from '../../lib/utils'

import { CHAINS_STATUS_DATA, CHAINS_STATUS_SYNC_DATA, BALANCES_DATA } from '../../reducers/types'

export default function CrosschainBridge() {
  const dispatch = useDispatch()
  const { chains, assets, chains_status, balances, wallet, preferences } = useSelector(state => ({ chains: state.chains, assets: state.assets, chains_status: state.chains_status, balances: state.balances, wallet: state.wallet, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { chains_status_data } = { ...chains_status }
  const { balances_data } = { ...balances }
  const { wallet_data } = { ...wallet }
  const { web3_provider, chain_id, address } = { ...wallet_data }
  const { theme } = { ...preferences }

  const [fromChainId, setFromChainId] = useState(null)
  const [toChainId, setToChainId] = useState(null)
  const [assetId, setAssetId] = useState(null)
  const [amount, setAmount] = useState(null)

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

  const fromChain = chains_data?.find(_chain => _chain?.chain_id === fromChainId)
  const toChain = chains_data?.find(_chain => _chain?.chain_id === toChainId)

  const asset = assets_data?.find(_asset => _asset?.id === assetId)
  let fromBalance = balances_data?.[fromChainId]?.find(_contract => _contract?.contract_address === asset?.contracts?.find(__contract => __contract?.chain_id === fromChainId)?.contract_address)
  fromBalance = fromBalance || balances_data?.[fromChainId]?.find(_contract => asset?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase() && fromChain?.provider_params?.[0]?.nativeCurrency?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase())
  let toBalance = balances_data?.[toChainId]?.find(_contract => _contract?.contract_address === asset?.contracts?.find(__contract => __contract?.chain_id === toChainId)?.contract_address)
  toBalance = toBalance || balances_data?.[toChainId]?.find(_contract => asset?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase() && toChain?.provider_params?.[0]?.nativeCurrency?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase())

  const showInput = asset && !((fromChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(fromChainId)) ||
    (toChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(toChainId)))

  return (
    <div className="flex flex-col items-center justify-center space-y-4 mt-12">
      <div className="w-full max-w-md">
        <h1 className="uppercase text-lg font-semibold">Cross-Chain Swap</h1>
      </div>
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-lg space-y-4 py-6 px-6 sm:px-7">
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
            {fromBalance ?
              <div className="flex items-center text-gray-600 dark:text-gray-400 text-2xs space-x-1 pt-1">
                <IoWallet size={12} className="sm:mb-0.5" />
                <span className="font-mono">{numberFormat((fromBalance.balance || 0) / Math.pow(10, fromBalance.contract_decimals), '0,0.00000000')}</span>
                <span className="font-semibold">{fromBalance.contract_ticker_symbol}</span>
              </div>
              :
              !asset || !fromChainId ?
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
            {toBalance ?
              <div className="flex items-center text-gray-600 dark:text-gray-400 text-2xs space-x-1 pt-1">
                <IoWallet size={12} className="sm:mb-0.5" />
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
          <div className="sm:col-span-2 flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-500 text-lg font-medium">Cryptocurrency</span>
          </div>
          <div className="sm:col-span-3 flex flex-col items-center space-y-0">
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

                  if (typeof amount === 'number') {
                    setAmount(null)
                  }
                }

                setAssetId(_asset_id)
              }}
              fromChainId={fromChainId}
              toChainId={toChainId}
              amount={amount}
              amountOnChange={_amount => setAmount(Number(_amount))}
            />
          </div>
          {showInput && (
            <>
              <div className="hidden sm:block sm:col-span-2" />
              <div className="sm:col-span-3 -mt-4 -ml-0.5">
                <div className="w-40 flex justify-end">
                  {balances_data?.[fromChainId] ?
                    <button
                      onClick={() => setAmount((fromBalance?.balance / Math.pow(10, fromBalance.contract_decimals)) || 0)}
                      className="text-gray-700 dark:text-gray-300 text-2xs font-bold"
                    >
                      Max
                    </button>
                    :
                    <Loader type="ThreeDots" color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="16" height="16" />
                  }
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
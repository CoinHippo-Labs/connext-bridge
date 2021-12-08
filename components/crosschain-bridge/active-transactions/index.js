import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { NxtpSdkEvents } from '@connext/nxtp-sdk'
import { Img } from 'react-image'
import StackGrid from 'react-stack-grid'
import Loader from 'react-loader-spinner'
import HeadShake from 'react-reveal/HeadShake'
import { TiArrowRight } from 'react-icons/ti'

import TransationState from '../transaction-state'
import Copy from '../../copy'
import Widget from '../../widget'

import { numberFormat, ellipseAddress } from '../../../lib/utils'

export default function ActiveTransactions({ setActiveTransactionOpen }) {
  const { chains, assets, ens, wallet, sdk, preferences } = useSelector(state => ({ chains: state.chains, assets: state.assets, ens: state.ens, wallet: state.wallet, sdk: state.sdk, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { ens_data } = { ...ens }
  const { wallet_data } = { ...wallet }
  const { web3_provider, signer, chain_id, address } = { ...wallet_data }
  const { sdk_data } = { ...sdk }
  const { theme } = { ...preferences }

  const [loading, setLoading] = useState(null)
  const [transactions, setTransactions] = useState(null)
  const [swapData, setSwapData] = useState(null)
  const [getTrigger, setGetTrigger] = useState(null)

  const [timer, setTimer] = useState(null)

  useEffect(() => {
    const getData = async () => {
      setLoading(true)

      if (sdk_data && address) {
        const response = await sdk_data.getActiveTransactions()

        setTransactions({ address, data: _.orderBy(response || [], ['crosschainTx.sending.expiry'], ['asc']) })
      }

      setLoading(false)
    }

    getData()

    const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [sdk_data, address, getTrigger])

  useEffect(() => {
    if (swapData && setActiveTransactionOpen) {
      setActiveTransactionOpen(true)
    }
  }, [swapData])

  useEffect(() => {
    const run = async () => setTimer(moment().unix())

    if (!timer) {
      run()
    }

    const interval = setInterval(() => run(), 0.5 * 1000)
    return () => clearInterval(interval)
  }, [timer])

  const onClick = transaction => setSwapData({ ...transaction?.crosschainTx?.invariant })

  const transactionsComponent = transactions?.address === address && transactions?.data?.length > 0 && transactions?.data?.map((transaction, i) => {
    const fromChain = chains_data?.find(_chain => _chain.chain_id === transaction?.crosschainTx?.invariant?.sendingChainId)
    const toChain = chains_data?.find(_chain => _chain.chain_id === transaction?.crosschainTx?.invariant?.receivingChainId)
    const fromAsset = assets_data?.find(_asset => _asset?.contracts?.find(_contract => _contract?.chain_id === fromChain?.chain_id && _contract?.contract_address?.toLowerCase() === transaction?.crosschainTx?.invariant?.sendingAssetId))

    return (
      <Widget
        key={i}
        onClick={e => {
          if (!e.target.className?.baseVal?.includes('copy') && !e.target.outerHTML?.startsWith('<path d=')) {
            onClick(transaction)
          }
        }}
        title={<div className="flex items-center">
          <span className="whitespace-nowrap text-gray-400 dark:text-gray-600 text-sm font-medium mr-1.5">TX ID:</span>
          {transaction && (
            <div className="flex items-center space-x-1">
              <span className="cursor-pointer text-indigo-600 dark:text-gray-200 text-sm font-medium">
                {ellipseAddress(transaction.crosschainTx?.invariant?.transactionId?.toLowerCase(), 8)}
              </span>
              <Copy
                size={14}
                text={transaction.crosschainTx?.invariant?.transactionId?.toLowerCase()}
                className="copy"
              />
            </div>
          )}
        </div>}
        className="w-full bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 border-0 shadow cursor-pointer"
      >
        <div className="flex flex-col items-center space-y-2 mt-2">
          <div className="flex items-center justify-center space-x-3">
            {fromChain && (
              <Img
                src={fromChain.image}
                alt=""
                className="w-7 h-7 rounded-full"
              />
            )}
            <TiArrowRight size={24} className="text-gray-600 dark:text-gray-200" />
            {toChain && (
              <Img
                src={toChain.image}
                alt=""
                className="w-7 h-7 rounded-full"
              />
            )}
          </div>
          {fromAsset && (
            <div className="max-w-min w-auto bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center space-x-1 py-1 px-2.5">
              <span className="font-mono">{numberFormat(Number(transaction?.crosschainTx?.sending?.amount) / Math.pow(10, fromAsset?.contracts?.find(_contract => _contract?.chain_id === fromChain?.chain_id)?.contract_decimals), '0,0.00')}</span>
              <span className="font-semibold">{fromAsset.symbol}</span>
            </div>
          )}
          <div className="flex flex-col items-center">
            {transaction?.status === NxtpSdkEvents.SenderTransactionPrepared ?
              <div className="flex items-center justify-center space-x-2">
                <span className="text-indigo-600 dark:text-white font-medium">Waiting for Router</span>
                <Loader type="Bars" color={theme === 'dark' ? '#FFFFFF' : '#4F46E5'} width="16" height="16" />
              </div>
              :
              transaction?.status === NxtpSdkEvents.ReceiverTransactionPrepared ?
                <HeadShake duration={1500} forever>
                  <button
                    type="button"
                    onClick={() => onClick(transaction)}
                    className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-xl flex items-center justify-center text-gray-100 hover:text-white text-xs space-x-1 mb-1 pl-3"
                  >
                    <span className="font-normal">Ready to</span>
                    <span className="flex items-center font-bold">
                      Claim
                      <Loader type="Rings" color={theme === 'dark' ? '#FFFFFF' : '#FFFFFF'} width="32" height="32" className="-ml-0.5" />
                    </span>
                  </button>
                </HeadShake>
                :
                transaction?.status === NxtpSdkEvents.ReceiverPrepareSigned ?
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-indigo-600 dark:text-white font-medium">Waiting for Relayer</span>
                    <Loader type="Oval" color={theme === 'dark' ? '#FFFFFF' : '#4F46E5'} width="16" height="16" />
                  </div>
                  :
                  null
            }
            <div className="text-gray-400 dark:text-gray-600 text-xs space-x-1">
              <span>Expire{moment(transaction?.crosschainTx?.sending?.expiry * 1000).diff(moment()) < 0 ? 'd' : ''}</span>
              <span>{moment(transaction?.crosschainTx?.sending?.expiry * 1000).fromNow()}</span>
            </div>
          </div>
        </div>
      </Widget>
    )
  })

  return address && (transactionsComponent || loading) && (
    <div className="lg:max-w-xs lg:ml-auto">
      {swapData && (
        <TransationState
          data={swapData}
          buttonClassName="hidden"
          onClose={() => {
            setSwapData(null)
            setGetTrigger(moment().valueOf())

            if (setActiveTransactionOpen) {
              setActiveTransactionOpen(true)
            }
          }}
          onFinish={() => {
            setGetTrigger(moment().valueOf())
          }}
        />
      )}
      <div className="uppercase text-lg font-bold text-center lg:mt-2 mb-2">
        Active Transactions
      </div>
      {transactionsComponent ?
        <>
          <StackGrid
            columnWidth={240}
            gutterWidth={16}
            gutterHeight={16}
            className="hidden sm:block"
          >
            {transactionsComponent}
          </StackGrid>
          <div className="block sm:hidden space-y-3">
            {transactionsComponent}
          </div>
        </>
        :
        <div className="flex items-center justify-center space-x-2">
          <span className="text-indigo-600 dark:text-white font-semibold">Loading</span>
          <Loader type="ThreeDots" color={theme === 'dark' ? '#FFFFFF' : '#4F46E5'} width="20" height="20" className="mt-0.5" />
        </div>
      }
    </div>
  )
}
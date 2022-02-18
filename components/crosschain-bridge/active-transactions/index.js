import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { NxtpSdkEvents } from '@connext/nxtp-sdk'
import BigNumber from 'bignumber.js'
import { Img } from 'react-image'
import StackGrid from 'react-stack-grid'
import { Bars, Puff, Oval } from 'react-loader-spinner'
import HeadShake from 'react-reveal/HeadShake'
import { TiArrowRight } from 'react-icons/ti'

import TransactionState from '../transaction-state'
import Copy from '../../copy'
import Widget from '../../widget'

import { numberFormat, ellipseAddress } from '../../../lib/utils'

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function ActiveTransactions({ setOpen, trigger }) {
  const { preferences, chains, assets, sdk, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, sdk: state.sdk, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { sdk_data } = { ...sdk }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }

  const [loading, setLoading] = useState(null)
  const [transactions, setTransactions] = useState(null)
  const [swapData, setSwapData] = useState(null)
  const [getTrigger, setGetTrigger] = useState(null)
  const [timer, setTimer] = useState(null)

  useEffect(() => {
    if (trigger) {
      setGetTrigger(moment().valueOf())
    }
  }, [trigger])

  useEffect(() => {
    const interval_sec = 15

    const getData = async () => {
      setLoading(true)

      if (sdk_data && address) {
        if (!transactions || transactions.address?.toLowerCase() !== address.toLowerCase() || transactions.data?.length > 0 || moment().diff(moment(getTrigger), 'seconds') < interval_sec) {
          try {
            const response = await sdk_data.getActiveTransactions()
            if (response) {
              setTransactions({ address, data: _.orderBy(response || [], ['crosschainTx.sending.expiry'], ['desc']) })
            }
          } catch (error) {}
        }
      }
      else {
        setTransactions(null)
      }

      setLoading(false)
    }

    getData()

    const interval = setInterval(() => getData(), interval_sec * 1000)
    return () => clearInterval(interval)
  }, [sdk_data, address, getTrigger])

  useEffect(() => {
    if (swapData && setOpen) {
      setOpen(true)
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

  const onClick = t => setSwapData({ ...t?.crosschainTx?.invariant })

  const transactionsComponent = transactions?.address?.toLowerCase() === address?.toLowerCase() && transactions?.data?.map((t, i) => {
    const fromChain = chains_data?.find(c => c.chain_id === t?.crosschainTx?.invariant?.sendingChainId)
    const toChain = chains_data?.find(c => c.chain_id === t?.crosschainTx?.invariant?.receivingChainId)
    const fromAsset = assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === fromChain?.chain_id && c?.contract_address?.toLowerCase() === t?.crosschainTx?.invariant?.sendingAssetId) > -1)
    const contract = fromAsset?.contracts?.find(c => c?.chain_id === fromChain?.chain_id)
    const amount = BigNumber(t?.crosschainTx?.sending?.amount || 0).shiftedBy(-contract?.contract_decimals).toNumber()
    const expired = moment(t?.crosschainTx?.sending?.expiry * 1000).diff(moment()) < 0

    return (
      <Widget
        key={i}
        onClick={e => {
          if (!e.target.className?.baseVal?.includes('copy') && !e.target.outerHTML?.startsWith('<path d=')) {
            onClick(t)
          }
        }}
        title={<div className="flex items-center">
          <span className="whitespace-nowrap text-gray-400 dark:text-gray-600 text-sm mr-1.5">TX ID:</span>
          {t && (
            <div className="flex items-center space-x-1">
              <span className="cursor-pointer text-blue-400 dark:text-white text-sm font-medium">
                {ellipseAddress(t.crosschainTx?.invariant?.transactionId?.toLowerCase(), 6)}
              </span>
              <Copy
                size={14}
                text={t.crosschainTx?.invariant?.transactionId?.toLowerCase()}
                className="copy"
              />
            </div>
          )}
        </div>}
        className="w-full bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 border-0 shadow-md rounded-2xl cursor-pointer"
      >
        <div className="flex flex-col items-center space-y-2 mt-2">
          <div className="flex items-center justify-center space-x-3">
            <Img
              src={fromChain?.image}
              alt=""
              className="w-7 h-7 rounded-full"
            />
            <TiArrowRight size={24} className="text-blue-600 dark:text-white" />
            <Img
              src={toChain?.image}
              alt=""
              className="w-7 h-7 rounded-full"
            />
          </div>
          {fromAsset && (
            <div className="max-w-min w-auto bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center font-mono font-semibold space-x-1 py-1 px-2.5">
              <span>{numberFormat(amount, amount > 10000 ? '0,0' : amount > 1000 ? '0,0' : '0,0.000000', true)}</span>
              <span>{contract?.symbol || fromAsset.symbol}</span>
            </div>
          )}
          <div className="flex flex-col items-center">
            {t?.status === NxtpSdkEvents.SenderTransactionPrepared ?
              <div className="flex items-center justify-center space-x-2">
                <span className="text-blue-600 dark:text-white font-medium">Waiting for Router</span>
                <Bars color={theme === 'dark' ? 'white' : '#2563EB'} width="16" height="16" />
              </div>
              :
              t?.status === NxtpSdkEvents.ReceiverTransactionPrepared ?
                <HeadShake duration={1500} forever>
                  <button
                    type="button"
                    onClick={() => onClick(t)}
                    className="bg-blue-600 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl flex items-center justify-center text-gray-100 hover:text-white text-xs space-x-1 mb-1 py-1.5 pl-2.5 pr-1.5"
                  >
                    <span className="font-medium">Ready to</span>
                    <span className="font-bold">Claim</span>
                    <Puff color={theme === 'dark' ? 'white' : 'white'} width="16" height="16" />
                  </button>
                </HeadShake>
                :
                t?.status === NxtpSdkEvents.ReceiverPrepareSigned ?
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-blue-600 dark:text-white font-medium">Waiting for Relayer</span>
                    <Oval color={theme === 'dark' ? 'white' : '#2563EB'} width="16" height="16" />
                  </div>
                  :
                  null
            }
            <div className={`${expired ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-600'} text-xs space-x-1`}>
              <span>Expire{expired ? 'd' : ''}</span>
              <span>{moment(t?.crosschainTx?.sending?.expiry * 1000).fromNow()}</span>
            </div>
          </div>
        </div>
      </Widget>
    )
  })

  return address && (transactionsComponent || (loading && !transactions?.data)) && (
    <div className="lg:max-w-xs lg:ml-auto">
      {swapData && (
        <TransactionState
          data={swapData}
          onFinish={() => setGetTrigger(moment().valueOf())}
          onClose={() => {
            setSwapData(null)
            setGetTrigger(moment().valueOf())
            if (setOpen) {
              setOpen(false)
            }
          }}
          buttonClassName="hidden"
        />
      )}
      {transactions?.data?.length > 0 && (
        <div className="uppercase text-green-500 dark:text-white text-sm font-semibold text-center lg:mt-2 mb-2">
          Active Transactions
        </div>
      )}
      {transactionsComponent && (
        <>
          <StackGrid
            columnWidth={240}
            gutterWidth={16}
            gutterHeight={16}
            className="hidden sm:block max-w-xl mx-auto"
          >
            {transactionsComponent}
          </StackGrid>
          <div className="block sm:hidden space-y-3">
            {transactionsComponent}
          </div>
        </>
      )}
    </div>
  )
}
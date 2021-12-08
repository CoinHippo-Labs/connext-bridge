import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import BigNumber from 'bignumber.js'
import { Img } from 'react-image'
import StackGrid from 'react-stack-grid'
import Loader from 'react-loader-spinner'

import TransationState from '../transaction-state'
import Copy from '../../copy'
import Widget from '../../widget'

import { numberFormat, ellipseAddress } from '../../../lib/utils'

import { TOKENS_DATA } from '../../../reducers/types'

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function ActiveTransactions() {
  const dispatch = useDispatch()
  const { chains, assets, tokens, ens, wallet, sdk, preferences } = useSelector(state => ({ chains: state.chains, assets: state.assets, tokens: state.tokens, ens: state.ens, wallet: state.wallet, sdk: state.sdk, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { tokens_data } = { ...tokens }
  const { ens_data } = { ...ens }
  const { wallet_data } = { ...wallet }
  const { web3_provider, signer, chain_id, address } = { ...wallet_data }
  const { sdk_data } = { ...sdk }
  const { theme } = { ...preferences }

  const [transactions, setTransactions] = useState(null)
  const [swapData, setSwapData] = useState(null)
  const [getTrigger, setGetTrigger] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (sdk_data && address) {
        const response = await sdk_data.getActiveTransactions()

        setTransactions({ address, data: response || [] })
      }
    }

    getData()

    const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [sdk_data, address, getTrigger])

  const transactionsComponent = (transactions?.address === address ?
    (transactions?.data || []).map((transaction, i) => { return { ...transaction, i } })
    :
    [...Array(3).keys()].map(i => { return { i, skeleton: true } })
  ).map((transaction, i) => (
    <Widget
      key={i}
      onClick={() => setSwapData({ ...transaction?.crosschainTx?.invariant })}
      title={<div className="flex items-center">
        <span className="whitespace-nowrap text-gray-400 dark:text-gray-600 text-sm sm:text-base font-medium mr-2">TX ID:</span>
        <div className="flex items-center space-x-1.5 mr-2">
          {transaction && (
            <>
              <a
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transaction.crosschainTx?.invariant?.transactionId?.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 dark:text-gray-100 text-sm sm:text-base font-semibold"
              >
                {ellipseAddress(transaction.crosschainTx?.invariant?.transactionId?.toLowerCase(), 8)}
              </a>
              <Copy size={16} text={transaction.crosschainTx?.invariant?.transactionId?.toLowerCase()} />
            </>
          )}
        </div>
      </div>}
      className="w-full h-16 bg-gray-50 hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-900"
    >
      x
    </Widget>
  ))

  return address && (
    <>
      {swapData && (
        <TransationState
          data={swapData}
          buttonClassName="hidden"
          onClose={() => {
            setSwapData(null)
            setGetTrigger(moment().valueOf())
          }}
          onFinish={() => {
            setGetTrigger(moment().valueOf())
          }}
        />
      )}
      <StackGrid
        columnWidth={324}
        gutterWidth={12}
        gutterHeight={12}
        className="hidden sm:block"
      >
        {transactionsComponent}
      </StackGrid>
      <div className="block sm:hidden space-y-3">
        {transactionsComponent}
      </div>
    </>
  )
}
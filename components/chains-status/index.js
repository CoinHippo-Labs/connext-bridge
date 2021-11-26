import { useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'
import { FaRegHandPointRight } from 'react-icons/fa'

import { graphql } from '../../lib/api/subgraph'

import { CHAINS_STATUS_DATA, CHAINS_STATUS_SYNC_DATA } from '../../reducers/types'

export default function ChainsStatus() {
  const dispatch = useDispatch()
  const { chains, chains_status, chains_status_sync, wallet } = useSelector(state => ({ chains: state.chains, chains_status: state.chains_status, chains_status_sync: state.chains_status_sync, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { chains_status_data } = { ...chains_status }
  const { chains_status_sync_data } = { ...chains_status_sync }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }

  useEffect(() => {
    const getDataSync = async _chains => {
      if (_chains) {
        let chainsData

        for (let i = 0; i < _chains.length; i++) {
          const chain = _chains[i]

          const response = !chain.disabled && await graphql({ chain_id: chain.id, query: '{ _meta { block { hash, number } } }' })

          chainsData = _.concat(chainsData || [], { ...chain, ...response?.data?._meta, synced: response?.data?._meta.block })
        }

        dispatch({
          type: CHAINS_STATUS_SYNC_DATA,
          value: chainsData,
        })
      }
    }

    const getData = async () => {
      if (chains_data) {
        const chunkSize = _.head([...Array(chains_data.length).keys()].map(i => i + 1).filter(i => Math.ceil(chains_data.length / i) <= Number(process.env.NEXT_PUBLIC_MAX_CHUNK))) || chains_data.length
        _.chunk([...Array(chains_data.length).keys()], chunkSize).forEach(chunk => getDataSync(chains_data.map((_chain, i) => { return { ..._chain, i } }).filter((_chain, i) => chunk.includes(i))))
      }
    }

    getData()

    const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [chains_data])

  useEffect(() => {
    if (chains_status_sync_data) {
      if (chains_status_sync_data.length >= chains_data.length) {
        dispatch({
          type: CHAINS_STATUS_DATA,
          value: _.orderBy(chains_status_sync_data, ['i'], ['asc']),
        })
      }
    }
  }, [chains_status_sync_data])

  return (
    <>
      <div className="w-full h-8 bg-gray-100 dark:bg-gray-900 overflow-x-auto flex items-center py-2 px-2 sm:px-4">
        {chains_status_data?.map((chain, i) => (
          <div key={i} className="min-w-max flex items-center text-2xs space-x-1 mr-4">
            {chain.image && (
              <Img
                src={chain.image}
                alt=""
                className="w-3.5 h-3.5 rounded-full"
              />
            )}
            {chain.short_name && (
              <span className="text-gray-700 dark:text-gray-300 font-semibold">{chain.short_name}</span>
            )}
            <span className={`capitalize ${chain.disabled ? 'text-gray-400 dark:text-gray-600' : !chain.synced ? 'text-red-500 dark:text-red-700' : 'text-green-600 dark:text-green-500'}`}>
              {chain.disabled ? 'disabled' : !chain.synced ? 'unsynced' : 'synced'}
            </span>
          </div>
        ))}
      </div>
      {chains_status_data?.filter(_chain => !_chain.disabled && !_chain.synced).length > 0 && (
        <div className="flex flex-wrap items-center font-mono leading-4 text-blue-600 dark:text-blue-400 text-2xs space-y-1 py-2 px-2 sm:px-4">
          <FaRegHandPointRight size={18} className="mr-1.5" />
          <span className="mr-1.5">
            You may face some delay transfers due to <span className="font-semibold">{chains_status_data?.filter(_chain => !_chain.disabled && !_chain.synced).map(_chain => _chain?.short_name).join(', ')}</span> is not synced. However, no worry at all - your funds are SAFE. Simply check your transaction status at
          </span>
          <a
            href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}${address ? `/address/${address}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600 dark:text-blue-500 font-bold"
          >
            {address ? 'View Transactions' : 'Explorer'}
          </a>.
        </div>
      )}
    </>
  )
}
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'

import Network from './network'
import Wallet from '../wallet'

import { graphql } from '../../lib/api/subgraph'

import { CHAINS_STATUS_DATA, CHAINS_STATUS_SYNC_DATA } from '../../reducers/types'

export default function CrosschainBridge() {
  const { chains, assets, chains_status, wallet } = useSelector(state => ({ chains: state.chains, assets: state.assets, chains_status: state.chains_status, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { chains_status_data } = { ...chains_status }
  const { wallet_data } = { ...wallet }
  const { web3_provider, chain_id } = { ...wallet_data }

  const router = useRouter()

  const [fromChainId, setFromChainId] = useState(null)
  const [toChainId, setToChainId] = useState(null)
  const [selectedAsset, setSelectedAsset] = useState(null)

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

  const fromChain = chains_data?.find(_chain => _chain?.chain_id === fromChainId)
  const toChain = chains_data?.find(_chain => _chain?.chain_id === toChainId)

  return (
    <div className="flex flex-col items-center justify-center space-y-4 mt-12">
      <div className="w-full max-w-md">
        <h1 className="uppercase text-lg font-semibold">Cross-Chain Swap</h1>
      </div>
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-lg space-y-4 py-6 px-6 sm:px-7">
        <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-0">
            <span className="text-gray-400 dark:text-gray-500 text-lg font-medium">From Chain</span>
            <Network
              chain_id={fromChainId}
              onSelect={_chain_id => {
                if (_chain_id === toChainId) {
                  setToChainId(fromChainId)
                }

                setFromChainId(_chain_id)
              }}
            />
          </div>
          <div className="space-y-0">
            <span className="text-gray-400 dark:text-gray-500 text-lg font-medium">To Chain</span>
            <Network
              chain_id={toChainId}
              onSelect={_chain_id => {
                if (_chain_id === fromChainId) {
                  setFromChainId(toChainId)
                }

                setToChainId(_chain_id)
              }}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
          <span className="text-gray-400 dark:text-gray-500 text-lg font-medium">Cryptocurrency</span>

        </div>
      </div>
    </div>
  )
}
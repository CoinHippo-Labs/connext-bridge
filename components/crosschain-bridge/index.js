import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'

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

  const [selectedChainIds, setSelectedChainIds] = useState([])
  const [fromAsset, setFromAsset] = useState(null)
  const [toAsset, setToAsset] = useState(null)

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

  const fromChain = chains_data?.find(_chain => _chain?.chain_id === selectedChainIds?.[0])
  const toChain = chains_data?.find(_chain => _chain?.chain_id === selectedChainIds?.[1])

  return (
    <div className="h-5/6 flex flex-col items-center justify-center space-y-4">
      <div className="w-full max-w-md">
        <h1 className="uppercase text-lg font-semibold">Cross-Chain Swap</h1>
      </div>
      <div className="w-full max-w-md h-5/6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg">
        
      </div>
    </div>
  )
}
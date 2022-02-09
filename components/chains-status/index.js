import { useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { NxtpSdk } from '@connext/nxtp-sdk'
import { providers } from 'ethers'
import { Img } from 'react-image'
import { Grid } from 'react-loader-spinner'
import { TiWarning } from 'react-icons/ti'

import { CHAINS_STATUS_DATA, CHAINS_STATUS_SYNC_DATA, SDK_DATA, RPCS_DATA } from '../../reducers/types'

export default function ChainsStatus() {
  const dispatch = useDispatch()
  const { chains, chains_status, chains_status_sync, wallet, sdk, rpcs, preferences } = useSelector(state => ({ chains: state.chains, chains_status: state.chains_status, chains_status_sync: state.chains_status_sync, wallet: state.wallet, sdk: state.sdk, rpcs: state.rpcs, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { chains_status_data } = { ...chains_status }
  const { chains_status_sync_data } = { ...chains_status_sync }
  const { wallet_data } = { ...wallet }
  const { signer, chain_id, address } = { ...wallet_data }
  const { sdk_data } = { ...sdk }
  const { rpcs_data } = { ...rpcs }
  const { theme } = { ...preferences }

  useEffect(async () => {
    if (chains_data && signer) {
      const chainConfig = ['testnet'].includes(process.env.NEXT_PUBLIC_NETWORK) ?
        { 1: { providers: ['https://api.mycryptoapi.com/eth', 'https://cloudflare-eth.com'] } }
        :
        {}

      const rpcs = {}

      for (let i = 0; i < chains_data.length; i++) {
        const _chain = chains_data[i]

        chainConfig[_chain?.chain_id] = {
          providers: _chain?.provider_params?.[0]?.rpcUrls?.filter(rpc => rpc && !rpc.startsWith('wss://') && !rpc.startsWith('ws://')) || [],
          // subgraph: _chain?.subgraph,
        }

        rpcs[_chain?.chain_id] = new providers.FallbackProvider(_chain?.provider_params?.[0]?.rpcUrls?.filter(rpc => rpc && !rpc.startsWith('wss://') && !rpc.startsWith('ws://')).map(rpc => new providers.JsonRpcProvider(rpc)) || [])
      }

      dispatch({
        type: SDK_DATA,
        value: await NxtpSdk.create({ chainConfig, signer, skipPolling: false/*true*/ }),
      })

      dispatch({
        type: RPCS_DATA,
        value: rpcs,
      })
    }
  }, [chains_data, chain_id, address])

  useEffect(() => {
    const getDataSync = async _chains => {
      if (_chains && sdk_data) {
        let chainsData

        for (let i = 0; i < _chains.length; i++) {
          const _chain = _chains[i]

          const response = !_chain.disabled && await sdk_data.getSubgraphSyncStatus(_chain.chain_id)

          chainsData = _.concat(chainsData || [], { ..._chain, ...response })
            .map(_chain => { return { ..._chain, ...(_chain.latestBlock < 0 && chains_status_data?.find(__chain => __chain?.id === _chain.id)) } })
            .filter(_chain => !chains_status_data || _chain.latestBlock > -1)
        }

        dispatch({
          type: CHAINS_STATUS_SYNC_DATA,
          value: chainsData,
        })
      }
    }

    const getData = async () => {
      if (chains_data && sdk_data) {
        const chunkSize = _.head([...Array(chains_data.length).keys()].map(i => i + 1).filter(i => Math.ceil(chains_data.length / i) <= Number(process.env.NEXT_PUBLIC_MAX_CHUNK))) || chains_data.length
        _.chunk([...Array(chains_data.length).keys()], chunkSize).forEach(chunk => getDataSync(chains_data.map((_chain, i) => { return { ..._chain, i } }).filter((_chain, i) => chunk.includes(i))))
      }
    }

    setTimeout(() => {
      getData()
    }, (chains_data && sdk_data ? 1 : 0) * 15 * 1000)

    const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [chains_data, sdk_data])

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

  return !chains_status_data && address && (
    <div className="w-full h-8 xl:h-10 bg-gray-100 dark:bg-gray-900 overflow-x-auto flex items-center py-2 px-2 sm:px-4">
      <span className="flex flex-wrap items-center font-mono text-blue-600 dark:text-blue-400 text-2xs xl:text-sm space-x-1.5 xl:space-x-2 mx-auto">
        <Grid color={theme === 'dark' ? '#60A5FA' : '#2563EB'} width="16" height="16" />
        <span>Checking Subgraph Status</span>
      </span>
    </div>
  )
}
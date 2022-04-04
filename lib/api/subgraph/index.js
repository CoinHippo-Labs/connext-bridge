import _ from 'lodash'

import { tx_manager } from '../../object/tx'
import { getRequestUrl } from '../../utils'

const _module = 'subgraph'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module }))
    .catch(error => { return null })
  return res && await res.json()
}

export const graphql = async params => await request(null, params)

export const assetBalances = async (sdk, chain_id, params) => {
  let data

  if (sdk && chain_id) {
    const size = typeof params?.size === 'number' ? params.size : 1000
    if (typeof params?.size !== 'undefined') {
      delete params.size
    }

    const where = params?.where
    if (typeof params?.where !== 'undefined') {
      delete params.where
    }

    let skip = 0, hasMore = true

    while (hasMore) {
      const query = `
        {
          assetBalances(orderBy: amount, orderDirection: desc) {
            id
            amount
            router {
              id
            }
            assetId
          }
        }
      `

      let response
      try {
        response = await sdk.querySubgraph(chain_id, query)
      } catch (error) {}

      data = _.uniqBy(_.concat(data || [], response?.assetBalances?.map(assetBalance => {
        return {
          ...assetBalance,
          contract_address: assetBalance?.assetId,
        }
      })), 'id')

      hasMore = where && response?.assetBalances?.length === size

      if (hasMore) {
        skip += size
      }
    }
  }

  return { data }
}

export const transactions = async (sdk, chain_id, tx_id, params, chains, tokens) => {
  let data

  if (sdk && chain_id) {
    const max_size = typeof params?.max_size === 'number' ? params.max_size : undefined
    if (typeof params?.max_size !== 'undefined') {
      delete params.max_size
    }

    const size = typeof params?.size === 'number' ? params.size : 100
    if (typeof params?.size !== 'undefined') {
      delete params.size
    }

    const where = params?.where
    if (typeof params?.where !== 'undefined') {
      delete params.where
    }

    let skip = 0, hasMore = true

    while (hasMore) {
      const query = `
        {
          transactions(orderBy: preparedTimestamp, orderDirection: desc, skip: ${skip}, first: ${size}${where ? `, where: ${where}` : tx_id ? `, where: { transactionId: "${tx_id.toLowerCase()}" }` : ''}) {
            id
            status
            chainId
            preparedTimestamp
            receivingChainTxManagerAddress
            user {
              id
            }
            router {
              id
            }
            initiator
            sendingAssetId
            receivingAssetId
            sendingChainFallback
            callTo
            receivingAddress
            callDataHash
            transactionId
            sendingChainId
            receivingChainId
            amount
            expiry
            preparedBlockNumber
            encryptedCallData
            prepareCaller
            bidSignature
            encodedBid
            prepareTransactionHash
            prepareMeta
            relayerFee
            signature
            callData
            externalCallSuccess
            externalCallIsContract
            externalCallReturnData
            fulfillCaller
            fulfillTransactionHash
            fulfillMeta
            fulfillTimestamp
            cancelCaller
            cancelTransactionHash
            cancelMeta
            cancelTimestamp
          }
        }
      `

      let response
      try {
        response = await sdk.querySubgraph(chain_id, query)
      } catch (error) {}

      data = _.uniqBy(_.concat(data || [], response?.transactions?.map(t => {
        return {
          ...t,
          chainTx: tx_manager.chain_tx(t),
          chainId: Number(t.chainId),
          preparedTimestamp: Number(t.preparedTimestamp) * 1000,
          fulfillTimestamp: Number(t.fulfillTimestamp) * 1000,
          cancelTimestamp: Number(t.cancelTimestamp) * 1000,
          expiry: Number(t.expiry) * 1000,
          sendingAddress: tx_manager.from(t),
          sendingChainId: Number(t.sendingChainId),
          sendingChain: chains?.find(c => c.chain_id === Number(t.sendingChainId)),
          sendingAsset: tokens?.find(_t => _t.chain_id === Number(t.sendingChainId) && _t.contract_address === t.sendingAssetId),
          receivingChainId: Number(t.receivingChainId),
          receivingChain: chains?.find(c => c.chain_id === Number(t.receivingChainId)),
          receivingAsset: tokens?.find(_t => _t.chain_id === Number(t.receivingChainId) && _t.contract_address === t.receivingAssetId),
        }
      }).map(t => {
        return {
          ...t,
          order: t.chainId === t.receivingChainId ? 1 : 0,
        }
      }) || []), 'id')

      hasMore = where && response?.transactions?.length === size

      if (hasMore) {
        skip += size
      }

      if (data.length >= max_size) {
        hasMore = false
      }

      if (response?.transactions?.length > 0) {
        graphql({ ...params, chain_id, query })
      }
    }
  }

  return { data }
}
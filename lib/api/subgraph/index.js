import _ from 'lodash'

import { getChainTx, getFromAddress } from '../../object/tx'
import { getRequestUrl } from '../../utils'

const _module = 'subgraph'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module }))
  return await res.json()
}

export const graphql = async params => await request(null, params)

export const assetBalances = async params => {
  const size = typeof params?.size === 'number' ? params.size : 1000
  if (typeof params?.size !== 'undefined') {
    delete params.size
  }

  const where = params?.where
  if (typeof params?.where !== 'undefined') {
    delete params.where
  }

  let skip = 0, data, hasMore = true

  while (hasMore) {
    const response = await graphql({ ...params, api_type: 'analytic', query: `
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
    ` })

    data = _.uniqBy(_.concat(data || [], response?.data?.assetBalances?.map(ab => {
      return {
        ...ab,
        contract_address: ab?.assetId,
      }
    })), 'id')

    hasMore = where && response?.data?.assetBalances?.length === size

    if (hasMore) {
      skip += size
    }
  }

  return { data }
}

export const routers = async (params, contracts) => {
  const size = typeof params?.size === 'number' ? params.size : 1000
  if (typeof params?.size !== 'undefined') {
    delete params.size
  }

  const where = params?.where
  if (typeof params?.where !== 'undefined') {
    delete params.where
  }

  let skip = 0, data, hasMore = true

  while (hasMore) {
    const response = await graphql({ ...params, api_type: 'analytic', query: `
      {
        routers {
          id
          assetBalances(orderBy: amount, orderDirection: desc) {
            id
            amount
            assetId
          }
        }
      }
    ` })

    data = _.uniqBy(_.concat(data || [], response?.data?.routers?.map(r => {
      return {
        ...r,
        assetBalances: r?.assetBalances?.map(ab => {
          return {
            ...ab,
            data: contracts?.find(c => c.id?.replace(`${params?.chain_id}-`, '') === ab?.assetId)?.data,
          }
        }),
      }
    })), 'id')

    hasMore = where && response?.data?.routers?.length === size

    if (hasMore) {
      skip += size
    }
  }

  return { data }
}

export const transactions = async (params, chains, contracts, tx_id) => {
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

  let skip = 0, data, hasMore = true

  while (hasMore) {
    const response = await graphql({ ...params, query: `
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
          cancelCaller
          cancelTransactionHash
          cancelMeta
        }
      }
    ` })

    data = _.uniqBy(_.concat(data || [], response?.data?.transactions?.map(t => {
      return {
        ...t,
        chainTx: getChainTx(t),
        chainId: Number(t.chainId),
        preparedTimestamp: Number(t.preparedTimestamp) * 1000,
        expiry: Number(t.expiry) * 1000,
        sendingAddress: getFromAddress(t),
        sendingChainId: Number(t.sendingChainId),
        sendingChain: chains?.find(c => c.chain_id === Number(t.sendingChainId)),
        sendingAsset: contracts?.[`${t.sendingChainId}_${t.sendingAssetId}`],
        receivingChainId: Number(t.receivingChainId),
        receivingChain: chains?.find(c => c.chain_id === Number(t.receivingChainId)),
        receivingAsset: contracts?.[`${t.receivingChainId}_${t.receivingAssetId}`],
      }
    }).map(t => {
      return {
        ...t,
        order: t.chainId === t.receivingChainId ? 1 : 0,
      }
    }) || []), 'id')

    hasMore = where && response?.data?.transactions?.length === size

    if (hasMore) {
      skip += size
    }

    if (data.length >= max_size) {
      hasMore = false
    }
  }

  return { data }
}

export const transactionFromSdk = async (sdk, chain_id, tx_id, chains, contracts) => {
  let data

  if (sdk && tx_id) {
    const query = `
      {
        transactions(orderBy: preparedTimestamp, orderDirection: desc, where: { transactionId: "${tx_id.toLowerCase()}" }) {
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
          cancelCaller
          cancelTransactionHash
          cancelMeta
        }
      }
    `

    const response = await sdk.querySubgraph(chain_id, query)

    data = _.uniqBy(_.concat(data || [], response?.transactions?.map(t => {
      return {
        ...t,
        chainTx: getChainTx(t),
        chainId: Number(t.chainId),
        preparedTimestamp: Number(t.preparedTimestamp) * 1000,
        expiry: Number(t.expiry) * 1000,
        sendingAddress: getFromAddress(t),
        sendingChainId: Number(t.sendingChainId),
        sendingChain: chains?.find(c => c.chain_id === Number(t.sendingChainId)),
        sendingAsset: contracts?.[`${t.sendingChainId}_${t.sendingAssetId}`],
        receivingChainId: Number(t.receivingChainId),
        receivingChain: chains?.find(c => c.chain_id === Number(t.receivingChainId)),
        receivingAsset: contracts?.[`${t.receivingChainId}_${t.receivingAssetId}`],
      }
    }).map(t => {
      return {
        ...t,
        order: t.chainId === t.receivingChainId ? 1 : 0,
      }
    }) || []), 'id')
  }

  return { data }
}

export const user = async (address, params, chains, contracts) => {
  const response = await graphql({ ...params, query: `
    {
      user(id: "${address?.toLowerCase()}") {
        id,
        transactions(orderBy: preparedTimestamp, orderDirection: desc) {
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
          cancelCaller
          cancelTransactionHash
          cancelMeta
        }
      }
    }
  ` })

  return {
    data: response?.data?.user && {
      ...response.data.user,
      transactions: response.data.user.transactions?.map(t => {
        return {
          ...t,
          chainTx: getChainTx(t),
          chainId: Number(t.chainId),
          preparedTimestamp: Number(t.preparedTimestamp) * 1000,
          expiry: Number(t.expiry) * 1000,
          sendingAddress: getFromAddress(t),
          sendingChainId: Number(t.sendingChainId),
          sendingChain: chains?.find(c => c.chain_id === Number(t.sendingChainId)),
          sendingAsset: contracts?.[`${t.sendingChainId}_${t.sendingAssetId}`],
          receivingChainId: Number(t.receivingChainId),
          receivingChain: chains?.find(c => c.chain_id === Number(t.receivingChainId)),
          receivingAsset: contracts?.[`${t.receivingChainId}_${t.receivingAssetId}`],
        }
      }).map(t => {
      return {
        ...t,
        order: t.chainId === t.receivingChainId ? 1 : 0,
      }
    })
    }
  }
}
import _ from 'lodash'

import { networks } from '../../menus'
import { getChainTx, getFromAddress } from '../../object/tx'
import { getRequestUrl } from '../../utils'

const api_name = 'subgraph'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, api_name }))
  return await res.json()
}

export const graphql = async params => {
  const path = ''
  return await request(path, params)
}

export const assetBalances = async params => {
  const response = await graphql({ ...params, query: `
    {
      assetBalances(orderBy: amount, orderDirection: desc) {
        id
        amount
        router {
          id
        }
      }
    }
  ` })

  return {
    data: response?.data?.assetBalances?.map(assetBalance => {
      return {
        ...assetBalance,
        contract_address: assetBalance?.id?.replace(`-${assetBalance.router?.id}`, ''),
      }
    })
  }
}

export const routers = async (params, contracts) => {
  const response = await graphql({ ...params, query: `
    {
      routers {
        id
        assetBalances(orderBy: amount, orderDirection: desc) {
          id
          amount
        }
      }
    }
  ` })

  return {
    data: response?.data?.routers?.map(router => {
      return {
        ...router,
        assetBalances: router?.assetBalances?.map(assetBalance => {
          return {
            ...assetBalance,
            data: contracts?.find(contract => contract.id?.replace(`${params?.chain_id}-`, '') === assetBalance?.id?.replace(`-${router.id}`, ''))?.data,
          }
        }),
      }
    })
  }
}

export const transactions = async (params, contracts, tx_id) => {
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

  let skip = 0

  let data

  let hasMore = true

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

    data = _.uniqBy(_.concat(data || [], response?.data?.transactions?.map(transaction => {
      return {
        ...transaction,
        chainTx: getChainTx(transaction),
        chainId: Number(transaction.chainId),
        preparedTimestamp: Number(transaction.preparedTimestamp) * 1000,
        expiry: Number(transaction.expiry) * 1000,
        sendingAddress: getFromAddress(transaction),
        sendingChainId: Number(transaction.sendingChainId),
        sendingChain: networks.find(network => network.network_id === Number(transaction.sendingChainId)),
        sendingAsset: contracts?.find(contract => contract.id?.replace(`${params?.chain_id}-`, '') === transaction.sendingAssetId)?.data,
        receivingChainId: Number(transaction.receivingChainId),
        receivingChain: networks.find(network => network.network_id === Number(transaction.receivingChainId)),
        receivingAsset: contracts?.find(contract => contract.id?.replace(`${params?.chain_id}-`, '') === transaction.receivingAssetId)?.data,
      }
    }).map(transaction => {
      return {
        ...transaction,
        order: transaction.chainId === transaction.receivingChainId ? 1 : 0,
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

export const user = async (address, params, contracts) => {
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
      transactions: response.data.user.transactions?.map(transaction => {
        return {
          ...transaction,
          chainTx: getChainTx(transaction),
          chainId: Number(transaction.chainId),
          preparedTimestamp: Number(transaction.preparedTimestamp) * 1000,
          expiry: Number(transaction.expiry) * 1000,
          sendingAddress: getFromAddress(transaction),
          sendingChainId: Number(transaction.sendingChainId),
          sendingChain: networks.find(network => network.network_id === Number(transaction.sendingChainId)),
          sendingAsset: contracts?.find(contract => contract.id?.replace(`${params?.chain_id}-`, '') === transaction.sendingAssetId)?.data,
          receivingChainId: Number(transaction.receivingChainId),
          receivingChain: networks.find(network => network.network_id === Number(transaction.receivingChainId)),
          receivingAsset: contracts?.find(contract => contract.id?.replace(`${params?.chain_id}-`, '') === transaction.receivingAssetId)?.data,
        }
      }).map(transaction => {
      return {
        ...transaction,
        order: transaction.chainId === transaction.receivingChainId ? 1 : 0,
      }
    })
    }
  }
}
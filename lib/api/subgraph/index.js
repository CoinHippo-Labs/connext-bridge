import _ from 'lodash'

const request = async (url, params) => {
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

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
      const query = `{
        assetBalances(orderBy: amount, orderDirection: desc, skip: ${skip}, first: ${size}${where ? `, where: ${where}` : ''}) {
          id
          amount
          router {
            id
            isActive
            owner
            recipient
            proposedOwner
            proposedTimestamp
          }
          asset {
            id
            local
            adoptedAsset
            canonicalId
            canonicalDomain
            blockNumber
          }
        }
      }`
      const response = await sdk.querySubgraph(chain_id, query)
      data = _.uniqBy(_.concat(data || [], response?.assetBalances?.map(a => {
        return {
          ...a,
          contract_address: a?.asset?.id,
        }
      }) || []), 'id')

      hasMore = where && response?.assetBalances?.length === size
      if (hasMore) {
        skip += size
      }
    }
  }
  return { data }
}

export const routers = async (sdk, chain_id, params) => {
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
          routers(skip: ${skip}, first: ${size}${where ? `, where: ${where}` : ''}) {
            id
            isActive
            owner
            recipient
            proposedOwner
            proposedTimestamp
            assetBalances(orderBy: amount, orderDirection: desc) {
              id
              amount
              asset {
                id
                local
                adoptedAsset
                canonicalId
                canonicalDomain
                blockNumber
              }
            }
          }
        }
      `
      const response = await sdk.querySubgraph(chain_id, query)
      data = _.uniqBy(_.concat(data || [], response?.routers?.map(r => {
        return {
          ...r,
          assetBalances: r?.assetBalances?.map(a => {
            return {
              ...a,
              contract_address: a?.asset?.id,
            }
          }),
        }
      }) || []), 'id')

      hasMore = where && response?.routers?.length === size
      if (hasMore) {
        skip += size
      }
    }
  }
  return { data }
}

export const transfers = async (sdk, chain_id, transfer_id, params) => {
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
    const direction = typeof params?.direction === 'string' ? params.direction : 'desc'
    if (typeof params?.direction !== 'undefined') {
      delete params.direction
    }
    const start = typeof params?.start === 'number' ? params.start : 0
    if (typeof params?.start !== 'undefined') {
      delete params.start
    }
    let skip = start, hasMore = true

    while (hasMore) {
      const query = `
        {
          transfers(orderBy: xcalledTimestamp, orderDirection: ${direction}, skip: ${skip}, first: ${size}${where ? `, where: ${where}` : transfer_id ? `, where: { transferId: "${transfer_id.toLowerCase()}" }` : ''}) {
            id
            originDomain
            destinationDomain
            chainId
            status
            to
            transferId
            callTo
            callData
            idx
            nonce
            router {
              id
            }
            xcalledTransactingAsset
            xcalledLocalAsset
            xcalledTransactingAmount
            xcalledLocalAmount
            xcalledCaller
            xcalledTransactionHash
            xcalledTimestamp
            xcalledGasPrice
            xcalledGasLimit
            xcalledBlockNumber
            executedCaller
            executedTransactingAmount
            executedLocalAmount
            executedTransactingAsset
            executedLocalAsset
            executedTransactionHash
            executedTimestamp
            executedGasPrice
            executedGasLimit
            executedBlockNumber
            reconciledCaller
            reconciledLocalAsset
            reconciledLocalAmount
            reconciledTransactionHash
            reconciledTimestamp
            reconciledGasPrice
            reconciledGasLimit
            reconciledBlockNumber
          }
        }
      `
      const response = await sdk.querySubgraph(chain_id, query)
      data = _.uniqBy(_.concat(data || [], response?.transfers?.map(t => {
        return {
          ...t,
        }
      }) || []), 'id')

      hasMore = where && response?.transfers?.length === size
      if (hasMore) {
        skip += size
      }
      if (data.length >= max_size) {
        hasMore = false
      }
    }
  }
  return { data }
}
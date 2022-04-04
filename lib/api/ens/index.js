import _ from 'lodash'

import { getRequestUrl } from '../../utils'

const _module = 'ens'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module }))
    .catch(error => { return null })
  return res && await res.json()
}

export const graphql = async params => await request(null, params)

export const domains = async params => {
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
    const body = { ...params, query: `
      {
        domains(skip: ${skip}, first: ${size}${where ? `, where: ${where}` : ''}) {
          id
          name
          labelName
          labelhash
          parent {
            id
            name
          }
          subdomains {
            id
            name
          }
          resolvedAddress {
            id
          }
          resolver {
            id
            address
            addr {
              id
            }
            texts
            coinTypes
          }
          ttl
          isMigrated
        }
      }
    ` }

    let response = await fetch(process.env.NEXT_PUBLIC_ENS_SUBGRAPH_URL, { method: 'POST', body: JSON.stringify(body) })
      .catch(error => { return null })
    if (response) {
      response = await response.json()
    }

    data = _.uniqBy(_.concat(data || [], response?.data?.domains?.map(domain => {
      return {
        ...domain,
      }
    })), 'id')

    hasMore = where && response?.data?.domains?.length === size

    if (hasMore) {
      skip += size
    }
  }

  return { data }
}

export const getENS = async address => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_ENS_REVERSE_RECORDS_URL}/${address}`)
    return await res.json()
  } catch (error) {
    return null
  }
}
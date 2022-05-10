import _ from 'lodash'

import { equals_ignore_case } from '../../utils'

const request = async params => {
  const res = await fetch(process.env.NEXT_PUBLIC_ENS_SUBGRAPH_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

const domains = async params => {
  const size = typeof params?.size === 'number' ? params.size : 1000
  if (typeof params?.size !== 'undefined') {
    delete params.size
  }
  const where = params?.where
  if (typeof params?.where !== 'undefined') {
    delete params.where
  }
  let data, skip = 0, hasMore = true

  while (hasMore) {
    const query = `{
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
    }`
    const response = await request({ query })
    data = _.uniqBy(_.concat(data || [], response?.data?.domains?.map(d => {
      return {
        ...d,
      }
    }) || []), 'id')

    hasMore = where && response?.data?.domains?.length === size
    if (hasMore) {
      skip += size
    }
  }
  return { data }
}

const reverseRecord = async address => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_ENS_REVERSE_RECORDS_URL}/${address}`)
    .catch(error => { return null })
  return res && await res.json()
}

export const ens = async addresses => {
  if (addresses?.length > 0) {
    addresses = _.uniq((Array.isArray(addresses) ? addresses : addresses.split(',')).map(a => a?.trim().toLowerCase()).filter(a => a))
    let domains_data
    const addresses_chunk = _.chunk(addresses, 50)
    for (let i = 0; i < addresses_chunk.length; i++) {
      const response = await domains({ where: `{ resolvedAddress_in: [${addresses_chunk[i].map(a => `"${a}"`).join(',')}] }` })
      domains_data = _.concat(domains_data || [], response?.data || [])
    }

    if (domains_data?.length > 0) {
      const ens_data = {}
      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i]
        const resolved_addresses = domains_data.filter(d => equals_ignore_case(d?.resolvedAddress?.id, address))
        if (resolved_addresses.length > 1) {
          ens_data[address] = await reverseRecord(address)
        }
        else if (resolved_addresses.length < 1) {
          domains_data.push({ resolvedAddress: { id: address } })
        }
      }
      return Object.fromEntries(domains_data.filter(d => !ens_data?.[d?.resolvedAddress?.id?.toLowerCase()]?.reverseRecord || d?.name === ens_data?.[d?.resolvedAddress?.id?.toLowerCase()].reverseRecord).map(d => [d?.resolvedAddress?.id?.toLowerCase(), { ...d }]))
    }
  }
  return null
}

export const domainFromEns = async (ens, ens_data = {}) => {
  let domain
  if (ens) {
    domain = Object.values({ ...ens_data }).find(d => equals_ignore_case(d?.name, ens))
    if (!domain) {
      const response = await domains({ where: `{ name_in: ["${ens.toLowerCase()}"] }` })
      domain = response?.data?.find(d => equals_ignore_case(d?.name, ens))
    }
  }
  return domain
}
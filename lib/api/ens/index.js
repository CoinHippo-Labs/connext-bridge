import _ from 'lodash'

import { toArray, equalsIgnoreCase } from '../../utils'

const request = async params => {
  const response =
    await fetch(
      'https://api.thegraph.com/subgraphs/name/ensdomains/ens',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    )
    .catch(error => {
      return null
    })

  return (
    response &&
    await response.json()
  )
}

const domains = async params => {
  const size =
    typeof params?.size === 'number' ?
      params.size :
      1000

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

    const {
      domains,
    } = { ...response?.data }

    data =
      _.uniqBy(
        toArray(
          _.concat(data, domains)
        ),
        'id',
      )

    hasMore = where && domains?.length === size

    if (hasMore) {
      skip += size
    }
  }

  return {
    data,
  }
}

const reverseRecord = async address => {
  const response =
    await fetch(
      `https://ens.fafrd.workers.dev/ens/${address}`,
    )
    .catch(error => {
      return null
    })

  return (
    response &&
    await response.json()
  )
}

export const ens = async addresses => {
  if (addresses?.length > 0) {
    addresses = _.uniq(toArray(addresses, 'lower'))

    let domains_data

    const addresses_chunk = _.chunk(addresses, 50)

    for (const _addresses of addresses_chunk) {
      const response =
        await domains(
          {
            where:
              `{ resolvedAddress_in: [${
                _addresses
                  .map(a => `"${a}"`)
                  .join(',')
              }] }`,
          }
        )

      const {
        data,
      } = { ...response }

      domains_data = toArray(_.concat(domains_data, data))
    }

    if (domains_data?.length > 0) {
      const ens_data = {}

      for (const address of addresses) {
        const resolved_addresses =
          domains_data
            .filter(d =>
              equalsIgnoreCase(
                d?.resolvedAddress?.id,
                address,
              )
            )

        if (resolved_addresses.length > 1) {
          ens_data[address] = await reverseRecord(address)
        }
        else if (resolved_addresses.length < 1) {
          domains_data.push({ resolvedAddress: { id: address } })
        }
      }

      return (
        Object.fromEntries(
          domains_data
            .filter(d =>
              !ens_data?.[d?.resolvedAddress?.id?.toLowerCase()]?.reverseRecord ||
              equalsIgnoreCase(
                d?.name,
                ens_data[d.resolvedAddress.id.toLowerCase()].reverseRecord,
              )
            )
            .map(d =>
              [
                d?.resolvedAddress?.id?.toLowerCase(),
                { ...d },
              ]
            )
        )
      )
    }
  }

  return null
}

export const domainFromEns = async (
  ens,
  ens_data = {},
) => {
  let domain

  if (ens) {
    domain =
      Object.values({ ...ens_data })
        .find(d =>
          equalsIgnoreCase(
            d?.name,
            ens,
          )
        )

    if (!domain) {
      const response = await domains({ where: `{ name_in: ["${ens.toLowerCase()}"] }` })

      const {
        data,
      } = { ...response }

      domain =
        toArray(data)
          .find(d =>
            equalsIgnoreCase(
              d?.name,
              ens,
            )
          )
    }
  }

  return domain
}
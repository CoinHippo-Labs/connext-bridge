import _ from 'lodash'

import { currency } from '../../object/currency'
import { getRequestUrl } from '../../utils'

const _module = 'covalent'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module }))
  return await res.json()
}

export const contracts = async (chain_id, contract_addresses, params) => {
  const path = `/pricing/historical_by_addresses_v2/${chain_id}/${currency}/${contract_addresses}/`

  let response = contract_addresses && await request(path, params)

  response = { ...response, data: response?.data?.map(contract => { return contract && { ...contract, logo_url: _.uniq(_.concat(contract.logo_url, contract.prices?.map(price => price?.contract_metadata?.logo_url)).filter(url => url)) } }) }

  return response
}

export const balances = async (chain_id, address, params) => {
  const path = `/${chain_id}/address/${address}/balances_v2/`
  return await request(path, params)
}
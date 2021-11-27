import { getRequestUrl } from '../../utils'

const api_name = 'covalent'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, api_name }))
  return await res.json()
}

export const balances = async (chain_id, address, params) => {
  const path = `/${chain_id}/address/${address}/balances_v2/`
  return await request(path, params)
}
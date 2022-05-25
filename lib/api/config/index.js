import base64 from 'base-64'

import mainnet_chains from '../../../config/mainnet/chains.json'
import mainnet_assets from '../../../config/mainnet/assets.json'
import testnet_chains from '../../../config/testnet/chains.json'
import testnet_assets from '../../../config/testnet/assets.json'

const _module = 'bridge'

const request = async (path, params, headers) => {
  params = { ...params, path, module: _module }
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
    headers,
  }).catch(error => { return null })
  return res && await res.json()
}

const is_staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

export const chains = () => (
  process.env.NEXT_PUBLIC_NETWORK === 'testnet' ?
    testnet_chains : mainnet_chains
)?.filter(a => !a?.is_staging || is_staging) || []

export const assets = () => (
  process.env.NEXT_PUBLIC_NETWORK === 'testnet' ?
    testnet_assets : mainnet_assets
)?.filter(a => !a?.is_staging || is_staging).map(a => {
  return {
    ...a,
    contracts: a?.contracts?.filter(c => !c?.is_staging || is_staging),
  }
}) || []

export const announcement = async params => {
  params = { ...params, collection: 'announcement' }
  let data = process.env.NEXT_PUBLIC_ANNOUNCEMENT
  if (!data) {
    const response = await request(null, params)
    if (typeof response === 'string') {
      data = response
    }
  }
  return data
}

export const setAnnouncement = async (params, auth) => {
  params = { ...params, collection: 'announcement' }
  return await request('/set', params, auth && { Authorization: base64.encode(`${auth.username}:${auth.password}`) })
}
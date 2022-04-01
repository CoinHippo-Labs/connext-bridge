import base64 from 'base-64'

import chains_config from '../../../config/chains.json'
import assets_config from '../../../config/assets.json'
import chains_testnet_config from '../../../config/chains_testnet.json'
import assets_testnet_config from '../../../config/assets_testnet.json'

import { getRequestUrl } from '../../utils'

const _module = 'bridge_config'

const request = async (path, params, options) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module }), options)
    .catch(error => { return null })
  return res && await res.json()
}

export const chains = async params => {
  const is_staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  params = { ...params, collection: 'chains', network: process.env.NEXT_PUBLIC_NETWORK }
  const response = process.env.NEXT_PUBLIC_USE_CONFIG === 'connext' ?
    await request(null, params)
    :
    process.env.NEXT_PUBLIC_NETWORK === 'testnet' ?
      chains_testnet_config
      :
      chains_config
  return Array.isArray(response) ? response.filter(a => !a?.is_staging || is_staging) : []
}

export const assets = async params => {
  const is_staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  params = { ...params, collection: 'assets', network: process.env.NEXT_PUBLIC_NETWORK }
  const response = process.env.NEXT_PUBLIC_USE_CONFIG === 'connext' ?
    await request(null, params)
    :
    process.env.NEXT_PUBLIC_NETWORK === 'testnet' ?
      assets_testnet_config
      :
      assets_config
  return Array.isArray(response) ?
    response?.filter(a => !a?.is_staging || is_staging).map(a => {
      return {
        ...a,
        contracts: a?.contracts?.filter(c => !c?.is_staging || is_staging),
      }
    }) : []
}

export const announcement = async params => {
  params = { ...params, collection: 'announcement', network: process.env.NEXT_PUBLIC_NETWORK }
  return process.env.NEXT_PUBLIC_USE_CONFIG !== 'connext' && process.env.NEXT_PUBLIC_ANNOUNCEMENT ?
    process.env.NEXT_PUBLIC_ANNOUNCEMENT
    :
    await request(null, params)
}

export const setAnnouncement = async (params, auth) => {
  params = { ...params, collection: 'announcement', network: process.env.NEXT_PUBLIC_NETWORK }
  return await request('/set', params, auth && { headers: { Authorization: base64.encode(`${auth.username}:${auth.password}`) } })
}
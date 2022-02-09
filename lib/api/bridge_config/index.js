import { getRequestUrl } from '../../utils'

const _module = 'bridge_config'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module }))
    .catch(error => { return null })
  return res && await res.json()
}

export const chains = async params => {
  params = { ...params, collection: 'chains', network: process.env.NEXT_PUBLIC_NETWORK }
  const response = await request(null, params)
  return Array.isArray(response) ? response : []
}

export const assets = async params => {
  const is_staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  params = { ...params, collection: 'assets', network: process.env.NEXT_PUBLIC_NETWORK }
  const response = await request(null, params)
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
  return await request(null, params)
}

export const setAnnouncement = async params => {
  params = { ...params, collection: 'announcement', network: process.env.NEXT_PUBLIC_NETWORK }
  return await request('/set', params)
}
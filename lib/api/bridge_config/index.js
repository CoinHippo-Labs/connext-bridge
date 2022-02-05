import { getRequestUrl } from '../../utils'

const _module = 'bridge_config'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module }))
  return await res.json()
}

export const chains = async params => {
  params = { ...params, collection: 'chains', network: process.env.NEXT_PUBLIC_NETWORK }

  let response = await request(null, params)

  response = (Array.isArray(response) ? response : []).map(c => {
    return {
      ...c,
      image: c.image || `${process.env.NEXT_PUBLIC_EXPLORER_URL}/logos/chains/${process.env.NEXT_PUBLIC_NETWORK}/${c.id}.png`,
      explorer: { ...c.explorer, icon: c.explorer?.icon?.startsWith('/') ? `${process.env.NEXT_PUBLIC_EXPLORER_URL}${c.explorer.icon}` : c.explorer?.icon },
    }
  })

  return response
}

export const assets = async params => {
  params = { ...params, collection: 'assets', network: process.env.NEXT_PUBLIC_NETWORK }

  let response = await request(null, params)

  response = (Array.isArray(response) ? response : []).map(a => {
    return {
      ...a,
      image: a.image || `${process.env.NEXT_PUBLIC_EXPLORER_URL}/logos/assets/${a.id}.png`,
    }
  })

  return response
}

export const announcement = async params => {
  params = { ...params, collection: 'announcement', network: process.env.NEXT_PUBLIC_NETWORK }
  return await request(path, params)
}

export const setAnnouncement = async params => {
  const path = '/set'
  params = { ...params, collection: 'announcement', network: process.env.NEXT_PUBLIC_NETWORK }
  return await request(path, params)
}
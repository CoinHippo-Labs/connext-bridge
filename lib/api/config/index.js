import base64 from 'base-64'

import mainnet_chains from '../../../config/mainnet/chains.json'
import mainnet_assets from '../../../config/mainnet/assets.json'
import testnet_chains from '../../../config/testnet/chains.json'
import testnet_assets from '../../../config/testnet/assets.json'

const _module = 'bridge'

const request = async (
  path,
  params,
  headers,
) => {
  params = {
    ...params,
    path,
    module: _module,
  }

  const response =
    await fetch(
      process.env.NEXT_PUBLIC_API_URL,
      {
        method: 'POST',
        body: JSON.stringify(params),
        headers,
      },
    )
    .catch(error => { return null })

  return response &&
    await response.json()
}

const is_staging =
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' ||
  process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

export const chains = () =>
  (
    (process.env.NEXT_PUBLIC_NETWORK === 'testnet' ?
      testnet_chains :
      mainnet_chains
    ) ||
    []
  )
  .filter(c =>
    !c?.is_staging ||
    is_staging
  )
  .map(c => {
    const {
      hostname,
    } = {
      ...(
        typeof window !== 'undefined' ?
          window.location :
          null
      ),
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL?.includes(hostname)) {
      delete c.rpc_urls
    }

    return {
      ...c,
    }
  })

export const assets = () =>
  (
    (process.env.NEXT_PUBLIC_NETWORK === 'testnet' ?
      testnet_assets :
      mainnet_assets
    ) ||
    []
  )
  .filter(a =>
    !a?.is_staging ||
    is_staging
  )
  .map(a => {
    const {
      contracts,
    } = { ...a }

    return {
      ...a,
      contracts:
        (contracts || [])
          .filter(c =>
            !c?.is_staging ||
            is_staging
          ),
    }
  })

export const announcement = async params => {
  let data = process.env.NEXT_PUBLIC_ANNOUNCEMENT

  if (!data) {
    const response =
      await request(
        null,
        {
          ...params,
          collection: 'announcement',
        },
      )

    if (typeof response?.data === 'string') {
      data = response.data
    }
  }

  return data
}

export const setAnnouncement = async (
  params,
  auth,
) => {
  const {
    username,
    password,
  } = { ...auth }

  await request(
    '/set',
    {
      ...params,
      collection: 'announcement',
    },
    username &&
    password &&
    {
      Authorization:
        base64.encode(
          `${username}:${password}`,
        ),
    },
  )
}
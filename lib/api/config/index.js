import { toArray } from '../../utils'
import mainnet_chains from '../../../config/mainnet/chains.json'
import mainnet_assets from '../../../config/mainnet/assets.json'
import testnet_chains from '../../../config/testnet/chains.json'
import testnet_assets from '../../../config/testnet/assets.json'

const is_staging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' || process.env.NEXT_PUBLIC_APP_URL?.includes('staging')

export const getChains = () =>
  toArray(process.env.NEXT_PUBLIC_NETWORK === 'testnet' ? testnet_chains : mainnet_chains)
    .filter(c => !c?.is_staging || is_staging)
    .map(c => {
      const {
        hostname,
      } = { ...(typeof window !== 'undefined' ? window.location : null) }

      if (!process.env.NEXT_PUBLIC_APP_URL?.includes(hostname)) {
        delete c.rpc_urls
      }

      return {
        ...c,
      }
    })

export const getAssets = () =>
  toArray(process.env.NEXT_PUBLIC_NETWORK === 'testnet' ? testnet_assets : mainnet_assets)
    .filter(a =>
      !a?.is_staging || is_staging
    )
    .map(a => {
      const {
        contracts,
      } = { ...a }

      return {
        ...a,
        contracts: toArray(contracts).filter(c => !c?.is_staging || is_staging),
      }
    })
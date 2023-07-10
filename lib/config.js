import { utils } from 'ethers'
const toBeHex = utils.hexValue

import { toArray, capitalize } from './utils'
import mainnetChains from '../config/mainnet/chains.json'
import mainnetAssets from '../config/mainnet/assets.json'
import testnetChains from '../config/testnet/chains.json'
import testnetAssets from '../config/testnet/assets.json'

export const NETWORK = process.env.NEXT_PUBLIC_NETWORK
export const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT
export const STATUS_MESSAGE = process.env.NEXT_PUBLIC_STATUS_MESSAGE
export const IS_STAGING = ENVIRONMENT === 'staging' || process.env.NEXT_PUBLIC_APP_URL?.includes('staging')
export const WRAPPED_PREFIX = 'next'
export const NATIVE_WRAPPABLE_SYMBOLS = ['ETH', 'MATIC', 'DAI']
export const RELAYER_FEE_ASSET_TYPES = ['transacting', 'native']
export const PERCENT_ROUTER_FEE = 0.05
export const GAS_LIMIT_ADJUSTMENT = NETWORK === 'testnet' ? 1.6 : 1.4
export const DEFAULT_PERCENT_BRIDGE_SLIPPAGE = 3
export const DEFAULT_PERCENT_POOL_SLIPPAGE = 3
export const DEFAULT_PERCENT_SWAP_SLIPPAGE = 3
export const DEFAULT_MINUTES_POOL_TRANSACTION_DEADLINE = 60
export const NUM_STATS_DAYS = 30
export const DEFAULT_DESTINATION_CHAIN = 'arbitrum'
export const MIN_USER_DEPOSITED = 0.000001

export const getChainsData = () => toArray(NETWORK === 'testnet' ? testnetChains : mainnetChains).filter(c => !c.is_staging || IS_STAGING).map(c => {
  const { chain_id, name, rpcs, private_rpcs, native_token, explorer } = { ...c }
  const { url } = { ...explorer }
  const { hostname } = { ...(typeof window !== 'undefined' ? window.location : null) }
  if (!process.env.NEXT_PUBLIC_APP_URL?.includes(hostname)) {
    if (private_rpcs) {
      delete c.private_rpcs
    }
  }
  return {
    ...c,
    provider_params: [{
      chainId: toBeHex(chain_id),
      chainName: `${name}${NETWORK === 'testnet' ? ` ${capitalize(NETWORK)}` : ''}`,
      rpcUrls: toArray(rpcs),
      nativeCurrency: native_token,
      blockExplorerUrls: [url],
    }],
  }
})

export const getAssetsData = () => toArray(NETWORK === 'testnet' ? testnetAssets : mainnetAssets).filter(a => !a.is_staging || IS_STAGING).map(a => {
  const { contracts } = { ...a }
  return {
    ...a,
    contracts: toArray(contracts).filter(c => !c.is_staging || IS_STAGING),
  }
})
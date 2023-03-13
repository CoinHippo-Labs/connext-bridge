import { combineReducers } from 'redux'

import preferences from './preferences'
import chains from './chains'
import assets from './assets'
import pool_assets from './pool-assets'
import gas_tokens_price from './gas-tokens-price'
import ens from './ens'
import router_asset_balances from './router-asset-balances'
import pools from './pools'
import user_pools from './user-pools'
import pools_daily_stats from './pools-daily-stats'
import rpc_providers from './rpc-providers'
import dev from './dev'
import wallet from './wallet'
import balances from './balances'

export default combineReducers(
  {
    preferences,
    chains,
    assets,
    pool_assets,
    gas_tokens_price,
    ens,
    router_asset_balances,
    pools,
    user_pools,
    pools_daily_stats,
    rpc_providers,
    dev,
    wallet,
    balances,
  },
)
import { combineReducers } from 'redux'

import preferences from './preferences'
import chains from './chains'
import assets from './assets'
import pool_assets from './pool-assets'
import ens from './ens'
import asset_balances from './asset-balances'
import pools from './pools'
import user_pools from './user-pools'
import rpc_providers from './rpc-providers'
import dev from './dev'
import wallet from './wallet'
import chain_id from './chain-id'
import balances from './balances'

export default combineReducers(
  {
    preferences,
    chains,
    assets,
    pool_assets,
    ens,
    asset_balances,
    pools,
    user_pools,
    rpc_providers,
    dev,
    wallet,
    chain_id,
    balances,
  },
)
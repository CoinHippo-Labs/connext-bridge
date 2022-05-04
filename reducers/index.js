import { combineReducers } from 'redux'

import preferences from './preferences'
import announcement from './announcement'
import chains from './chains'
import assets from './assets'
import ens from './ens'
import chains_status from './chains-status'
import asset_balances from './asset-balances'
import dev from './dev'
import rpc_providers from './rpc-providers'
import wallet from './wallet'
import chain_id from './chain-id'
import balances from './balances'

export default combineReducers({
  preferences,
  announcement,
  chains,
  assets,
  ens,
  chains_status,
  asset_balances,
  dev,
  rpc_providers,
  wallet,
  chain_id,
  balances,
})
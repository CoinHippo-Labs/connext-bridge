import { combineReducers } from 'redux'

import preferences from './preferences'
import announcement from './announcement'
import chains from './chains'
import assets from './assets'
import ens from './ens'
import chains_status from './chains-status'
import routers_status from './routers-status'
import asset_balances from './asset-balances'
import routers_assets from './routers-assets'
import sdk from './sdk'
import rpcs from './rpcs'
import wallet from './wallet'

import chains_status_sync from './chains-status-sync'
import balances from './balances'
import tokens from './tokens'
import max_transfers from './max-transfers'

export default combineReducers({
  preferences,
  announcement,
  chains,
  assets,
  ens,
  chains_status,
  routers_status,
  asset_balances,
  routers_assets,
  sdk,
  rpcs,
  wallet,

  chains_status_sync,
  balances,
  tokens,
  max_transfers,
})
import { combineReducers } from 'redux'

import preferences from './preferences'
import announcement from './announcement'
import chains from './chains'
import assets from './assets'
import tokens from './tokens'
import ens from './ens'
import chains_status from './chains-status'
import routers_status from './routers-status'
import asset_balances from './asset-balances'
import routers_assets from './routers-assets'
import sdk from './sdk'
import rpcs from './rpcs'
import wallet from './wallet'
import balances from './balances'
import gas_prices from './gas-prices'

export default combineReducers({
  preferences,
  announcement,
  chains,
  assets,
  tokens,
  ens,
  chains_status,
  routers_status,
  asset_balances,
  routers_assets,
  sdk,
  rpcs,
  wallet,
  balances,
  gas_prices,
})
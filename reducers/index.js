import { combineReducers } from 'redux'

import preferences from './preferences'
import chains from './chains'
import assets from './assets'
import chains_status from './chains-status'
import chains_status_sync from './chains-status-sync'
import balances from './balances'
import tokens from './tokens'
import max_transfers from './max-transfers'
import ens from './ens'
import wallet from './wallet'
import sdk from './sdk'
import rpcs from './rpcs'

export default combineReducers({
  preferences,
  chains,
  assets,
  chains_status,
  chains_status_sync,
  balances,
  tokens,
  max_transfers,
  ens,
  wallet,
  sdk,
  rpcs,
})
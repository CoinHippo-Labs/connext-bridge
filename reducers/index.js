import { combineReducers } from 'redux'

import preferences from './preferences'
import chains from './chains'
import assets from './assets'
import chains_status from './chains-status'
import chains_status_sync from './chains-status-sync'
import balances from './balances'
import wallet from './wallet'
import sdk from './sdk'

export default combineReducers({
  preferences,
  chains,
  assets,
  chains_status,
  chains_status_sync,
  balances,
  wallet,
  sdk,
})
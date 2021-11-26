import { combineReducers } from 'redux'

import preferences from './preferences'
import chains from './chains'
import chains_status from './chains-status'
import chains_status_sync from './chains-status-sync'
import wallet from './wallet'

export default combineReducers({
  preferences,
  chains,
  chains_status,
  chains_status_sync,
  wallet,
})
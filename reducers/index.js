import { combineReducers } from 'redux'

import preferences from './preferences'
import chains from './chains'
import wallet from './wallet'

export default combineReducers({
  preferences,
  chains,
  wallet,
})
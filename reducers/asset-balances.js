import { ASSET_BALANCES_DATA } from './types'

export default function data(
  state = {
    [`${ASSET_BALANCES_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case ASSET_BALANCES_DATA:
      return {
        ...state,
        [`${ASSET_BALANCES_DATA}`]: { ...state[`${ASSET_BALANCES_DATA}`], ...action.value },
      }
    default:
      return state
  }
}
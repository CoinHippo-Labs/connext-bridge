import { ROUTER_ASSET_BALANCES_DATA } from './types'

export default (
  state = {
    [ROUTER_ASSET_BALANCES_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case ROUTER_ASSET_BALANCES_DATA:
      return {
        ...state,
        [ROUTER_ASSET_BALANCES_DATA]:
          {
            ...state[ROUTER_ASSET_BALANCES_DATA],
            ...action.value,
          },
      }
    default:
      return state
  }
}
import { ROUTERS_ASSETS_DATA } from './types'

export default function data(
  state = {
    [`${ROUTERS_ASSETS_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case ROUTERS_ASSETS_DATA:
      return {
        ...state,
        [`${ROUTERS_ASSETS_DATA}`]: action.value,
      }
    default:
      return state
  }
}
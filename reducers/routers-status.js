import { ROUTERS_STATUS_DATA } from './types'

export default function data(
  state = {
    [`${ROUTERS_STATUS_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case ROUTERS_STATUS_DATA:
      return {
        ...state,
        [`${ROUTERS_STATUS_DATA}`]: action.value,
      }
    default:
      return state
  }
}
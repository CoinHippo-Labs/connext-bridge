import { ROUTERS_STATUS_DATA, ROUTERS_STATUS_TRIGGER } from './types'

export default function data(
  state = {
    [`${ROUTERS_STATUS_DATA}`]: null,
    [`${ROUTERS_STATUS_TRIGGER}`]: null,
  },
  action
) {
  switch (action.type) {
    case ROUTERS_STATUS_DATA:
      return {
        ...state,
        [`${ROUTERS_STATUS_DATA}`]: action.value,
      }
    case ROUTERS_STATUS_TRIGGER:
      return {
        ...state,
        [`${ROUTERS_STATUS_TRIGGER}`]: action.value,
      }
    default:
      return state
  }
}
import { RPCS_DATA } from './types'

export default function data(
  state = {
    [`${RPCS_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case RPCS_DATA:
      return {
        ...state,
        [`${RPCS_DATA}`]: action.value,
      }
    default:
      return state
  }
}
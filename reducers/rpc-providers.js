import { RPCS } from './types'

export default function data(
  state = {
    [`${RPCS}`]: null,
  },
  action
) {
  switch (action.type) {
    case RPCS:
      return {
        ...state,
        [`${RPCS}`]: action.value,
      }
    default:
      return state
  }
}
import { CHAINS_STATUS_DATA } from './types'

export default function data(
  state = {
    [`${CHAINS_STATUS_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case CHAINS_STATUS_DATA:
      return {
        ...state,
        [`${CHAINS_STATUS_DATA}`]: action.value,
      }
    default:
      return state
  }
}
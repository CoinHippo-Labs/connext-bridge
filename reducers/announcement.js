import { ANNOUNCEMENT_DATA } from './types'

export default function data(
  state = {
    [`${ANNOUNCEMENT_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case ANNOUNCEMENT_DATA:
      return {
        ...state,
        [`${ANNOUNCEMENT_DATA}`]: action.value,
      }
    default:
      return state
  }
}
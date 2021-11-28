import { SDK_DATA } from './types'

export default function data(
  state = {
    [`${SDK_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case SDK_DATA:
      return {
        ...state,
        [`${SDK_DATA}`]: action.value,
      }
    default:
      return state
  }
}
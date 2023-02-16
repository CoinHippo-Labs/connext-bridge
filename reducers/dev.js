import { SDK } from './types'

export default (
  state = {
    [SDK]: null,
  },
  action,
) => {
  switch (action.type) {
    case SDK:
      return {
        ...state,
        [SDK]: action.value,
      }
    default:
      return state
  }
}
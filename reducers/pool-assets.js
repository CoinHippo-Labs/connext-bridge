import { POOL_ASSETS_DATA } from './types'

export default (
  state = {
    [POOL_ASSETS_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case POOL_ASSETS_DATA:
      return {
        ...state,
        [POOL_ASSETS_DATA]: action.value,
      }
    default:
      return state
  }
}
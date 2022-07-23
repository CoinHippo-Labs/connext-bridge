import { POOLS_DATA } from './types'

export default (
  state = {
    [`${POOLS_DATA}`]: null,
  },
  action,
) => {
  switch (action.type) {
    case POOLS_DATA:
      return {
        ...state,
        [`${POOLS_DATA}`]: {
          ...state[`${POOLS_DATA}`],
          ...action.value,
        },
      }
    default:
      return state
  }
}
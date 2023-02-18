import { POOLS_DAILY_STATS_DATA } from './types'

export default (
  state = {
    [POOLS_DAILY_STATS_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case POOLS_DAILY_STATS_DATA:
      return {
        ...state,
        [POOLS_DAILY_STATS_DATA]:
          {
            ...state[POOLS_DAILY_STATS_DATA],
            ...action.value,
          },
      }
    default:
      return state
  }
}
import _ from 'lodash'

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
        [`${POOLS_DATA}`]: _.uniqBy(
          _.concat(
            state[`${POOLS_DATA}`],
            action.value,
          )
          .filter(d => d),
          'id',
        ),
      }
    default:
      return state
  }
}
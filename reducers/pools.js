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
        [`${POOLS_DATA}`]:
          _.uniqBy(
            _.concat(
              action.value,
              state[`${POOLS_DATA}`],
            )
            .filter(d => d),
            'id',
          ),
      }
    default:
      return state
  }
}
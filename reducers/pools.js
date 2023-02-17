import _ from 'lodash'

import { POOLS_DATA } from './types'
import { toArray } from '../lib/utils'

export default (
  state = {
    [POOLS_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case POOLS_DATA:
      return {
        ...state,
        [POOLS_DATA]:
          _.uniqBy(
            toArray(
              _.concat(action.value, state[POOLS_DATA])
            ),
            'id',
          ),
      }
    default:
      return state
  }
}
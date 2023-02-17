import _ from 'lodash'

import { USER_POOLS_DATA } from './types'
import { toArray } from '../lib/utils'

export default (
  state = {
    [USER_POOLS_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case USER_POOLS_DATA:
      const [
        key,
        value,
      ] = (
        toArray(
          _.head(
            Object.entries({ ...action.value })
          )
        )
      )

      if (key && value) {
        let values = state?.[USER_POOLS_DATA]?.[key]

        values =
          _.uniqBy(
            toArray(
              _.concat(value, values)
            ),
            'id',
          )

        action.value = { [key]: values }
      }

      return {
        ...state,
        [USER_POOLS_DATA]:
          action.value &&
          (
            Object.keys(action.value).length < 1 ?
              action.value :
              {
                ...state?.[USER_POOLS_DATA],
                ...action.value,
              }
          ),
      }
    default:
      return state
  }
}
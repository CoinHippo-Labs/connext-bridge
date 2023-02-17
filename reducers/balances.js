import _ from 'lodash'

import { BALANCES_DATA, GET_BALANCES_DATA } from './types'
import { toArray } from '../lib/utils'

export default (
  state = {
    [BALANCES_DATA]: null,
    [GET_BALANCES_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case BALANCES_DATA:
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
        let values = state?.[BALANCES_DATA]?.[key]

        values =
          _.uniqBy(
            toArray(
              _.concat(value, values)
            ),
            'contract_address',
          )

        action.value = { [key]: values }
      }

      return {
        ...state,
        [BALANCES_DATA]:
          action.value &&
          {
            ...state?.[BALANCES_DATA],
            ...action.value,
          },
      }
    case GET_BALANCES_DATA:
      return {
        ...state,
        [GET_BALANCES_DATA]: action.value,
      }
    default:
      return state
  }
}
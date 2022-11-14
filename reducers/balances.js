import _ from 'lodash'

import { BALANCES_DATA } from './types'

export default (
  state = {
    [`${BALANCES_DATA}`]: null,
  },
  action,
) => {
  switch (action.type) {
    case BALANCES_DATA:
      const [
        key,
        value,
      ] = (
        _.head(
          Object.entries({ ...action.value })
        ) ||
        []
      )

      if (
        key &&
        value
      ) {
        let values = state?.[`${BALANCES_DATA}`]?.[key]

        values =
          _.uniqBy(
            _.concat(
              value,
              values,
            )
            .filter(v => v),
            'contract_address',
          )

        action.value = {
          [key]: values,
        }
      }

      return {
        ...state,
        [`${BALANCES_DATA}`]:
          action.value &&
          {
            ...state?.[`${BALANCES_DATA}`], 
            ...action.value,
          },
      }
    default:
      return state
  }
}
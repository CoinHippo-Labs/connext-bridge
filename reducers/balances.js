import _ from 'lodash'

import { BALANCES_DATA } from './types'

export default function data(
  state = {
    [`${BALANCES_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case BALANCES_DATA:
      const [key, value] = _.head(Object.entries({ ...action.value })) || []
      if (key && value) {
        let values = state?.[`${BALANCES_DATA}`]?.[key] || []
        values = _.uniqBy(_.concat(value || [], values), 'contract_address')
        action.value = Object.fromEntries([[key, values]])
      }

      return {
        ...state,
        [`${BALANCES_DATA}`]: action.value && { ...state?.[`${BALANCES_DATA}`], ...action.value },
      }
    default:
      return state
  }
}
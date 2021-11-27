import { BALANCES_DATA } from './types'

export default function data(
  state = {
    [`${BALANCES_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case BALANCES_DATA:
      return {
        ...state,
        [`${BALANCES_DATA}`]: action.value && { ...state?.[`${BALANCES_DATA}`], ...action.value },
      }
    default:
      return state
  }
}
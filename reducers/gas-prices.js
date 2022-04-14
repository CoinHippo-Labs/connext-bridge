import { GAS_PRICES_DATA } from './types'

export default function data(
  state = {
    [`${GAS_PRICES_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case GAS_PRICES_DATA:
      return {
        ...state,
        [`${GAS_PRICES_DATA}`]: { ...state[`${GAS_PRICES_DATA}`], ...action.value },
      }
    default:
      return state
  }
}
import { GAS_TOKENS_PRICE_DATA } from './types'

export default (
  state = {
    [GAS_TOKENS_PRICE_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case GAS_TOKENS_PRICE_DATA:
      return {
        ...state,
        [GAS_TOKENS_PRICE_DATA]: action.value,
      }
    default:
      return state
  }
}
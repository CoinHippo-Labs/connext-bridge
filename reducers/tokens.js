import { TOKENS_DATA } from './types'

export default function data(
  state = {
    [`${TOKENS_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case TOKENS_DATA:
      return {
        ...state,
        [`${TOKENS_DATA}`]: action.value && { ...state?.[`${TOKENS_DATA}`], ...action.value },
      }
    default:
      return state
  }
}
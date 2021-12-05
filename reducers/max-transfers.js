import { MAX_TRANSFERS_DATA } from './types'

export default function data(
  state = {
    [`${MAX_TRANSFERS_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case MAX_TRANSFERS_DATA:
      return {
        ...state,
        [`${MAX_TRANSFERS_DATA}`]: action.value && { ...state?.[`${MAX_TRANSFERS_DATA}`], ...action.value },
      }
    default:
      return state
  }
}
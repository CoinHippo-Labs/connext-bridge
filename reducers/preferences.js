import { THEME, CHAIN_ID } from './types'

export default function data(
  state = {
    [`${THEME}`]: 'dark',
    [`${CHAIN_ID}`]: null,
  },
  action
) {
  switch (action.type) {
    case THEME:
      localStorage.setItem(THEME, action.value)
      return {
        ...state,
        [`${THEME}`]: action.value,
      }
    case CHAIN_ID:
      return {
        ...state,
        [`${CHAIN_ID}`]: action.value,
      }
    default:
      return state
  }
}
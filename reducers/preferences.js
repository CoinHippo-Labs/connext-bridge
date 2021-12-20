import { THEME } from './types'

export default function preferences(
  state = {
    [`${THEME}`]: 'dark',
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
    default:
      return state
  }
}
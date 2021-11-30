import { THEME } from './types'

export default function preferences(
  state = {
    [`${THEME}`]: 'light',
  },
  action
) {
  switch (action.type) {
    case THEME:
      return {
        ...state,
        [`${THEME}`]: action.value,
      }
    default:
      return state
  }
}
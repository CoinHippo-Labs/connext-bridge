import { THEME, PAGE_VISIBLE, TERMS_AGREED, IP_DATA } from './types'

export default (
  state = {
    [THEME]: 'dark',
    [PAGE_VISIBLE]: true,
    [TERMS_AGREED]: null,
    [IP_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case THEME:
      localStorage.setItem(THEME, action.value)
      return {
        ...state,
        [THEME]: action.value,
      }
    case PAGE_VISIBLE:
      return {
        ...state,
        [PAGE_VISIBLE]: action.value,
      }
    case TERMS_AGREED:
      localStorage.setItem(TERMS_AGREED, action.value)
      return {
        ...state,
        [TERMS_AGREED]: action.value,
      }
    case IP_DATA:
      return {
        ...state,
        [IP_DATA]: action.value,
      }
    default:
      return state
  }
}
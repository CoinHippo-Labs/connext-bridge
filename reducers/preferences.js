import { THEME, PAGE_VISIBLE } from './types'

export default (
  state = {
    [`${THEME}`]: 'dark',
    [`${PAGE_VISIBLE}`]: true,
  },
  action,
) => {
  switch (action.type) {
    case THEME:
      localStorage
        .setItem(
          THEME,
          action.value,
        )

      return {
        ...state,
        [`${THEME}`]: action.value,
      }
    case PAGE_VISIBLE:
      return {
        ...state,
        [`${PAGE_VISIBLE}`]: action.value,
      }
    default:
      return state
  }
}
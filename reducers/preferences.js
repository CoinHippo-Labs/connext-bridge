import { THEME, PAGE_VISIBLE, STATUS_MESSAGE, ANNOUNCEMENT } from './types'

export default (
  state = {
    [`${THEME}`]: 'dark',
    [`${PAGE_VISIBLE}`]: true,
    [`${STATUS_MESSAGE}`]:
      process.env.STATUS_MESSAGE ||
      process.env.NEXT_PUBLIC_STATUS_MESSAGE,
    [`${ANNOUNCEMENT}`]:
      process.env.ANNOUNCEMENT ||
      process.env.NEXT_PUBLIC_ANNOUNCEMENT,
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
import { ENS_DATA } from './types'

export default function data(
  state = {
    [`${ENS_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case ENS_DATA:
      return {
        ...state,
        [`${ENS_DATA}`]: { ...state[`${ENS_DATA}`], ...action.value },
      }
    default:
      return state
  }
}
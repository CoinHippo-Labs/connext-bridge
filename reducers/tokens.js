import _ from 'lodash'

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
        [`${TOKENS_DATA}`]: _.uniqBy(_.concat(action.value || [], state[`${TOKENS_DATA}`] || []), 'id'),
      }
    default:
      return state
  }
}
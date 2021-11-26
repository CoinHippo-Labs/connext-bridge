import { CHAINS_STATUS_SYNC_DATA } from './types'

export default function data(
  state = {
    [`${CHAINS_STATUS_SYNC_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case CHAINS_STATUS_SYNC_DATA:
      return {
        ...state,
        [`${CHAINS_STATUS_SYNC_DATA}`]: _.uniqBy(_.concat(action.value || [], state[`${CHAINS_STATUS_SYNC_DATA}`] || []), 'id')
      }
    default:
      return state
  }
}
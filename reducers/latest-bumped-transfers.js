import _ from 'lodash'
import moment from 'moment'

import { LATEST_BUMPED_TRANSFERS_DATA } from './types'
import { toArray, toJson } from '../lib/utils'

export default (
  state = {
    [LATEST_BUMPED_TRANSFERS_DATA]: [],
  },
  action,
) => {
  switch (action.type) {
    case LATEST_BUMPED_TRANSFERS_DATA:
      let latest_bumped_transfers_data

      try {
        latest_bumped_transfers_data = JSON.parse(localStorage.getItem(LATEST_BUMPED_TRANSFERS_DATA))
      } catch (error) {
        latest_bumped_transfers_data = []
      }

      latest_bumped_transfers_data =
        _.uniqBy(
          toArray(_.concat(latest_bumped_transfers_data, toJson(action.value) || { transfer_id: action.value, updated: moment().valueOf() }))
            .filter(t => moment().diff(moment(t.updated), 'minutes', true) <= 5),
          'transfer_id',
        )

      localStorage.setItem(LATEST_BUMPED_TRANSFERS_DATA, JSON.stringify(latest_bumped_transfers_data))

      return {
        ...state,
        [LATEST_BUMPED_TRANSFERS_DATA]: latest_bumped_transfers_data,
      }
    default:
      return state
  }
}
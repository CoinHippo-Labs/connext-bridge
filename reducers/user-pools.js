import _ from 'lodash'

import { USER_POOLS_DATA } from './types'

export default (
  state = {
    [`${USER_POOLS_DATA}`]: null,
  },
  action,
) => {
  switch (action.type) {
    case USER_POOLS_DATA:
      const [
        key,
        value,
      ] = (
        _.head(
          Object.entries({ ...action.value })
        ) ||
        []
      )

      if (
        key &&
        value
      ) {
        let values = state?.[`${USER_POOLS_DATA}`]?.[key]

        values =
          _.uniqBy(
            _.concat(
              value,
              values,
            )
            .filter(v => v),
            'id',
          )

        action.value = {
          [key]: values,
        }
      }

      return {
        ...state,
        [`${USER_POOLS_DATA}`]:
          action.value &&
          (
            Object.keys(action.value)
              .length < 1 ?
              action.value :
              {
                ...state?.[`${USER_POOLS_DATA}`], 
                ...action.value,
              }
          ),
      }
    default:
      return state
  }
}
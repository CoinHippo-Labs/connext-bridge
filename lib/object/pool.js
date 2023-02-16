import _ from 'lodash'

import { equalsIgnoreCase } from '../utils'

export const getPool = (
  id,
  data,
  chainId,
  getHead = false,
  returnAll = false,
) => {
  let pool_data

  if ((id || getHead || returnAll) && Array.isArray(data)) {
    data =
      data
        .filter(d =>
          !chainId ||
          d?.chain_id === chainId
        )

    const matching_fields = d => [d?.id]
    const filter = d =>
      matching_fields(d)
        .findIndex(f =>
          typeof f === 'string' ?
            equalsIgnoreCase(
              f,
              id,
            ) :
            f === id
        ) > -1

    if (returnAll) {
      pool_data = data.filter(d => filter(d))
    }
    else {
      pool_data = data.filter(d => filter(d))
    }

    if (!pool_data && getHead) {
      pool_data = _.head(data)
    }
  }

  return pool_data
}
import _ from 'lodash'

import { split, toArray } from '../utils'

export const getChain = (
  id,
  data,
  notDisabled = false,
  mustHavePools = false,
  getHead = false,
  except = [],
  returnAll = false,
) => {
  let chain_data

  if ((id || getHead || returnAll) && Array.isArray(data)) {
    data =
      data
        .filter(d =>
          (!notDisabled || !d?.disabled) &&
          (!hasPools || !d?.no_pool) &&
          !toArray(except).includes(d?.id)
        )

    const matching_fields = d => [d?.id, d?.chain_name, d?.chain_id, d?.domain_id]
    const filter = d => matching_fields(d).includes(id)

    if (returnAll) {
      chain_data = data.filter(d => filter(d))
    }
    else {
      chain_data = data.find(d => filter(d))
    }

    if (!chain_data && getHead) {
      chain_data = _.head(data)
    }
  }

  return chain_data
}

export const chainName = data =>
  split(data?.name, 'normal', ' ').length < 3 ?
    data?.name :
    data?.short_name
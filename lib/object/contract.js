import _ from 'lodash'

import { equalsIgnoreCase } from '../utils'

export const getContract = (
  id,
  data,
  chainId,
  getHead = false,
  returnAll = false,
) => {
  let contract_data

  if ((id || chainId || getHead || returnAll) && Array.isArray(data)) {
    data =
      data
        .filter(d =>
          !chainId ||
          d?.chain_id === chainId
        )

    const matching_fields = d => [d?.contract_address, d?.chain_id]
    const filter = d =>
      matching_fields(d)
        .findIndex(f =>
          typeof f === 'string' && typeof id === 'string' ?
            equalsIgnoreCase(
              f,
              id,
            ) :
            f === id
        ) > -1 ||
      (returnAll && !id)

    if (returnAll) {
      contract_data = data.filter(d => filter(d))
    }
    else {
      contract_data = data.find(d => filter(d))
    }

    if (!contract_data && getHead) {
      contract_data = _.head(data)
    }
  }

  return contract_data
}
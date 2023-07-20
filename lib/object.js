import _ from 'lodash'

import { split, toArray, equalsIgnoreCase } from './utils'

export const chainName = data => split(data?.name, 'normal', ' ').length < 3 ? data?.name : data?.short_name

export const getChainData = (id, data, options) => {
  let output

  let { not_disabled, must_have_pools, get_head, except, return_all } = { ...options }
  not_disabled = not_disabled === undefined ? false : not_disabled
  must_have_pools = must_have_pools === undefined ? false : must_have_pools
  get_head = get_head === undefined ? false : get_head
  except = except === undefined ? [] : except
  return_all = return_all === undefined ? false : return_all

  const matchingFields = d => [d.id, d.chain_id, d.domain_id]
  const filter = d => matchingFields(d).includes(id) || (return_all && !id)

  if ((id || not_disabled || must_have_pools || get_head || return_all) && Array.isArray(data)) {
    data = toArray(data).filter(d => (!not_disabled || (!d.disabled && !d.disabled_bridge)) && (!must_have_pools || !d.no_pool) && !toArray(except).includes(d.id))
    if (return_all) {
      output = data.filter(d => filter(d))
      if (must_have_pools && output.length < 1) {
        output = data
      }
    }
    else {
      output = data.find(d => filter(d))
    }
    if (!output && get_head) {
      output = _.head(data)
    }
  }

  return output
}

export const getAssetData = (id, data, options) => {
  let output

  let { chain_ids, chain_id, contract_addresses, contract_address, symbols, symbol, not_disabled, get_head, only_pool_asset, return_all } = { ...options }
  chain_ids = chain_ids === undefined ? [] : chain_ids
  chain_id = chain_id === undefined ? undefined : chain_id
  contract_addresses = contract_addresses === undefined ? [] : contract_addresses
  contract_address = contract_address === undefined ? undefined : contract_address
  symbols = symbols === undefined ? [] : symbols
  symbol = symbol === undefined ? undefined : symbol
  not_disabled = not_disabled === undefined ? false : not_disabled
  get_head = get_head === undefined ? false : get_head
  only_pool_asset = only_pool_asset === undefined ? false : only_pool_asset
  return_all = return_all === undefined ? false : return_all

  chain_ids = _.uniq(toArray(_.concat(chain_ids, chain_id)))
  contract_addresses = _.uniq(toArray(_.concat(contract_addresses, contract_address)))
  symbols = _.uniq(toArray(_.concat(symbols, symbol)))

  const matchingFields = d => [d.id, d.symbol]
  const filter = d => matchingFields(d).findIndex(f => typeof f === 'string' && typeof id === 'string' ? equalsIgnoreCase(f, id) : f === id) > -1 || (return_all && !id)
  const filterAddresses = d => toArray(d.contracts).findIndex(c =>
    toArray(chain_ids).findIndex(chain_id => c.chain_id === chain_id) > -1 &&
    toArray(contract_addresses).findIndex(a => toArray([c.contract_address, c.next_asset?.contract_address]).findIndex(_a => equalsIgnoreCase(_a, a)) > -1) > -1
  ) > -1
  const filterSymbols = d => toArray(d.contracts).findIndex(c =>
    toArray(chain_ids).findIndex(chain_id => c.chain_id === chain_id) > -1 &&
    toArray(symbols).findIndex(s => toArray([c.symbol, c.next_asset?.symbol, d.symbol]).findIndex(_s => equalsIgnoreCase(_s, s)) > -1) > -1
  ) > -1
  const filterPool = d => toArray(d.contracts).filter(c => c.is_pool)

  if ((id || toArray(chain_ids).length > 0 || toArray(contract_addresses).length > 0 || toArray(symbols).length > 0 || not_disabled || get_head || only_pool_asset || return_all) && Array.isArray(data)) {
    data = toArray(_.cloneDeep(data))
    data = data.filter(d => (!not_disabled || !d.disabled) && toArray(chain_ids).findIndex(chain_id => toArray(d.contracts).findIndex(c => c.chain_id === chain_id) < 0) < 0)
    data = data.filter(d => toArray(d.contracts).findIndex(c => !only_pool_asset || c.is_pool) > -1)

    if (return_all) {
      output = data.filter(d => filter(d))
      if (output.length < 1 && toArray(contract_addresses).length > 0) {
        output = data.filter(d => filterAddresses(d))
      }
      if (output.length < 1 && toArray(symbols).length > 0) {
        output = data.filter(d => filterSymbols(d))
      }
    }
    else {
      output = data.find(d => filter(d))
      if (!output && toArray(contract_addresses).length > 0) {
        output = data.find(d => filterAddresses(d))
      }
      if (!output && toArray(symbols).length > 0) {
        output = data.find(d => filterSymbols(d))
      }
    }
    if (!output && get_head) {
      output = _.head(data)
    }
    if (output && only_pool_asset) {
      if (Array.isArray(output)) {
        output = output.map(d => { return { ...d, contracts: filterPool(d) } })
      }
      else {
        output.contracts = filterPool(output)
      }
    }
  }

  return output
}

export const getChainContractsData = (chain_id, data) => {
  let output

  if (chain_id && Array.isArray(data)) {
    output = toArray(data).map(d => {
      const { contracts } = { ...d }
      return { ...d, ...getContractData(chain_id, contracts) }
    })
    .filter(d => d.contract_address)
    .map(d => {
      const { next_asset } = { ...d }
      let { contract_address } = { ...d }
      contract_address = contract_address.toLowerCase()
      if (next_asset?.contract_address) {
        next_asset.contract_address = next_asset.contract_address.toLowerCase()
      }
      return { ...d, contract_address, next_asset }
    })
  }

  return output
}

export const getContractData = (id, data, options) => {
  let output

  let { chain_id, get_head, return_all } = { ...options }
  chain_id = chain_id === undefined ? undefined : chain_id
  get_head = get_head === undefined ? false : get_head
  return_all = return_all === undefined ? false : return_all

  const matchingFields = d => [d.contract_address, d.chain_id]
  const filter = d => matchingFields(d).findIndex(f => typeof f === 'string' && typeof id === 'string' ? equalsIgnoreCase(f, id) : f === id) > -1 || (return_all && !id)

  if ((id || chain_id || get_head || return_all) && Array.isArray(data)) {
    data = toArray(data).filter(d => !chain_id || d.chain_id === chain_id)
    if (return_all) {
      output = data.filter(d => filter(d))
    }
    else {
      output = data.find(d => filter(d))
    }
    if (!output && get_head) {
      output = _.head(data)
    }
  }

  return output
}

export const getPoolData = (id, data, options) => {
  let output

  let { chain_id, get_head, return_all } = { ...options }
  chain_id = chain_id === undefined ? undefined : chain_id
  get_head = get_head === undefined ? false : get_head
  return_all = return_all === undefined ? false : return_all

  const matchingFields = d => [d.id]
  const filter = d => matchingFields(d).findIndex(f => typeof f === 'string' && typeof id === 'string' ? equalsIgnoreCase(f, id) : f === id) > -1 || (return_all && !id)

  if ((id || chain_id || get_head || return_all) && Array.isArray(data)) {
    data = toArray(data).filter(d => !chain_id || d.chain_id === chain_id)
    if (return_all) {
      output = data.filter(d => filter(d))
    }
    else {
      output = data.find(d => filter(d))
    }
    if (!output && get_head) {
      output = _.head(data)
    }
  }

  return output
}

export const getBalanceData = (chain_id, address, data) => {
  if (address && Array.isArray(data?.[chain_id])) {
    return toArray(data[chain_id]).find(d => equalsIgnoreCase(d.contract_address, address))
  }
  return null
}
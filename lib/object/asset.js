import _ from 'lodash'

import { getContract } from './contract'
import { toArray, equalsIgnoreCase } from '../utils'

export const getAsset = (
  id,
  data,
  chainIds = [],
  contractAddresses = [],
  symbols = [],
  notDisabled = false,
  getHead = false,
  onlyPoolAsset = false,
  returnAll = false,
) => {
  let asset_data

  if ((id || toArray(chainIds).length > 0 || toArray(contractAddresses).length > 0 || toArray(symbols).length > 0 || notDisabled || getHead || onlyPoolAsset || returnAll) && Array.isArray(data)) {
    data = _.cloneDeep(data)

    data =
      data
        .filter(d =>
          (!notDisabled || !d?.disabled) &&
          toArray(chainIds)
            .findIndex(chain_id =>
              toArray(d?.contracts).findIndex(c => c?.chain_id === chain_id) < 0
            ) < 0
        )

    data =
      data
        .filter(d =>
          toArray(d?.contracts).findIndex(c => !onlyPoolAsset || c?.is_pool) > -1
        )

    const matching_fields = d => [d?.id, d?.symbol]

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

    const filter_addresses = d =>
      toArray(d?.contracts)
        .findIndex(c =>
          toArray(chainIds)
            .findIndex(chain_id =>
              c?.chain_id === chain_id
            ) > -1 &&
          toArray(contractAddresses)
            .findIndex(a =>
              toArray([c?.contract_address, c?.next_asset?.contract_address])
                .findIndex(_a =>
                  equalsIgnoreCase(
                    _a,
                    a,
                  )
                ) > -1
            ) > -1
        ) > -1

    const filter_symbols = d =>
      toArray(d?.contracts)
        .findIndex(c =>
          toArray(chainIds)
            .findIndex(chain_id =>
              c?.chain_id === chain_id
            ) > -1 &&
          toArray(symbols)
            .findIndex(s =>
              toArray([c?.symbol, c?.next_asset?.symbol, d?.symbol])
                .findIndex(_s =>
                  equalsIgnoreCase(
                    _s,
                    s,
                  )
                ) > -1
            ) > -1
        ) > -1

    const filter_non_pool_out = d => toArray(d?.contracts).filter(c => c?.is_pool)

    if (returnAll) {
      asset_data = data.filter(d => filter(d))

      if (asset_data.length < 1 && toArray(contractAddresses).length > 0) {
        asset_data = data.filter(d => filter_addresses(d))
      }

      if (asset_data.length < 1 && toArray(symbols).length > 0) {
        asset_data = data.filter(d => filter_symbols(d))
      }
    }
    else {
      asset_data = data.find(d => filter(d))

      if (!asset_data && toArray(contractAddresses).length > 0) {
        asset_data = data.find(d => filter_addresses(d))
      }

      if (!asset_data && toArray(symbols).length > 0) {
        asset_data = data.find(d => filter_symbols(d))
      }
    }

    if (!asset_data && getHead) {
      asset_data = _.head(data)
    }

    if (asset_data && onlyPoolAsset) {
      if (Array.isArray(asset_data)) {
        asset_data =
          asset_data
            .map(d => {
              return {
                ...d,
                contracts: filter_non_pool_out(d),
              }
            })
      }
      else {
        asset_data.contracts = filter_non_pool_out(asset_data)
      }
    }
  }

  return asset_data
}

export const getChainContracts = (
  chainId,
  data,
) => {
  let contracts_data

  if (chainId && Array.isArray(data)) {
    contracts_data =
      data
        .map(d => {
          const {
            contracts,
          } = { ...d }

          return {
            ...d,
            ...getContract(chainId, contracts),
          }
        })
        .filter(d => d.contract_address)
        .map(a => {
          const {
            next_asset,
          } = { ...a }
          let {
            contract_address,
          } = { ...a }

          contract_address = contract_address.toLowerCase()

          if (next_asset?.contract_address) {
            next_asset.contract_address = next_asset.contract_address.toLowerCase()
          }

          return {
            ...a,
            contract_address,
            next_asset,
          }
        })
  }

  return contracts_data
}
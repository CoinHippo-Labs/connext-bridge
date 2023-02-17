import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { constants } from 'ethers'

import DecimalsFormat from '../../decimals-format'
import Image from '../../image'
import { getChain } from '../../../lib/object/chain'
import { getContract } from '../../../lib/object/contract'
import { getBalance } from '../../../lib/object/balance'
import { split, toArray, name, equalsIgnoreCase } from '../../../lib/utils'

const WRAPPED_PREFIX = process.env.NEXT_PUBLIC_WRAPPED_PREFIX

export default (
  {
    value,
    inputSearch,
    onSelect,
    chain,
    isBridge = false,
    isPool = false,
    showNextAssets = false,
    showNativeAssets = false,
    showOnlyWrapable = false,
    data,
  },
) => {
  const {
    chains,
    assets,
    pool_assets,
    pools,
    balances,
  } = useSelector(
    state => (
      {
        chains: state.chains,
        assets: state.assets,
        pool_assets: state.pool_assets,
        pools: state.pools,
        balances: state.balances,
      }
    ),
    shallowEqual,
  )
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    pool_assets_data,
  } = { ...pool_assets }
  const {
    pools_data,
  } = { ...pools }
  const {
    balances_data,
  } = { ...balances }

  const chain_data = getChain(chain, chains_data)

  const {
    chain_id,
    domain_id,
  } = { ...chain_data }

  const _assets_data =
    (
      isPool ?
        toArray(
          _.concat(
            pool_assets_data,
            data &&
            toArray(pools_data)
              .filter(p =>
                equalsIgnoreCase(
                  p?.domainId,
                  domain_id,
                )
              )
              .map(p => {
                const {
                  asset_data,
                  contract_data,
                  adopted,
                  local,
                } = { ...p }

                const {
                  contracts,
                } = { ...asset_data }

                const {
                  contract_address,
                  image,
                } = { ...contract_data }

                const _contracts =
                  _.cloneDeep(contracts)
                    .map(c => {
                      if (getContract(contract_address, contracts)) {
                        const pool_token =
                          adopted?.address && !equalsIgnoreCase(adopted.address, contract_address) ?
                            adopted :
                            local?.address && !equalsIgnoreCase(local.address, contract_address) ?
                              local :
                              null

                        if (pool_token) {
                          const {
                            address,
                            symbol,
                            decimals,
                          } = { ...pool_token }

                          const image_paths = split(image, 'normal', '/')
                          const image_name = _.last(image_paths)

                          return {
                            contract_address: address,
                            chain_id,
                            decimals,
                            symbol,
                            image:
                              image ?
                                !symbol ?
                                  image :
                                  symbol.startsWith(WRAPPED_PREFIX) ?
                                    !image_name.startsWith(WRAPPED_PREFIX) ?
                                      image_paths.map((s, i) => i === image_paths.length - 1 ? `${WRAPPED_PREFIX}${s}` : s).join('/') :
                                      image :
                                    !image_name.startsWith(WRAPPED_PREFIX) ?
                                      image :
                                      image_paths.map((s, i) => i === image_paths.length - 1 ? s.substring(WRAPPED_PREFIX.length) : s).join('/') :
                                undefined,
                          }
                        }
                      }

                      return c
                    })

                return {
                  ...asset_data,
                  contracts: _contracts,
                }
              }),
          )
        ) :
        assets_data
    )
    .filter(a => !a.disabled)

  const assets_data_sorted =
    _.orderBy(
      toArray(_assets_data)
        .filter(a => !inputSearch || a)
        .flatMap(a => {
          const {
            symbol,
            image,
            contracts,
          } = { ...a }

          const contract_data = getContract(chain_id, contracts)

          const {
            next_asset,
            wrapable,
          } = { ...contract_data }

          const contracts_data =
            toArray(
              _.concat(
                wrapable && isBridge && (showNativeAssets || showOnlyWrapable) &&
                {
                  ...contract_data,
                  contract_address: constants.AddressZero,
                  symbol,
                  image,
                },
                (!showOnlyWrapable || wrapable) &&
                {
                  ...contract_data,
                },
                next_asset && isBridge && showNextAssets &&
                {
                  ...contract_data,
                  ...next_asset,
                  is_next_asset: true,
                },
              )
            )

          return (
            contracts_data
              .map(c => {
                const {
                  is_next_asset,
                } = { ...c }

                const _contracts =
                  _.cloneDeep(contracts)
                    .map(_c =>
                      getContract(chain_id, contracts) ? c : _c
                    )

                return {
                  ...a,
                  is_next_asset,
                  contracts: _contracts,
                  scores:
                    toArray(
                      _.concat(
                        ['symbol', 'name', 'id']
                          .map(f =>
                            split(a[f], 'lower', ' ').join(' ').startsWith(inputSearch.toLowerCase()) ?
                              inputSearch.length > 1 ?
                                inputSearch.length / a[f].length :
                                inputSearch.length > 0 ? .1 : .5 :
                              -1
                          ),
                        c &&
                        ['symbol', 'name']
                          .map(f =>
                            split(c[f], 'lower', ' ').join(' ').startsWith(inputSearch.toLowerCase()) ?
                              inputSearch.length > 1 ?
                                inputSearch.length / c[f].length :
                                inputSearch.length > 0 ? .1 : .5 :
                              -1
                          ),
                      )
                    ),
                }
              })
          )
        })
        .map(a => {
          const {
            is_next_asset,
            group,
            scores,
          } = { ...a }

          return {
            ...a,
            group: group || (is_next_asset ? 'NextAssets' : ''),
            max_score: _.max(scores),
          }
        })
        .filter(a =>
          a.max_score > 1 / 10
        ),
      [
        'group',
        'max_score',
      ],
      [
        'asc',
        'desc',
      ],
    )

  const preset_assets_data = _.uniqBy(toArray(_assets_data).filter(a => a.preset), 'id')

  return (
    <div>
      {
        preset_assets_data.length > 0 && !showOnlyWrapable &&
        (
          <div className="flex flex-wrap items-center mt-1 mb-4">
            {preset_assets_data
              .map((a, i) => (
                <div
                  key={i}
                  onClick={
                    () => {
                      const {
                        id,
                        contracts,
                      } = { ...a }

                      const contract_data =
                        getContract(chain_id, contracts, chain_id, false, true)
                          .find(c =>
                            c.wrapable || c.contract_address
                          )

                      const {
                        wrapable,
                      } = { ...contract_data }
                      let {
                        contract_address,
                        symbol,
                      } = { ...contract_data }

                      contract_address = wrapable ? constants.AddressZero : contract_address
                      symbol = wrapable ? a.symbol : symbol

                      onSelect(id, isBridge ? symbol : contract_address)
                    }
                  }
                  className="hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded cursor-pointer flex items-center hover:font-semibold space-x-1 mr-1.5 py-1 px-1.5"
                >
                  {
                    a.image &&
                    (
                      <Image
                        src={a.image}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    )
                  }
                  <span className={`whitespace-nowrap ${a.id === value ? 'font-bold' : ''}`}>
                    {a.symbol || a.name}
                  </span>
                </div>
              ))
            }
          </div>
        )
      }
      <div className="max-h-96 overflow-y-scroll">
        {assets_data_sorted
          .map((a, i) => {
            const {
              id,
              disabled,
              contracts,
              group,
            } = { ...a }

            const contract_data = getContract(chain_id, contracts)

            const {
              contract_address,
            } = { ...contract_data }
            let {
              symbol,
              image,
            } = { ...contract_data }

            const selected =
              data?.contract_address ?
                equalsIgnoreCase(
                  contract_address,
                  data?.contract_address,
                ) :
                id === value

            symbol = symbol || a?.symbol || a?.name
            image = image || a?.image

            const header =
              group &&
              !equalsIgnoreCase(
                group,
                assets_data_sorted[i - 1]?.group,
              ) &&
              (
                <div className={`text-slate-400 dark:text-slate-500 text-xs mt-${i === 0 ? 0.5 : 3} mb-2 ml-2`}>
                  {name(group)}
                </div>
              )

            const item = (
              <div className="flex items-center space-x-2">
                {
                  image &&
                  (
                    <Image
                      src={image}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )
                }
                <span className={`whitespace-nowrap text-base ${selected ? 'font-bold' : 'font-medium'}`}>
                  {symbol}
                </span>
              </div>
            )

            let {
              amount,
            } = { ...getBalance(chain_id, contract_address, balances_data) }

            amount =
              ['string', 'number'].includes(typeof amount) && !isNaN(amount) ?
                amount :
                null

            const balance =
              balances_data?.[chain_id] &&
              (
                <div className={`${chain_id && !amount ? 'text-slate-400 dark:text-slate-500' : ''} ${selected ? 'font-semibold' : 'font-medium'} ml-auto`}>
                  {['string', 'number'].includes(typeof amount) && !isNaN(amount) ?
                    <DecimalsFormat
                      value={amount}
                      className="whitespace-nowrap"
                    /> :
                    'n/a'
                  }
                </div>
              )

            const className =
              `dropdown-item ${
                disabled ?
                  'cursor-not-allowed' :
                  selected ?
                    'bg-slate-100 dark:bg-slate-800 cursor-pointer' :
                    'hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'
              } rounded flex items-center justify-between space-x-2 my-1 p-2`

            return (
              <div key={i}>
                {header}
                {disabled ?
                  <div
                    title="Disabled"
                    className={className}
                  >
                    {item}
                    {balance}
                  </div> :
                  <div
                    onClick={() => onSelect(id, isBridge ? symbol : contract_address)}
                    className={className}
                  >
                    {item}
                    {balance}
                  </div>
                }
              </div>
            )
          })
        }
      </div>
    </div>
  )
}
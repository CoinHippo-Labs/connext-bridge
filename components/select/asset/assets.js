import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { constants } from 'ethers'

import Image from '../../image'
import { number_format, name, equals_ignore_case } from '../../../lib/utils'

const WRAPPED_PREFIX =
  process.env.NEXT_PUBLIC_WRAPPED_PREFIX ||
  'next'

export default (
  {
    value,
    inputSearch,
    onSelect,
    chain,
    is_pool = false,
    is_bridge = false,
    show_next_assets = false,
    show_native_assets = false,
    data,
  },
) => {
  const {
    chains,
    assets,
    pool_assets,
    pools,
    balances,
  } = useSelector(state =>
    (
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

  const chain_data = (chains_data || [])
    .find(c =>
      c?.id === chain
    )

  const {
    chain_id,
    domain_id,
  } = { ...chain_data }

  const _assets_data =
    (
      is_pool ?
        _.concat(
          pool_assets_data,
          data ?
            (pools_data || [])
              .filter(p =>
                equals_ignore_case(
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

                const _contracts = _.cloneDeep(contracts)

                const contract_index = (contracts || [])
                  .findIndex(c =>
                    equals_ignore_case(
                      c?.contract_address,
                      contract_address,
                    )
                  )

                if (contract_index > -1) {
                  const pool_token =
                    adopted?.address &&
                    !equals_ignore_case(
                      adopted.address,
                      contract_address,
                    ) ?
                      local :
                      local?.address &&
                      !equals_ignore_case(
                        local.address,
                        contract_address,
                      ) ?
                        local :
                        null

                  if (pool_token) {
                    const {
                      address,
                      symbol,
                      decimals,
                    } = { ...pool_token }

                    const image_paths =
                      (image || '')
                        .split('/')

                    const image_name = _.last(image_paths)

                    _contracts[contract_index] = {
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
                                image_paths
                                  .map((s, i) =>
                                    i === image_paths.length - 1 ?
                                      `${WRAPPED_PREFIX}${s}` :
                                      s
                                  )
                                  .join('/') :
                                image :
                              !image_name.startsWith(WRAPPED_PREFIX) ?
                                image :
                                image_paths
                                  .map((s, i) =>
                                    i === image_paths.length - 1 ?
                                      s
                                        .substring(
                                          WRAPPED_PREFIX.length,
                                        ) :
                                      s
                                  )
                                  .join('/') :
                          undefined,
                    }
                  }
                }

                return {
                  ...asset_data,
                  contracts: _contracts,
                }
              }) :
            [],
        ) :
        assets_data
    )
    .filter(a =>
      !a?.disabled
    )

  const assets_data_sorted =
    _.orderBy(
      (_assets_data || [])
        .filter(a =>
          !inputSearch ||
          a
        )
        .flatMap(a => {
          const {
            symbol,
            image,
            contracts,
          } = { ...a }

          const contract_data = (contracts || [])
            .find(c =>
              c?.chain_id === chain_id
            )

          const {
            next_asset,
            wrapable,
          } = { ...contract_data }

          const _contracts_data =
            _.concat(
              is_bridge &&
              wrapable &&
              show_native_assets &&
              {
                ...contract_data,
                contract_address: constants.AddressZero,
                symbol,
                image,
              },
              {
                ...contract_data,
              },
              is_bridge &&
              show_next_assets &&
              next_asset &&
              {
                ...contract_data,
                ...next_asset,
              },

            )
            .filter(c => c)

          return (
            _contracts_data
              .map(c => {
                const _contracts = _.cloneDeep(contracts)

                const contract_index = (_contracts || [])
                  .findIndex(_c =>
                    _c?.chain_id === chain_id
                  )

                if (contract_index > -1) {
                  _contracts[contract_index] = c
                }

                return {
                  ...a,
                  contracts: _contracts,
                  scores:
                    _.concat(
                      [
                        'symbol',
                        'name',
                        'id',
                      ]
                      .map(f =>
                        (a[f] || '')
                          .toLowerCase()
                          .startsWith(
                            inputSearch
                              .toLowerCase()
                          ) ?
                            inputSearch.length > 1 ?
                              (
                                inputSearch.length /
                                a[f].length
                              ) :
                              inputSearch.length > 0 ?
                                .1 :
                                .5 :
                            -1
                      ),
                      c ?
                        [
                          'symbol',
                          'name',
                        ]
                        .map(f =>
                          (c[f] || '')
                            .toLowerCase()
                            .startsWith(
                              inputSearch
                                .toLowerCase()
                            ) ?
                              inputSearch.length > 1 ?
                                (
                                  inputSearch.length /
                                  c[f].length
                                ) :
                                inputSearch.length > 0 ?
                                  .1 :
                                  .5 :
                              -1
                        ) :
                        [],
                    ),
                }
              })
          )
        })
        .map(a => {
          const {
            group,
            scores,
          } = { ...a }

          return {
            ...a,
            group:
              group ||
              '',
            max_score:
              _.max(
                scores,
              ),
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

  const preset_assets_data =
    _.uniqBy(
      (_assets_data || [])
        .filter(a =>
          a?.preset
        ),
      'id',
    )

  return (
    <div>
      {
        preset_assets_data.length > 0 &&
        (
          <div className="flex flex-wrap items-center mb-2">
            {
              preset_assets_data
                .map((a, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const {
                        id,
                        contracts,
                      } = { ...a }

                      const contract_data = (contracts || [])
                        .find(c =>
                          c?.chain_id === chain_id &&
                          (
                            c?.wrapable ||
                            c?.contract_address
                          )
                        )

                      const {
                        wrapable,
                      } = { ...contract_data }
                      let {
                        contract_address,
                        symbol,
                      } = { ...contract_data }

                      contract_address =
                        wrapable ?
                          constants.AddressZero :
                          contract_address

                      symbol =
                        wrapable ?
                          a.symbol :
                          symbol

                      onSelect(
                        id,
                        is_bridge ?
                          symbol :
                          contract_address,
                      )
                    }}
                    className="hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded cursor-pointer flex items-center hover:font-semibold space-x-1 mr-1.5 py-1 px-1.5"
                  >
                    {
                      a.image &&
                      (
                        <Image
                          src={a.image}
                          alt=""
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      )
                    }
                    <span className={`whitespace-nowrap ${a.id === value ? 'font-bold' : ''}`}>
                      {
                        a.symbol ||
                        a.name
                      }
                    </span>
                  </div>
                ))
            }
          </div>
        )
      }
      <div className="max-h-96 overflow-y-scroll">
        {
          assets_data_sorted
            .map((a, i) => {
              const {
                id,
                disabled,
                contracts,
                group,
              } = { ...a }

              const contract_data = (contracts || [])
                .find(c =>
                  c?.chain_id === chain_id
                )

              const {
                contract_address,
              } = { ...contract_data }
              let {
                symbol,
                image,
              } = { ...contract_data }

              const selected =
                data?.contract_address ?
                  equals_ignore_case(
                    contract_address,
                    data?.contract_address,
                  ) :
                  id === value

              symbol =
                symbol ||
                a?.symbol ||
                a?.name

              image =
                image ||
                a?.image

              const header =
                group &&
                !equals_ignore_case(
                  group,
                  assets_data_sorted[i - 1]?.group,
                ) &&
                (
                  <div className="text-slate-400 dark:text-slate-500 text-xs my-1 ml-2">
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
                        alt=""
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

              const balance = (balances_data?.[chain_id] || [])
                .find(b =>
                  equals_ignore_case(
                    b?.contract_address,
                    contract_address,
                  )
                )

              let {
                amount,
              } = { ...balance }

              amount =
                [
                  'string',
                  'number',
                ].includes(typeof amount) &&
                !isNaN(amount) ?
                  amount :
                  null

              const balanceComponent =
                balances_data?.[chain_id] &&
                (
                  <div className={`${chain_id && !amount ? 'text-slate-400 dark:text-slate-500' : ''} ${selected ? 'font-semibold' : 'font-medium'} ml-auto`}>
                    {
                      [
                        'string',
                        'number',
                      ].includes(typeof amount) &&
                      !isNaN(amount) ?
                        number_format(
                          amount,
                          Number(amount) > 10000 ?
                            '0,0' :
                            Number(amount) > 1000 ?
                              '0,0.00' :
                              '0,0.000000',
                          true,
                        ) :
                        'n/a'
                    }
                  </div>
                )

              const className = `dropdown-item ${disabled ? 'cursor-not-allowed' : selected ? 'bg-slate-100 dark:bg-slate-800 cursor-pointer' : 'hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'} rounded flex items-center justify-between space-x-2 p-2`

              return (
                <div key={i}>
                  {header}
                  {disabled ?
                    <div
                      title="Disabled"
                      className={className}
                    >
                      {item}
                      {balanceComponent}
                    </div> :
                    <div
                      onClick={() =>
                        onSelect(
                          id,
                          is_bridge ?
                            symbol :
                            contract_address,
                        )
                      }
                      className={className}
                    >
                      {item}
                      {balanceComponent}
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
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { utils } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from 'react-icons/md'

import Datatable from '../datatable'
import Image from '../image'
import { chainName } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, equals_ignore_case, loader_color } from '../../lib/utils'

export default ({
  view,
  user_pools_data,
}) => {
  const {
    preferences,
    assets,
    pools,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        assets: state.assets,
        pools: state.pools,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    assets_data,
  } = { ...assets }
  const {
    pools_data,
  } = { ...pools }

  const [uncollapseAssetIds, setUncollapseAssetIds] = useState(null)

  useEffect(() => {
    if (
      pools_data &&
      !uncollapseAssetIds
    ) {
      const ids = pools_data
        .map(p => p?.asset_data?.id)
        .filter(id => id)

      setUncollapseAssetIds(ids)
    }
  }, [pools_data])

  const data =
    view === 'my_positions' ?
      user_pools_data ?
        user_pools_data
          .map(p => {
            const {
              id,
              lpTokenBalance,
            } = { ...p }
            let {
              share,
            } = { ...p }

            const pool_data = (pools_data || [])
              .find(_p =>
                _p?.id === id
              )
            const {
              liquidity,
            } = { ...pool_data }

            share =
              lpTokenBalance * 100 /
              (
                Number(liquidity) ||
                1
              )

            return {
              ...p,
              share,
            }
          }) :
          null :
      pools_data ?
        Object.entries(
          _.groupBy(
            pools_data,
            'asset_data.id',
          )
        )
        .map(([k, v]) => {
          return {
            id: k,
            asset_data: _.head(v)?.asset_data,
            pools:
              _.orderBy(
                v,
                ['liquidity'],
                ['desc'],
              ),
          }
        }) :
        null

const is_staging =
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' ||
  process.env.NEXT_PUBLIC_SITE_URL?.includes('staging') ||
  process.env.NEXT_PUBLIC_SITE_URL?.includes('cloudfront')

  return (
    data ?
      <div className="grid my-4 sm:my-6">
        {view === 'pools' && is_staging ?
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {
              data
                .flatMap(d => {
                  const {
                    pools,
                  } = { ...d }

                  return (
                    (pools || [])
                      .map(p => {
                        return {
                          ...p,
                        }
                      })
                  )
                })
                .map((d, i) => {
                  const {
                    chain_data,
                    contract_data,
                    name,
                    tokens,
                    symbols,
                    balances,
                    decimals,
                    apy,
                    rate,
                  } = { ...d }
                  let {
                    asset_data,
                  } = { ...d }

                  const {
                    contract_address,
                    next_asset,
                  } = { ...contract_data }

                  asset_data =
                    (assets_data || [])
                      .find(a =>
                        a?.id === asset_data?.id
                      ) ||
                    asset_data

                  const {
                    price,
                  } = { ...asset_data }

                  const chain = chain_data?.id
                  const asset = asset_data?.id

                  const images =
                    (tokens || [])
                      .map(a =>
                        (
                          equals_ignore_case(
                            a,
                            contract_address,
                          ) ?
                            contract_data?.image :
                            equals_ignore_case(
                              a,
                              next_asset?.contract_address,
                            ) ?
                              next_asset?.contract_data?.image ||
                              contract_data?.image :
                              null
                        ) ||
                        asset_data?.image
                      )

                  const _balances =
                    (balances || [])
                      .map((b, i) =>
                        utils.formatUnits(
                          b,
                          decimals?.[i] ||
                          18,
                        )
                      )

                  const pair_balances =
                    _balances
                      .map((b, i) =>
                        [
                          symbols?.[i],
                          number_format(
                            b,
                            b > 1000 ?
                              '0,0.00a' :
                              b > 1 ?
                                '0,0.00' :
                                '0,0.000000000000',
                          ),
                        ]
                        .filter(s =>
                          typeof s === 'string'
                        )
                        .join(':\t')
                      )
                      .join('\n')

                  const tvl =
                    typeof price === 'number' ?
                      _.sum(
                        _balances
                          .map((b, i) =>
                            b /
                            (
                              i > 0 &&
                              rate > 0 ?
                                rate :
                                1
                            )
                          )
                      ) *
                      price :
                      pair_balances

                  return (
                    <Link
                      key={i}
                      href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                    >
                    <a
                      className="hover:bg-white dark:hover:bg-gray-900 rounded border dark:border-slate-800 space-y-12 p-5"
                    >
                      <div className="flex items-center space-x-3">
                        {
                          chain_data?.image &&
                          (
                            <Image
                              src={chain_data.image}
                              alt=""
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          )
                        }
                        <span className="text-lg font-bold">
                          <span className="mr-1">
                            {chainName(chain_data)}
                          </span>
                          <span>
                            {
                              (name || '')
                                .split('-')
                                .join(' ')
                            }
                          </span>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
                        <div className="flex flex-col space-y-1">
                          <span className="text-slate-400 dark:text-slate-500 font-medium">
                            Assets
                          </span>
                          <div className="h-7 flex items-center">
                            {
                              images
                                .map((image, i) => (
                                  <div
                                    key={i}
                                    className={`flex items-center ${i > 0 ? '-ml-1' : ''}`}
                                  >
                                    <Tooltip
                                      placement="top"
                                      content={symbols?.[i]}
                                      className="z-50 bg-black text-white text-xs"
                                    >
                                      <div className="flex items-center">
                                        <Image
                                          src={image}
                                          alt=""
                                          width={20}
                                          height={20}
                                          className="rounded-full"
                                        />
                                      </div>
                                    </Tooltip>
                                  </div>
                                ))
                            }
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className="text-slate-400 dark:text-slate-500 font-medium">
                            TVL
                          </span>
                          <span className="text-lg font-semibold">
                            {typeof tvl === 'number' ?
                              <Tooltip
                                placement="top"
                                content={pair_balances}
                                className="z-50 bg-black whitespace-pre-wrap text-white text-xs"
                              >
                                <span>
                                  {currency_symbol}
                                  {number_format(
                                    tvl,
                                    tvl > 1000 ?
                                      '0,0.00a' :
                                      tvl > 1 ?
                                        '0,0.00' :
                                        '0,0.000000000000',
                                  )}
                                </span>
                              </Tooltip> :
                              tvl ||
                              '-'
                            }
                          </span>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className="text-slate-400 dark:text-slate-500 font-medium">
                            APY
                          </span>
                          <span className="text-lg font-semibold">
                            {!isNaN(apy?.total) ?
                              <Tooltip
                                placement="top"
                                content={
                                  Object.entries({ ...apy })
                                    .map(([k, v]) => (
                                      <div
                                        key={k}
                                        className="flex items-center justify-between space-x-1"
                                      >
                                        <span className="capitalize">
                                          {k}:
                                        </span>
                                        <span>
                                          {!isNaN(v) ?
                                            <>
                                              {number_format(
                                                v,
                                                '0,0.00',
                                                true,
                                              )}
                                              %
                                            </> :
                                            '-'
                                          }
                                        </span>
                                      </div>
                                    ))
                                }
                                className="z-50 bg-black whitespace-pre-wrap text-white text-xs"
                              >
                                <span>
                                  {number_format(
                                    apy.total,
                                    '0,0.00',
                                    true,
                                  )}
                                  %
                                </span>
                              </Tooltip> :
                              '-'
                            }
                          </span>
                        </div>
                      </div>
                    </a>
                    </Link>
                  )
                })
            }
          </div> :
          <Datatable
            columns={[
              {
                Header: 'Token',
                accessor: 'asset_data',
                disableSortBy: true,
                Cell: props => {
                  const {
                    id,
                    pools,
                    chain_data,
                    asset_data,
                    contract_data,
                  } = { ...props.row.original }
                  let {
                    name,
                  } = { ...props.row.original }
                  const {
                    image,
                    symbol,
                  } = { ...props.value }

                  const _symbol =
                    view === 'my_positions' ?
                      contract_data?.symbol ||
                      symbol :
                      symbol

                  name =
                    name ||
                    _symbol

                  const chain = chain_data?.id
                  const asset = asset_data?.id

                  return (
                    <div className="flex flex-col space-y-3">
                      {view === 'my_positions' ?
                        <Link
                          href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                        >
                        <a
                          className="h-6 flex items-center font-semibold"
                        >
                          {name}
                        </a>
                        </Link> :
                        <>
                          <div className="flex items-center space-x-2">
                            {
                              image &&
                              (
                                <Image
                                  src={image}
                                  alt=""
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              )
                            }
                            <span className="text-slate-600 dark:text-slate-400 text-base font-medium">
                              {_symbol}
                            </span>
                          </div>
                          {
                            uncollapseAssetIds?.includes(id) &&
                            (pools || [])
                              .map((p, i) => {
                                const {
                                  chain_data,
                                  asset_data,
                                  contract_data,
                                } = { ...p }
                                let {
                                  name,
                                } = { ...p }
                                let {
                                  symbol,
                                } = {  ...contract_data }

                                symbol =
                                  symbol ||
                                  asset_data?.symbol

                                name =
                                  name ||
                                  symbol

                                const chain = chain_data?.id
                                const asset = asset_data?.id

                                return (
                                  <Link
                                    key={i}
                                    href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                                  >
                                  <a
                                    className="h-6 flex items-center font-semibold ml-8"
                                  >
                                    {name}
                                  </a>
                                  </Link>
                                )
                              })
                          }
                        </>
                      }
                    </div>
                  )
                },
              },
              {
                Header: 'Chains',
                accessor: 'chain_data',
                disableSortBy: true,
                Cell: props => {
                  const {
                    id,
                    pools,
                    chain_data,
                    asset_data,
                  } = { ...props.row.original }
                  const {
                    name,
                    image,
                  } = { ...props.value }

                  const chain = chain_data?.id
                  const asset = asset_data?.id

                  const onClick = () => {
                    if (pools?.length > 0) {
                      setUncollapseAssetIds(
                        uncollapseAssetIds?.includes(id) ?
                          uncollapseAssetIds
                            .filter(_id =>
                              _id !== id
                            ) :
                          _.concat(
                            uncollapseAssetIds ||
                            [],
                            id,
                          )
                      )
                    }
                  }

                  return (
                    <div className="flex flex-col space-y-3">
                      {view === 'my_positions' ?
                        <Link
                          href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                        >
                        <a
                          className="h-6 flex items-center space-x-2"
                        >
                          {
                            image &&
                            (
                              <Image
                                src={image}
                                alt=""
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            )
                          }
                          <span className="text-base font-semibold">
                            {name}
                          </span>
                        </a>
                        </Link> :
                        <>
                          <div
                            onClick={() => onClick()}
                            className={`w-fit ${pools?.length > 0 ? 'cursor-pointer' : ''} flex items-center`}
                          >
                            {pools?.length > 0 ?
                              <>
                                {pools
                                  .map((p, i) => {
                                    const {
                                      chain_data,
                                    } = { ...p }
                                    const {
                                      name,
                                      image,
                                    } = { ...chain_data }

                                    return (
                                      <div
                                        key={i}
                                        title={name}
                                        className="h-6 mr-1.5"
                                      >
                                        {
                                          image &&
                                          (
                                            <Image
                                              src={image}
                                              alt=""
                                              width={24}
                                              height={24}
                                              className="rounded-full"
                                            />
                                          )
                                        }
                                      </div>
                                    )
                                  })
                                }
                                <div className="mr-1.5">
                                  <button
                                    onClick={() => onClick()}
                                    className="w-6 h-6 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full flex items-center justify-center p-1"
                                  >
                                    {uncollapseAssetIds?.includes(id) ?
                                      <MdKeyboardArrowUp
                                        size={18}
                                      /> :
                                      <MdKeyboardArrowDown
                                        size={18}
                                      />
                                    }
                                  </button>
                                </div>
                              </> :
                              <span className="tracking-wider text-slate-400 dark:text-slate-500">
                                No chains supported
                              </span>
                            }
                          </div>
                          {
                            uncollapseAssetIds?.includes(id) &&
                            (pools || [])
                              .map((p, i) => {
                                const {
                                  chain_data,
                                  asset_data,
                                } = { ...p }
                                const {
                                  name,
                                  image,
                                } = { ...chain_data }

                                const chain = chain_data?.id
                                const asset = asset_data?.id

                                return (
                                  <Link
                                    key={i}
                                    href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                                  >
                                  <a
                                    className="h-6 flex items-center space-x-2"
                                  >
                                    {
                                      image &&
                                      (
                                        <Image
                                          src={image}
                                          alt=""
                                          width={24}
                                          height={24}
                                          className="rounded-full"
                                        />
                                      )
                                    }
                                    <span className="text-base font-semibold">
                                      {name}
                                    </span>
                                  </a>
                                  </Link>
                                )
                              })
                          }
                        </>
                      }
                    </div>
                  )
                },
              },
              {
                Header: 'Liquidity',
                accessor: 'liquidity',
                sortType: (a, b) =>
                  _.sumBy(
                    a.original.pools,
                    'liquidity',
                  ) >
                  _.sumBy(
                    b.original.pools,
                    'liquidity',
                  ) ?
                    1 :
                    -1,
                Cell: props => {
                  const {
                    id,
                    pools,
                  } = { ...props.row.original }

                  const value =
                    _.sumBy(
                      pools,
                      'liquidity',
                    )

                  return (
                    <div className="flex flex-col space-y-3">
                      <div className="uppercase text-slate-600 dark:text-slate-400 text-base font-medium text-right">
                        {currency_symbol}
                        {number_format(
                          value,
                          '0,0.00',
                          true,
                        )}
                      </div>
                      {
                        uncollapseAssetIds?.includes(id) &&
                        (pools || [])
                          .map((p, i) => {
                            const {
                              chain_data,
                              asset_data,
                              liquidity,
                            } = { ...p }

                            const chain = chain_data?.id
                            const asset = asset_data?.id
                            const value = liquidity

                            return (
                              <Link
                                key={i}
                                href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                              >
                              <a
                                className="h-6 text-base font-semibold text-right"
                              >
                                <span className="uppercase">
                                  {currency_symbol}
                                  {number_format(
                                    value,
                                    '0,0.00',
                                    true,
                                  )}
                                </span>
                              </a>
                              </Link>
                            )
                          })
                      }
                    </div>
                  )
                },
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
              {
                Header: 'Volume (24H)',
                accessor: 'volume',
                sortType: (a, b) =>
                  _.sumBy(
                    a.original.pools,
                    'volume',
                  ) >
                  _.sumBy(
                    b.original.pools,
                    'volume',
                  ) ?
                    1 :
                    -1,
                Cell: props => {
                  const {
                    id,
                    pools,
                  } = { ...props.row.original }

                  const value =
                    _.sumBy(
                      pools,
                      'volume',
                    )

                  return (
                    <div className="flex flex-col space-y-3">
                      <div className="uppercase text-slate-600 dark:text-slate-400 text-base font-medium text-right">
                        {currency_symbol}
                        {number_format(
                          value,
                          '0,0.00',
                          true,
                        )}
                      </div>
                      {
                        uncollapseAssetIds?.includes(id) &&
                        (pools || [])
                          .map((p, i) => {
                            const {
                              chain_data,
                              asset_data,
                              volume,
                            } = { ...p }

                            const chain = chain_data?.id
                            const asset = asset_data?.id
                            const value = volume

                            return (
                              <Link
                                key={i}
                                href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                              >
                              <a
                                className="h-6 text-base font-semibold text-right"
                              >
                                <span className="uppercase">
                                  {currency_symbol}
                                  {number_format(
                                    value,
                                    '0,0.00',
                                    true,
                                  )}
                                </span>
                              </a>
                              </Link>
                            )
                          })
                      }
                    </div>
                  )
                },
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
              {
                Header: 'Fees (24H)',
                accessor: 'fees',
                sortType: (a, b) =>
                  _.sumBy(
                    a.original.pools,
                    'fees',
                  ) >
                  _.sumBy(
                    b.original.pools,
                    'fees',
                  ) ?
                    1 :
                    -1,
                Cell: props => {
                  const {
                    id,
                    pools,
                  } = { ...props.row.original }

                  const value =
                    _.sumBy(
                      pools,
                      'fees',
                    )

                  return (
                    <div className="flex flex-col space-y-3">
                      <div className="uppercase text-slate-600 dark:text-slate-400 text-base font-medium text-right">
                        {currency_symbol}
                        {number_format(
                          value,
                          '0,0.00',
                          true,
                        )}
                      </div>
                      {
                        uncollapseAssetIds?.includes(id) &&
                        (pools || [])
                          .map((p, i) => {
                            const {
                              chain_data,
                              asset_data,
                              fees,
                            } = { ...p }

                            const chain = chain_data?.id
                            const asset = asset_data?.id
                            const value = fees

                            return (
                              <Link
                                key={i}
                                href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                              >
                              <a
                                className="h-6 text-base font-semibold text-right"
                              >
                                <span className="uppercase">
                                  {currency_symbol}
                                  {number_format(
                                    value,
                                    '0,0.00',
                                    true,
                                  )}
                                </span>
                              </a>
                              </Link>
                            )
                          })
                      }
                    </div>
                  )
                },
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
              {
                Header: 'APY',
                accessor: 'apy.day',
                sortType: (a, b) =>
                  _.meanBy(
                    a.original.pools,
                    'apy.day',
                  ) >
                  _.sumBy(
                    b.original.pools,
                    'apy.day',
                  ) ?
                    1 :
                    -1,
                Cell: props => {
                  const {
                    id,
                    pools,
                  } = { ...props.row.original }

                  const value =
                    _.sumBy(
                      pools,
                      'apy.day',
                    )

                  return (
                    <div className="flex flex-col space-y-3">
                      <div className="uppercase text-slate-600 dark:text-slate-400 text-base font-medium text-right">
                        {number_format(
                          value,
                          '0,0.00',
                          true,
                        )}
                        %
                      </div>
                      {
                        uncollapseAssetIds?.includes(id) &&
                        (pools || [])
                          .map((p, i) => {
                            const {
                              chain_data,
                              asset_data,
                              apy,
                            } = { ...p }

                            const chain = chain_data?.id
                            const asset = asset_data?.id
                            const value = apy?.day

                            return (
                              <Link
                                key={i}
                                href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                              >
                              <a
                                className="h-6 text-base font-semibold text-right"
                              >
                                <span className="uppercase">
                                  {number_format(
                                    value,
                                    '0,0.00',
                                    true,
                                  )}
                                  %
                                </span>
                              </a>
                              </Link>
                            )
                          })
                      }
                    </div>
                  )
                },
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
              {
                Header: 'Your Pool Tokens',
                accessor: 'lpTokenBalance',
                sortType: (a, b) =>
                  a.original.lpTokenBalance *
                  a.original.price >
                  b.original.lpTokenBalance *
                  b.original.price ?
                    1 :
                    -1,
                Cell: props => {
                  const {
                    symbol,
                    price,
                  } = { ...props.row.original }
                  const {
                    value,
                  } = { ...props }

                  return (
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center text-base font-semibold text-right space-x-1">
                        <span className="uppercase">
                          {number_format(
                            value,
                            '0,0.000000',
                            true,
                          )}
                        </span>
                        {
                          symbol &&
                          (
                            <span>
                              {symbol}
                            </span>
                          )
                        }
                      </div>
                      {
                        price > 0 &&
                        (
                          <div className="text-slate-800 dark:text-slate-200 text-sm text-right">
                            <span className="uppercase">
                              {currency_symbol}
                              {number_format(
                                value * price,
                                '0,0.00',
                                true,
                              )}
                            </span>
                          </div>
                        )
                      }
                    </div>
                  )
                },
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
              {
                Header: 'Pooled Tokens',
                accessor: 'balances',
                sortType: (a, b) =>
                  a.original.lpTokenBalance *
                  a.original.price >
                  b.original.lpTokenBalance *
                  b.original.price ?
                    1 :
                    -1,
                Cell: props => {
                  const {
                    symbols,
                  } = { ...props.row.original }
                  const {
                    value,
                  } = { ...props }

                  return (
                    <div className="flex items-center justify-end space-x-1.5">
                      <div className="flex items-center text-base font-semibold space-x-1">
                        <span className="uppercase">
                          {number_format(
                            _.head(value),
                            '0,0.000000',
                            true,
                          )}
                        </span>
                        {
                          _.head(symbols) &&
                          (
                            <span>
                              {_.head(symbols)}
                            </span>
                          )
                        }
                      </div>
                      <span className="text-base font-medium">
                        /
                      </span>
                      <div className="flex items-center text-base font-semibold space-x-1">
                        <span className="uppercase">
                          {number_format(
                            _.last(value),
                            '0,0.000000',
                            true,
                          )}
                        </span>
                        {
                          _.last(symbols) &&
                          (
                            <span>
                              {_.last(symbols)}
                            </span>
                          )
                        }
                      </div>
                    </div>
                  )
                },
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
              {
                Header: 'Pool Share',
                accessor: 'share',
                sortType: (a, b) =>
                  a.original.share > b.original.share ?
                    1 :
                    -1,
                Cell: props => {
                  const {
                    value,
                  } = { ...props }

                  return (
                    <div className="text-base font-semibold text-right">
                      {number_format(
                        value,
                        '0,0.000000',
                        true,
                      )}
                      %
                    </div>
                  )
                },
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
            ]
            .filter(c =>
              !(
                view === 'my_positions' ?
                  [
                    'liquidity',
                    'volume',
                    'fees',
                    'apy.day',
                  ] :
                  [
                    'lpTokenBalance',
                    'balances',
                    'share',
                  ]
              ).includes(c.accessor)
            )}
            data={data}
            noPagination={data.length <= 10}
            defaultPageSize={50}
            className="no-border"
          />
        }
      </div> :
      <div className="my-4 sm:my-6">
        <TailSpin
          color={loader_color(theme)}
          width="32"
          height="32"
        />
      </div>
  )
}
import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import { HiSwitchHorizontal } from 'react-icons/hi'
import { TiArrowRight } from 'react-icons/ti'

import Datatable from '../datatable'
import Image from '../image'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, equals_ignore_case, loader_color } from '../../lib/utils'

export default ({
  pool,
  user_pools_data,
  disabled = false,
  onSelect,
}) => {
  const {
    preferences,
    chains,
    pool_assets,
    pools,
    wallet,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        pool_assets: state.pool_assets,
        pools: state.pools,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }
  const {
    pool_assets_data,
  } = { ...pool_assets }
  const {
    pools_data,
  } = { ...pools }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    address,
  } = { ...wallet_data }

  const {
    chain,
    asset,
  } = { ...pool }

  const chain_data = (chains_data || [])
    .find(c =>
      c?.id === chain
    )
  const {
    chain_id,
    explorer,
  } = { ...chain_data }
  const {
    url,
    contract_path,
  } = { ...explorer }

  const selected =
    !!(
      chain &&
      asset
    )

  const no_pool =
    selected &&
    (pool_assets_data || [])
      .findIndex(a =>
        a?.id === asset &&
        (a.contracts || [])
          .findIndex(a =>
            a?.chain_id === chain_id
          ) > -1
      ) < 0

  const pool_data = (pools_data || [])
    .find(p =>
      p?.chain_data?.id === chain &&
      p.asset_data?.id === asset
    )

  const {
    asset_data,
    contract_data,
    name,
    lpTokenAddress,
    liquidity,
    volume,
    fees,
    apy,
    symbol,
    tokens,
    symbols,
    decimals,
    error,
  } = { ...pool_data }
  const {
    contract_address,
    next_asset,
  } = { ...contract_data }

  const pool_loading =
    selected &&
    !no_pool &&
    !error &&
    !pool_data

  const user_pool_data =
    pool_data &&
    (user_pools_data || [])
      .find(p =>
        p?.chain_data?.id === chain &&
        p.asset_data?.id === asset
      )

  const {
    lpTokenBalance,
    balances,
  } = { ...user_pool_data }

  const share =
    lpTokenBalance * 100 /
    (
      Number(liquidity) ||
      1
    )

  const position_loading =
    selected &&
    !no_pool &&
    !error &&
    (
      !user_pools_data ||
      pool_loading
    )

  const pool_tokens_data =
    (symbols || [])
      .map((s, i) => {
        const _contract_address = tokens?.[i]

        let balance = balances?.[i]

        if (typeof balance !== 'number') {
          balance = -1
        }

        return {
          i,
          contract_address: _contract_address,
          chain_id,
          symbol: s,
          decimals: decimals?.[i],
          image:
            (
              equals_ignore_case(
                _contract_address,
                contract_address,
              ) ?
                contract_data?.image :
                equals_ignore_case(
                  _contract_address,
                  next_asset?.contract_address,
                ) ?
                  next_asset?.image ||
                  contract_data?.image :
                  null
            ) ||
            asset_data?.image,
          balance,
        }
      })

  // const metricClassName = 'bg-slate-100 dark:bg-slate-900 bg-opacity-100 dark:bg-opacity-50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col space-y-0.5 py-3 px-4'
  const metricClassName = 'flex flex-col space-y-0.5'
  const statsSectionClassName = 'bg-white dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-50 rounded-2xl flex flex-col space-y-8 my-auto py-4 px-5'
  const titleClassName = 'text-slate-400 dark:text-slate-400 text-base font-normal'
  const valueClassName = 'text-lg sm:text-2xl font-bold'

  const is_staging =
    process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' ||
    process.env.NEXT_PUBLIC_SITE_URL?.includes('staging') ||
    process.env.NEXT_PUBLIC_SITE_URL?.includes('cloudfront')

  return (
    <div className="sm:min-h-full bg-transparent">
      {
        true ||
        pools_data ?
          is_staging ?
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <span className="text-lg font-semibold">
                    Reserve Info
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-8">
                  <Datatable
                    columns={[
                      {
                        Header: 'Assets',
                        accessor: 'symbol',
                        sortType: (a, b) =>
                          a.original.symbol > b.original.symbol ?
                            1 :
                            -1,
                        Cell: props => {
                          const {
                            value,
                          } = { ...props }
                          const {
                            i,
                            contract_address,
                            image,
                          } = { ...props.row.original }

                          return (
                            <a
                              href={`${url}${contract_path?.replace('{address}', contract_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`h-10 flex items-center space-x-2 ${i % 2 === 0 ? 'pt-2' : 'pb-2'} mx-2`}
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
                              <span className="text-sm font-semibold">
                                {value}
                              </span>
                            </a>
                          )
                        },
                        headerClassName: 'normal-case text-base font-semibold mx-2',
                      },
                      {
                        Header: 'Reserves',
                        accessor: 'balance',
                        sortType: (a, b) =>
                          a.original.balance > b.original.balance ?
                            1 :
                            -1,
                        Cell: props => {
                          const {
                            value,
                          } = { ...props }
                          const {
                            i,
                          } = { ...props.row.original }

                          return (
                            <div className={`h-10 flex items-center text-sm font-semibold space-x-2 ${i % 2 === 0 ? 'pt-2' : 'pb-2'} mx-2`}>
                              {value > -1 ?
                                number_format(
                                  value,
                                  value > 1000 ?
                                    '0,0.00' :
                                    '0,0.00000000',
                                  true,
                                ) :
                                '-'
                              }
                            </div>
                          )
                        },
                        headerClassName: 'normal-case text-base font-semibold mx-2',
                      },
                    ]}
                    data={pool_tokens_data}
                    noPagination={pool_tokens_data.length <= 10}
                    defaultPageSize={10}
                    className="inline-table no-border"
                  />
                  <div>
                    <div
                      className="border-b dark:border-slate-800 flex items-center justify-between space-x-2"
                      style={{
                        height: '44.5px',
                      }}
                    >
                      {
                        lpTokenAddress &&
                        url ?
                          <a
                            href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 dark:text-slate-100 text-base font-semibold"
                          >
                            My positions
                          </a> :
                          <span className="text-slate-500 dark:text-slate-100 text-base font-semibold">
                            My positions
                          </span>
                      }
                      {
                        lpTokenAddress &&
                        url &&
                        (
                          <a
                            href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <TiArrowRight
                              size={24}
                              className="transform -rotate-45 mt-1"
                            />
                          </a>
                        )
                      }
                    </div>
                    <div className="h-14 flex items-center justify-between space-x-2 pt-2">
                      {
                        lpTokenAddress &&
                        url ?
                          <a
                            href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 dark:text-slate-500 text-base font-semibold"
                          >
                            Pool Tokens
                          </a> :
                          <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
                            Pool Tokens
                          </span>
                      }
                      <span className="text-sm font-semibold">
                        {
                          !isNaN(lpTokenBalance) ||
                          (
                            pool_data &&
                            !error &&
                            user_pools_data
                          ) ?
                            lpTokenAddress &&
                            url ?
                              <a
                                href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {number_format(
                                  lpTokenBalance ||
                                  0,
                                  '0,0.000000000000',
                                  true,
                                )}
                              </a> :
                              number_format(
                                lpTokenBalance ||
                                0,
                                '0,0.000000000000',
                                true,
                              ) :
                            selected &&
                            !no_pool &&
                            !error &&
                            (
                              position_loading ?
                                <div className="mt-0.5">
                                  <TailSpin
                                    color={loader_color(theme)}
                                    width="24"
                                    height="24"
                                  />
                                </div> :
                                '-'
                            )
                        }
                      </span>
                    </div>
                    <div className="h-14 flex items-center justify-between space-x-2 pb-2">
                      <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
                        Share
                      </span>
                      <span className="text-sm font-semibold">
                        {
                          !isNaN(share) ||
                          (
                            pool_data &&
                            !error &&
                            user_pools_data
                          ) ?
                            <>
                              {number_format(
                                share ||
                                0,
                                '0,0.000000',
                                true,
                              )} %
                            </> :
                            selected &&
                            !no_pool &&
                            !error &&
                            (
                              position_loading ?
                                <div className="mt-0.5">
                                  <TailSpin
                                    color={loader_color(theme)}
                                    width="24"
                                    height="24"
                                  />
                                </div> :
                                '-'
                            )
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div> :
            <div className={statsSectionClassName}>
              <div className="space-y-3">
                <div className="tracking-wider text-xl font-medium">
                  Statistics
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={metricClassName}>
                    <span className={titleClassName}>
                      Liquidity
                    </span>
                    <span className={valueClassName}>
                      {
                        pool_data &&
                        !error ?
                          number_format(
                            liquidity,
                            '0,0.000000',
                            true,
                          ) :
                          selected &&
                          !no_pool &&
                          !error &&
                          (
                            pool_loading ?
                              <div className="mt-1">
                                <TailSpin
                                  color={loader_color(theme)}
                                  width="24"
                                  height="24"
                                />
                              </div> :
                              '-'
                          )
                      }
                    </span>
                  </div>
                  <div className={metricClassName}>
                    <span className={titleClassName}>
                      Volume (24h)
                    </span>
                    <span className={valueClassName}>
                      {
                        pool_data &&
                        !error ?
                          <>
                            {currency_symbol}
                            {number_format(
                              volume,
                              '0,0.000000',
                              true,
                            )}
                          </> :
                          selected &&
                          !no_pool &&
                          !error &&
                          (
                            pool_loading ?
                              <div className="mt-1">
                                <TailSpin
                                  color={loader_color(theme)}
                                  width="24"
                                  height="24"
                                />
                              </div> :
                              '-'
                          )
                      }
                    </span>
                  </div>
                  <div className={metricClassName}>
                    <span className={titleClassName}>
                      Fees (24h)
                    </span>
                    <span className={valueClassName}>
                      {
                        pool_data &&
                        !error ?
                          <>
                            {currency_symbol}
                            {number_format(
                              fees,
                              '0,0.000000',
                              true,
                            )}
                          </> :
                          selected &&
                          !no_pool &&
                          !error &&
                          (
                            pool_loading ?
                              <div className="mt-1">
                                <TailSpin
                                  color={loader_color(theme)}
                                  width="24"
                                  height="24"
                                />
                              </div> :
                              '-'
                          )
                      }
                    </span>
                  </div>
                  {
                    false &&
                    <div className={metricClassName}>
                      <span className={titleClassName}>
                        APY
                      </span>
                      <span className={valueClassName}>
                        {
                          pool_data &&
                          !error ?
                            /*<div className="grid sm:grid-cols-1 gap-1 mt-1">
                              {Object.entries({ ...apy })
                                .filter(([k, v]) => !isNaN(v))
                                .map(([k, v]) => (
                                  <div
                                    key={k}
                                    className="flex items-center text-sm space-x-1"
                                  >
                                    <span className="capitalize">
                                      {k}
                                    </span>
                                    <span>
                                      {number_format(
                                        v,
                                        '0,0.00',
                                        true,
                                      )} %
                                    </span>
                                  </div>
                                ))
                              }
                            </div>*/
                            <span>
                              {number_format(
                                apy?.total,
                                '0,0.00',
                                true,
                              )} %
                            </span> :
                            selected &&
                            !no_pool &&
                            !error &&
                            (
                              pool_loading ?
                                <div className="mt-1">
                                  <TailSpin
                                    color={loader_color(theme)}
                                    width="24"
                                    height="24"
                                  />
                                </div> :
                                '-'
                            )
                        }
                      </span>
                    </div>
                  }
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {
                  address &&
                  symbols &&
                  (
                    <div className="space-y-3">
                      <div className="tracking-wider text-xl font-medium">
                        Tokens
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {
                          _.head(symbols) &&
                          (
                            <div className={metricClassName}>
                              <div className="flex items-center space-x-2">
                                <span className={titleClassName}>
                                  {_.head(symbols)}
                                </span>
                                {/*<Link
                                  href={`/swap/${asset.toUpperCase()}-on-${chain}?from=${_.last(symbols)}`}
                                >
                                <a
                                  className="text-blue-500 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white"
                                >
                                  <Tooltip
                                    placement="top"
                                    content={`Click here to swap ${_.last(symbols)} into ${_.head(symbols)}`}
                                    className="z-50 bg-black text-white text-xs"
                                  >
                                    <div>
                                      <HiSwitchHorizontal
                                        size={18}
                                      />
                                    </div>
                                  </Tooltip>
                                </a>
                                </Link>*/}
                              </div>
                              <span className={valueClassName}>
                                {
                                  !isNaN(_.head(balances)) ||
                                  (
                                    pool_data &&
                                    !error &&
                                    user_pools_data
                                  ) ?
                                    number_format(
                                      _.head(balances) ||
                                      0,
                                      '0,0.000000000000',
                                      true,
                                    ) :
                                    selected &&
                                    !no_pool &&
                                    !error &&
                                    (
                                      position_loading ?
                                        <div className="mt-0.5">
                                          <TailSpin
                                            color={loader_color(theme)}
                                            width="24"
                                            height="24"
                                          />
                                        </div> :
                                        '-'
                                    )
                                }
                              </span>
                            </div>
                          )
                        }
                        {
                          _.last(symbols) &&
                          (
                            <div className={metricClassName}>
                              <div className="flex items-center space-x-2">
                                <span className={titleClassName}>
                                  {_.last(symbols)}
                                </span>
                                {/*<Link
                                  href={`/swap/${asset.toUpperCase()}-on-${chain}`}
                                >
                                <a
                                  className="text-blue-500 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white"
                                >
                                  <Tooltip
                                    placement="top"
                                    content={`Click here to swap ${_.head(symbols)} into ${_.last(symbols)}`}
                                    className="z-50 bg-black text-white text-xs"
                                  >
                                    <div>
                                      <HiSwitchHorizontal
                                        size={18}
                                      />
                                    </div>
                                  </Tooltip>
                                </a>
                                </Link>*/}
                              </div>
                              <span className={valueClassName}>
                                {
                                  !isNaN(_.last(balances)) ||
                                  (
                                    pool_data &&
                                    !error &&
                                    user_pools_data
                                  ) ?
                                    number_format(
                                      _.last(balances) ||
                                      0,
                                      '0,0.000000000000',
                                      true,
                                    ) :
                                    selected &&
                                    !no_pool &&
                                    !error &&
                                    (
                                      position_loading ?
                                        <div className="mt-0.5">
                                          <TailSpin
                                            color={loader_color(theme)}
                                            width="24"
                                            height="24"
                                          />
                                        </div> :
                                        '-'
                                    )
                                }
                              </span>
                            </div>
                          )
                        }
                      </div>
                    </div>
                  )
                }
                {
                  address &&
                  (
                    <div className="space-y-3">
                      <div className="text-xl font-medium">
                        Your Position
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className={metricClassName}>
                          <span className={titleClassName}>
                            Pool Share
                          </span>
                          <span className={valueClassName}>
                            {
                              !isNaN(share) ||
                              (
                                pool_data &&
                                !error &&
                                user_pools_data
                              ) ?
                                <>
                                  {number_format(
                                    share ||
                                    0,
                                    '0,0.000000',
                                    true,
                                  )} %
                                </> :
                                selected &&
                                !no_pool &&
                                !error &&
                                (
                                  position_loading ?
                                    <div className="mt-0.5">
                                      <TailSpin
                                        color={loader_color(theme)}
                                        width="24"
                                        height="24"
                                      />
                                    </div> :
                                    '-'
                                )
                            }
                          </span>
                        </div>
                        <div className={metricClassName}>
                          <span className={titleClassName}>
                            Pool Tokens
                          </span>
                          <span className={valueClassName}>
                            {
                              !isNaN(lpTokenBalance) ||
                              (
                                pool_data &&
                                !error &&
                                user_pools_data
                              ) ?
                                number_format(
                                  lpTokenBalance ||
                                  0,
                                  '0,0.000000000000',
                                  true,
                                ) :
                                selected &&
                                !no_pool &&
                                !error &&
                                (
                                  position_loading ?
                                    <div className="mt-0.5">
                                      <TailSpin
                                        color={loader_color(theme)}
                                        width="24"
                                        height="24"
                                      />
                                    </div> :
                                    '-'
                                )
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
              </div>
            </div> :
          <div className="py-4">
            <TailSpin
              color={loader_color(theme)}
              width="36"
              height="36"
            />
          </div>
      }
    </div>
  )
}
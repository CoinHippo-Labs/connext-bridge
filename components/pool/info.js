import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'
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
    assets,
    pool_assets,
    pools,
    wallet,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
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
    assets_data,
  } = { ...assets }
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
    supply,
    volume,
    fees,
    apr,
    symbol,
    tokens,
    symbols,
    decimals,
    rate,
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
  } = { ...user_pool_data }
  let {
    balances,
  } = { ...user_pool_data }

  balances =
    balances ||
    pool_data?.balances

  const share =
    lpTokenBalance * 100 /
    (
      Number(supply) ||
      1
    )

  const position_loading =
    address &&
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

  const {
    price,
  } = {
    ...(
      (assets_data || [])
        .find(a =>
          a?.id === asset
        )
    ),
  }

  const tvl =
    typeof price === 'number' ?
      (
        supply ||
        _.sum(
          (balances || [])
            .map((b, i) =>
              b /
              (
                i > 0 &&
                rate > 0 ?
                  rate :
                  1
              )
            )
        )
      ) *
      price :
      0

  const metricClassName = 'bg-slate-50 dark:bg-slate-900 rounded border dark:border-slate-800 flex flex-col space-y-8 py-5 px-4'
  const titleClassName = 'text-slate-400 dark:text-slate-200 text-base font-medium'
  const valueClassName = 'text-lg sm:text-3xl font-bold'
  const gridValueClassName = 'text-lg font-bold'

  return (
    <div className="sm:min-h-full bg-transparent">
      {
        true ||
        pools_data ?
          <div className="space-y-6">
            <div className="space-y-4">
              {/*<div className="tracking-wider text-lg font-semibold">
                Statistics
              </div>*/}
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
                <div className={metricClassName}>
                  <span className={titleClassName}>
                    TVL
                  </span>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      {
                        asset_data?.image &&
                        (
                          <Image
                            src={asset_data.image}
                            alt=""
                            width={16}
                            height={16}
                            className="rounded-full"
                          />
                        )
                      }
                      <span className="text-xs font-medium">
                        {asset_data?.symbol}
                      </span>
                    </div>
                    <span className={valueClassName}>
                      {
                        pool_data &&
                        !error ?
                          <span className="uppercase">
                            {currency_symbol}
                            {number_format(
                              tvl,
                              '0,0.00',
                              true,
                            )}
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
                </div>
                <div className={metricClassName}>
                  <span className={titleClassName}>
                    Reward APR
                  </span>
                  <div className="flex flex-col space-y-1">
                    {
                      pool_data &&
                      (
                        [
                          'optimism',
                        ].includes(chain) ?
                          <div className="flex items-center space-x-2">
                            {
                              chain_data?.image &&
                              (
                                <Image
                                  src={chain_data.image}
                                  alt=""
                                  width={16}
                                  height={16}
                                  className="rounded-full"
                                />
                              )
                            }
                            <span className="uppercase text-xs font-medium">
                              {
                                [
                                  'optimism',
                                ].includes(chain) ?
                                  chain
                                    .slice(
                                      0,
                                      2,
                                    ) :
                                  chain_data?.short_name
                              }
                            </span>
                          </div> :
                          <div className="h-4" />
                      )
                    }
                    <span className={valueClassName}>
                      {
                        pool_data &&
                        !error ?
                          [
                            'optimism',
                          ].includes(chain) ?
                            !isNaN(apr) ?
                              <span className="uppercase">
                                {number_format(
                                  apr / 100,
                                  '0,0.00a',
                                  true,
                                )} %
                              </span> :
                              'TBD' :
                            <span className="uppercase">
                              {number_format(
                                apr / 100,
                                '0,0.00a',
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
                </div>
                <div className={metricClassName}>
                  <span className={titleClassName}>
                    Volume 24h
                  </span>
                  <div className="flex flex-col space-y-1">
                   <span className={valueClassName}>
                      {
                        pool_data &&
                        !error ?
                          <span className="uppercase">
                            {currency_symbol}
                            {number_format(
                              volume,
                              '0,0.00',
                              true,
                            )}
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
                </div>
                <div className={metricClassName}>
                  <span className={titleClassName}>
                    Liquidity provided
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {
                      position_loading ||
                      pool_loading ?
                        <div>
                          <div className="mt-1">
                            <TailSpin
                              color={loader_color(theme)}
                              width="24"
                              height="24"
                            />
                          </div>
                        </div> :
                        pool_tokens_data
                          .map((p, i) => {
                            const {
                              contract_address,
                              symbol,
                              image,
                              balance,
                            } = { ...p }

                            return (
                              <div
                                key={i}
                                className="flex flex-col space-y-1"
                              >
                                <a
                                  href={`${url}${contract_path?.replace('{address}', contract_address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-2"
                                >
                                  {
                                    image &&
                                    (
                                      <Image
                                        src={image}
                                        alt=""
                                        width={16}
                                        height={16}
                                        className="rounded-full"
                                      />
                                    )
                                  }
                                  <span className="text-xs font-medium">
                                    {symbol}
                                  </span>
                                </a>
                                <a
                                  href={`${url}${contract_path?.replace('{address}', contract_address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={gridValueClassName}
                                >
                                  {
                                    pool_data &&
                                    !error ?
                                      <span className="uppercase">
                                        {balance > -1 ?
                                          number_format(
                                            balance,
                                            balance > 1000 ?
                                              '0,0.00' :
                                              '0,0.00000000',
                                            true,
                                          ) :
                                          '-'
                                        }
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
                                </a>
                              </div>
                            )
                          })
                    }
                  </div>
                </div>
                <div className={metricClassName}>
                  <span className={titleClassName}>
                    My positions
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {
                      position_loading ||
                      pool_loading ?
                        <div>
                          <div className="mt-1">
                            <TailSpin
                              color={loader_color(theme)}
                              width="24"
                              height="24"
                            />
                          </div>
                        </div> :
                        <>
                          <div className="flex flex-col space-y-1">
                            {
                              lpTokenAddress &&
                              url ?
                                <a
                                  href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-medium"
                                >
                                  Pool Tokens
                                </a> :
                                <span className="text-xs font-medium">
                                  Pool Tokens
                                </span>
                            }
                            {
                              lpTokenAddress &&
                              url ?
                                <a
                                  href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={gridValueClassName}
                                >
                                  {number_format(
                                    lpTokenBalance ||
                                    0,
                                    '0,0.000000000000',
                                    true,
                                  )}
                                </a> :
                                <span className={gridValueClassName}>
                                  {number_format(
                                    lpTokenBalance ||
                                    0,
                                    '0,0.000000000000',
                                    true,
                                  )}
                                </span>
                            }
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className="text-xs font-medium">
                              Share
                            </span>
                            <span className={gridValueClassName}>
                              {number_format(
                                share ||
                                0,
                                '0,0.000000',
                                true,
                              )}
                              %
                            </span>
                          </div>
                        </>
                    }
                  </div>
                </div>
                {/*<div className={metricClassName}>
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
                </div>*/}
              </div>
            </div>
            {/*<div className="space-y-4">
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
                          contract_address,
                        } = { ...props.row.original }

                        return (
                          <a
                            href={`${url}${contract_path?.replace('{address}', contract_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`h-10 flex items-center text-sm font-semibold space-x-2 ${i % 2 === 0 ? 'pt-2' : 'pb-2'} mx-2`}
                          >
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
                          </a>
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
                            )}
                            %
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
            </div>*/}
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
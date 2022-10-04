import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin, RotatingTriangles } from 'react-loader-spinner'

import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, loader_color } from '../../lib/utils'

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

  const chain_data = chains_data?.find(c => c?.id === chain)
  const {
    chain_id,
    explorer,
  } = { ...chain_data }
  const {
    url,
    contract_path,
  } = { ...explorer }

  const selected = !!(
    chain &&
    asset
  )

  const no_pool = selected &&
    pool_assets_data?.findIndex(a =>
      a?.id === asset &&
      a.contracts?.findIndex(a => a?.chain_id === chain_id) > -1
    ) < 0

  const pool_data = pools_data?.find(p =>
    p?.chain_data?.id === chain &&
    p.asset_data?.id === asset
  )
  const {
    name,
    lpTokenAddress,
    liquidity,
    volume,
    fees,
    apy,
    symbol,
    symbols,
  } = { ...pool_data }

  const pool_loading = selected &&
    !no_pool &&
    !pool_data

  const user_pool_data = pool_data &&
    user_pools_data?.find(p =>
      p?.chain_data?.id === chain &&
      p.asset_data?.id === asset
    )
  const {
    lpTokenBalance,
    balances,
  } = { ...user_pool_data }

  const share = lpTokenBalance * 100 /
    (Number(liquidity) || 1)

  const position_loading = selected &&
    !no_pool &&
    (
      !user_pools_data ||
      pool_loading
    )

  const metricClassName = 'bg-slate-100 dark:bg-slate-900 bg-opacity-100 dark:bg-opacity-50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col space-y-0.5 py-3 px-4'
  const titleClassName = 'text-slate-400 dark:text-slate-400 text-base font-normal'
  const valueClassName = 'text-lg sm:text-2xl font-bold'

  return (
    <div className="sm:min-h-full bg-transparent">
      {pools_data ?
        <div className="flex flex-col space-y-8 my-auto">
          <div className="grid sm:flex sm:items-center sm:justify-between sm:space-x-2 gap-2">
            <div className="order-2 sm:order-1 flex items-center space-x-4 sm:space-x-6">
              <SelectAsset
                disabled={disabled}
                value={asset}
                onSelect={a => {
                  if (onSelect) {
                    onSelect({
                      ...pool,
                      asset: a,
                    })
                  }
                }}
                chain={chain}
                origin=""
                is_pool={true}
              />
              <div className="uppercase text-xs sm:text-sm font-medium">
                on
              </div>
              <SelectChain
                disabled={disabled}
                value={chain}
                onSelect={c => {
                  if (onSelect) {
                    onSelect({
                      ...pool,
                      chain: c,
                    })
                  }
                }}
                origin=""
              />
            </div>
            {
              no_pool &&
              (
                <div className="order-2 bg-slate-100 dark:bg-slate-800 bg-opacity-100 dark:bg-opacity-50 rounded-2xl tracking-wider text-slate-400 dark:text-slate-400 text-base font-normal py-1.5 px-4">
                  No pool support
                </div>
              )
            }
            {
              name &&
              url &&
              (
                <a
                  href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="order-1 sm:order-2 bg-slate-100 dark:bg-slate-800 bg-opacity-100 dark:bg-opacity-50 rounded-2xl text-base font-semibold py-1.5 px-4"
                >
                  {name}
                </a>
              )
            }
          </div>
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
                  {pool_data ?
                    number_format(
                      liquidity,
                      '0,0.000000',
                      true,
                    ) :
                    selected &&
                    !no_pool &&
                    (
                      pool_loading ?
                        <div className="mt-1">
                          <RotatingTriangles
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
                  {pool_data ?
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
                    (
                      pool_loading ?
                        <div className="mt-1">
                          <RotatingTriangles
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
                  {pool_data ?
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
                    (
                      pool_loading ?
                        <div className="mt-1">
                          <RotatingTriangles
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
                  APY
                </span>
                <span className={valueClassName}>
                  {pool_data ?
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
                                '0,0.000000',
                                true,
                              )}
                              %
                            </span>
                          </div>
                        ))
                      }
                    </div>*/
                    <span>
                      {number_format(
                        apy?.total,
                        '0,0.000000',
                        true,
                      )}
                      %
                    </span> :
                    selected &&
                    !no_pool &&
                    (
                      pool_loading ?
                        <div className="mt-1">
                          <RotatingTriangles
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
                          <span className={titleClassName}>
                            {_.head(symbols)}
                          </span>
                          <span className={valueClassName}>
                            {
                              !isNaN(_.head(balances)) ||
                              (
                                pool_data &&
                                user_pools_data
                              ) ?
                                number_format(
                                  _.head(balances) || 0,
                                  '0,0.000000',
                                  true,
                                ) :
                                selected &&
                                !no_pool &&
                                (
                                  position_loading ?
                                    <div className="mt-0.5">
                                      <RotatingTriangles
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
                          <span className={titleClassName}>
                            {_.last(symbols)}
                          </span>
                          <span className={valueClassName}>
                            {
                              !isNaN(_.last(balances)) ||
                              (
                                pool_data &&
                                user_pools_data
                              ) ?
                                number_format(
                                  _.last(balances) || 0,
                                  '0,0.000000',
                                  true,
                                ) :
                                selected &&
                                !no_pool &&
                                (
                                  position_loading ?
                                    <div className="mt-0.5">
                                      <RotatingTriangles
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
                            user_pools_data
                          ) ?
                          <>
                            {number_format(
                              share || 0,
                              '0,0.000000',
                              true,
                            )}
                            %
                          </> :
                          selected &&
                          !no_pool &&
                          (
                            position_loading ?
                              <div className="mt-0.5">
                                <RotatingTriangles
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
                            user_pools_data
                          ) ?
                            number_format(
                              lpTokenBalance || 0,
                              '0,0.000000',
                              true,
                            ) :
                            selected &&
                            !no_pool &&
                            (
                              position_loading ?
                                <div className="mt-0.5">
                                  <RotatingTriangles
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
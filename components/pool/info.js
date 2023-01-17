import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'

import Image from '../image'
import DecimalsFormat from '../decimals-format'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, equals_ignore_case, loader_color } from '../../lib/utils'

export default (
  {
    pool,
    user_pools_data,
    disabled = false,
    onSelect,
  },
) => {
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
    color,
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
    adopted,
    local,
    supply,
    volume,
    fees,
    apr,
    symbols,
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

  const share =
    parseFloat(
      (
        Number(lpTokenBalance) * 100 /
        (
          Number(supply) ||
          1
        )
      )
      .toFixed(18)
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
    [
      adopted,
      local,
    ]
    .map((t, i) => {
      const {
        address,
        symbol,
        balance,
        decimals,
      } = { ...t }

      return {
        i,
        contract_address: address,
        chain_id,
        symbol,
        decimals,
        image:
          (
            equals_ignore_case(
              address,
              contract_address,
            ) ?
              contract_data?.image :
              equals_ignore_case(
                address,
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
          [
            adopted,
            local,
          ]
          .filter(t => t)
          .map(t => {
            const {
              balance,
              index,
            } = { ...t }

            return (
              Number(
                balance ||
                '0'
              ) /
              (
                index > 0 &&
                rate > 0 ?
                  rate :
                  1
              )
            )
          })
        )
      ) *
      price :
      0

  const metricClassName = 'bg-slate-50 dark:bg-slate-900 bg-opacity-60 dark:bg-opacity-60 rounded border dark:border-slate-800 flex flex-col space-y-12 py-5 px-4'
  const titleClassName = 'text-slate-400 dark:text-slate-200 text-base font-medium'
  const valueClassName = 'text-lg sm:text-3xl font-semibold'
  const gridValueClassName = 'text-lg font-semibold'

  const boxShadow =
    `${
      color ||
      '#e53f3f'
    }${
      theme === 'light' ?
        '44' :
        '33'
    } 0px 32px 128px 64px`

  return (
    <div className="sm:min-h-full bg-transparent">
      {
        true ||
        pools_data ?
          <div className="space-y-6">
            <div className="space-y-0">
              <div
                className="w-32 sm:w-64 mx-auto sm:mr-8"
                style={
                  {
                    boxShadow,
                    WebkitBoxShadow: boxShadow,
                    MozBoxShadow: boxShadow,
                  }
                }
              />
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
                <div className={metricClassName}>
                  <span className={titleClassName}>
                    TVL
                  </span>
                  <div className="flex flex-col space-y-1">
                    {/*<div className="flex items-center space-x-2">
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
                    </div>*/}
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
                    Volume (24h)
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
                                  <DecimalsFormat
                                    value={
                                      number_format(
                                        Number(
                                          lpTokenBalance ||
                                          0
                                        ),
                                        '0,0.000000000000',
                                        true,
                                      )
                                    }
                                    className={gridValueClassName}
                                  />
                                </a> :
                                <DecimalsFormat
                                  value={
                                    number_format(
                                      Number(
                                        lpTokenBalance ||
                                        0
                                      ),
                                      '0,0.000000000000',
                                      true,
                                    )
                                  }
                                  className={gridValueClassName}
                                />
                            }
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className="text-xs font-medium">
                              Share
                            </span>
                            <DecimalsFormat
                              value={
                                number_format(
                                  share ||
                                  0,
                                  share > 1 ?
                                    '0,0.00' :
                                    '0,0.000000',
                                  true,
                                )
                              }
                              max_decimals={
                                share > 100 ?
                                  0 :
                                  share > 1 ?
                                    2 :
                                    6
                              }
                              suffix="%"
                              className={gridValueClassName}
                            />
                          </div>
                        </>
                    }
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
                          // 'optimism',
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
                                  // 'optimism',
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
                          <div className="h-0" />
                      )
                    }
                    <span className={valueClassName}>
                      {
                        pool_data &&
                        !error ?
                          [
                            // 'optimism',
                          ].includes(chain) ?
                            !isNaN(apr) ?
                              <span className="uppercase">
                                {number_format(
                                  apr / 100,
                                  '0,0.00a',
                                  true,
                                )}
                                %
                              </span> :
                              'TBD' :
                            !isNaN(apr) ?
                              <span className="uppercase">
                                {number_format(
                                  apr / 100,
                                  '0,0.00a',
                                  true,
                                )}
                                %
                              </span> :
                              'TBD' :
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
                {/*<div className={metricClassName}>
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
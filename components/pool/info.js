import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { TailSpin } from 'react-loader-spinner'

import DecimalsFormat from '../decimals-format'
import Image from '../image'
import LineChart from '../charts/line'
import { ProgressBar } from '../progress-bars'
import { currency, currency_symbol } from '../../lib/object/currency'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { toArray, name, equalsIgnoreCase, loaderColor } from '../../lib/utils'

const WRAPPED_PREFIX = process.env.NEXT_PUBLIC_WRAPPED_PREFIX
const DAILY_METRICS = ['tvl', 'volume']

export default (
  {
    pool,
    userPoolsData,
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
    pools_daily_stats,
    wallet,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        pool_assets: state.pool_assets,
        pools: state.pools,
        pools_daily_stats: state.pools_daily_stats,
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
    pools_daily_stats_data,
  } = { ...pools_daily_stats }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    address,
  } = { ...wallet_data }

  const [dailyMetric, setDailyMetric] = useState(_.head(DAILY_METRICS))

  const {
    chain,
    asset,
  } = { ...pool }

  const chain_data = getChain(chain, chains_data)

  const {
    chain_id,
    explorer,
    color,
  } = { ...chain_data }

  const {
    url,
    contract_path,
  } = { ...explorer }

  const selected = !!(chain && asset)

  const no_pool = selected && !getAsset(asset, pool_assets_data, chain_id)

  const pool_data = toArray(pools_data).find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)

  const {
    asset_data,
    contract_data,
    domainId,
    canonicalHash,
    lpTokenAddress,
    supply,
    volume_value,
    error,
  } = { ...pool_data }
  let {
    adopted,
    local,
  } = { ...pool_data }

  const {
    contract_address,
    next_asset,
  } = { ...contract_data }

  const pool_loading = selected && !no_pool && !error && !pool_data

  const user_pool_data = pool_data && toArray(userPoolsData).find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)

  const {
    lpTokenBalance,
  } = { ...user_pool_data }

  const share = parseFloat((Number(lpTokenBalance || '0') * 100 / (Number(supply) || 1)).toFixed(18))

  const position_loading = address && selected && !no_pool && !error && (!userPoolsData || pool_loading)

  const pool_tokens_data =
    toArray(
      _.concat(adopted, local)
    )
    .map((a, i) => {
      const {
        address,
        symbol,
        balance,
        decimals,
      } = { ...a }

      return {
        i,
        contract_address: address,
        chain_id,
        symbol,
        decimals,
        image:
          (
            equalsIgnoreCase(
              address,
              contract_address,
            ) ?
              contract_data?.image :
              equalsIgnoreCase(
                address,
                next_asset?.contract_address,
              ) ?
                next_asset?.image || contract_data?.image :
                null
          ) ||
          asset_data?.image,
        balance,
      }
    })

  adopted = { ...adopted, asset_data: _.head(pool_tokens_data) }
  local = { ...local, asset_data: _.last(pool_tokens_data) }

  const native_asset = !adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local

  const wrapped_asset = adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local

  const native_amount = Number(native_asset?.balance || '0')

  const wrapped_amount = Number(wrapped_asset?.balance || '0')

  const total_amount = native_amount + wrapped_amount

  const {
    price,
  } = { ...getAsset(asset, assets_data) }

  const tvl = Number(supply || _.sum(toArray(_.concat(adopted, local)).map(a => Number(a.balance)))) * (price || 0)

  const chartData =
    !pool_loading && pools_daily_stats_data?.[`${dailyMetric}s`] &&
    {
      data:
        toArray(pools_daily_stats_data[`${dailyMetric}s`])
          .filter(d => equalsIgnoreCase(d.pool_id, canonicalHash) && d.domain === domainId)
          .map(d => {
            let time, value

            switch (dailyMetric) {
              case 'tvl':
                time = d.day
                value = _.sum(d.balances)
                break
              case 'volume':
              default:
                time = d.swap_day
                value = d.volume
                break
            }

            return {
              ...d,
              timestamp: moment(time).valueOf(),
              value,
            }
          }),
      chain_data,
      asset_data: getAsset(asset, assets_data),
      pool_data,
    }

  const metricClassName = 'bg-slate-50 dark:bg-slate-900 bg-opacity-60 dark:bg-opacity-60 rounded border dark:border-slate-800 flex flex-col space-y-12 3xl:space-y-16 py-5 3xl:py-8 px-4 3xl:px-6'
  const titleClassName = 'text-slate-400 dark:text-slate-200 text-base 3xl:text-xl font-medium'
  const valueClassName = 'text-lg sm:text-3xl 3xl:text-4xl font-semibold'
  const gridValueClassName = 'text-lg 3xl:text-2xl font-semibold'

  const boxShadow = `${color || '#e53f3f'}${theme === 'light' ? '44' : '33'} 0px 32px 128px 64px`

  return (
    <div className="sm:min-h-full bg-transparent">
      <div className="space-y-6">
        <div className="space-y-0 3xl:space-y-2">
          <div
            className="w-32 sm:w-64 3xl:w-96 mx-auto sm:mr-8"
            style={
              {
                boxShadow,
                WebkitBoxShadow: boxShadow,
                MozBoxShadow: boxShadow,
              }
            }
          />
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
            <div className={`${metricClassName} col-span-2 pt-6 pb-1`}>
              <LineChart
                id={dailyMetric}
                chartData={chartData}
                header={
                  <div className="w-fit border-b dark:border-slate-800 flex items-center justify-between space-x-4">
                    {DAILY_METRICS.map((m, i) => (
                      <div
                        key={i}
                        onClick={() => setDailyMetric(m)}
                        className={`w-fit border-b-2 ${dailyMetric === m ? 'border-slate-300 dark:border-slate-200 font-semibold' : 'border-transparent text-slate-400 dark:text-slate-500 font-semibold'} cursor-pointer text-base 3xl:text-xl font-medium pt-0 pb-3 px-2`}
                      >
                        {name(m)}
                      </div>
                    ))}
                  </div>
                }
              />
            </div>
            {/*
              <div className={metricClassName}>
                <span className={titleClassName}>
                  TVL
                </span>
                <div className="flex flex-col space-y-1">
                  <span className={valueClassName}>
                    {pool_data && !error ?
                      <span className="uppercase">
                        {currency_symbol}
                        <DecimalsFormat
                          value={tvl}
                          className={valueClassName}
                        />
                      </span> :
                      selected && !no_pool && !error &&
                      (pool_loading ?
                        <div className="mt-1">
                          <TailSpin
                            width="24"
                            height="24"
                            color={loaderColor(theme)}
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
                  Volume (7d)
                </span>
                <div className="flex flex-col space-y-1">
                  <span className={valueClassName}>
                    {pool_data && !error ?
                      !isNaN(volume_value) ?
                        <span className="uppercase">
                          {currency_symbol}
                          <DecimalsFormat
                            value={volume_value}
                            className={valueClassName}
                          />
                        </span> :
                        'TBD' :
                      selected && !no_pool && !error &&
                      (pool_loading ?
                        <div className="mt-1">
                          <TailSpin
                            width="24"
                            height="24"
                            color={loaderColor(theme)}
                          />
                        </div> :
                        '-'
                      )
                    }
                  </span>
                </div>
              </div>
            */}
            <div className={metricClassName}>
              <span className={titleClassName}>
                Pool Composition
              </span>
              <div className="space-y-3">
                {
                  !(position_loading || pool_loading) &&
                  (
                    <ProgressBar
                      width={native_amount * 100 / total_amount}
                      className="w-full 3xl:h-2 rounded-lg"
                      backgroundClassName="3xl:h-2 rounded-lg"
                      style={{ backgroundColor: asset_data?.color }}
                      backgroundStyle={{ backgroundColor: `${asset_data?.color}33` }}
                    />
                  )
                }
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {position_loading || pool_loading ?
                    <div>
                      <div className="mt-1">
                        <TailSpin
                          width="24"
                          height="24"
                          color={loaderColor(theme)}
                        />
                      </div>
                    </div> :
                    pool_tokens_data.map((p, i) => {
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
                                  width={16}
                                  height={16}
                                  className="3xl:w-5 3xl:h-5 rounded-full"
                                />
                              )
                            }
                            <span className="text-xs 3xl:text-lg font-medium">
                              {symbol}
                            </span>
                          </a>
                          <a
                            href={`${url}${contract_path?.replace('{address}', contract_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={gridValueClassName}
                          >
                            {pool_data && !error ?
                              <div className="flex items-center space-x-1.5">
                                <span className="uppercase">
                                  {balance > -1 ?
                                    <DecimalsFormat
                                      value={balance}
                                      noTooltip={true}
                                      className={gridValueClassName}
                                    /> :
                                    '-'
                                  }
                                </span>
                                {
                                  balance > -1 && total_amount > 0 &&
                                  (
                                    <DecimalsFormat
                                      value={balance * 100 / total_amount}
                                      prefix="("
                                      suffix="%)"
                                      noTooltip={true}
                                      className="text-xs 3xl:text-lg mt-0.5"
                                    />
                                  )
                                }
                              </div> :
                              selected && !no_pool && !error &&
                              (pool_loading ?
                                <div className="mt-1">
                                  <TailSpin
                                    width="24"
                                    height="24"
                                    color={loaderColor(theme)}
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
            </div>
            <div className={metricClassName}>
              <span className={titleClassName}>
                My Position
              </span>
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${!(position_loading || pool_loading) ? 'pt-4' : ''}`}>
                {position_loading || pool_loading ?
                  <div>
                    <div className="mt-1">
                      <TailSpin
                        width="24"
                        height="24"
                        color={loaderColor(theme)}
                      />
                    </div>
                  </div> :
                  <>
                    <div className="flex flex-col space-y-1 3xl:space-y-1.5">
                      {lpTokenAddress && url ?
                        <a
                          href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs 3xl:text-lg font-medium"
                        >
                          Current Value ({currency.toUpperCase()})
                        </a> :
                        <span className="text-xs 3xl:text-lg font-medium">
                          Current Value ({currency.toUpperCase()})
                        </span>
                      }
                      {lpTokenAddress && url ?
                        <a
                          href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={gridValueClassName}
                        >
                          <DecimalsFormat
                            value={(lpTokenBalance || '0') * price}
                            prefix={currency_symbol}
                            className={gridValueClassName}
                          />
                        </a> :
                        <DecimalsFormat
                          value={(lpTokenBalance || '0') * price}
                          className={gridValueClassName}
                        />
                      }
                    </div>
                    <div className="flex flex-col space-y-1 3xl:space-y-1.5">
                      <span className="text-xs 3xl:text-lg font-medium">
                        Share
                      </span>
                      <DecimalsFormat
                        value={share}
                        suffix="%"
                        className={gridValueClassName}
                      />
                    </div>
                  </>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
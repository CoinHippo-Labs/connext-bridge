import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

import Spinner from '../spinner'
import NumberDisplay from '../number'
import Image from '../image'
import LineChart from '../charts/line'
import { ProgressBar } from '../progress-bars'
import { WRAPPED_PREFIX } from '../../lib/config'
import { getChainData, getAssetData } from '../../lib/object'
import { isNumber } from '../../lib/number'
import { toArray, numberToFixed, getTitle, equalsIgnoreCase } from '../../lib/utils'

const DAILY_METRICS = ['tvl', 'volume']
const TIMEFRAMES = [7, 30, 90]

export default ({ pool, userPools }) => {
  const { preferences, chains, assets, pool_assets, pools, pools_daily_stats, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, pool_assets: state.pool_assets, pools: state.pools, pools_daily_stats: state.pools_daily_stats, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { pool_assets_data } = { ...pool_assets }
  const { pools_data } = { ...pools }
  const { pools_daily_stats_data } = { ...pools_daily_stats }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }

  const [dailyMetric, setDailyMetric] = useState(_.head(DAILY_METRICS))
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1])

  const { chain, asset } = { ...pool }
  const chain_data = getChainData(chain, chains_data)
  const { chain_id, explorer, color } = { ...chain_data }
  const { url, contract_path } = { ...explorer }

  const selected = !!(chain && asset)
  const no_pool = selected && !getAssetData(asset, pool_assets_data, { chain_id })
  const pool_data = toArray(pools_data).find(d => d.chain_data?.id === chain && d.asset_data?.id === asset)
  const { asset_data, contract_data, domainId, canonicalHash, lpTokenAddress, supply, volume_value, error } = { ...pool_data }
  let { adopted, local } = { ...pool_data }
  const { contract_address, next_asset } = { ...contract_data }
  const pool_loading = selected && !no_pool && !error && !pool_data

  let { lpTokenBalance }  = { ...(pool_data && toArray(userPools).find(d => d.chain_data?.id === chain && d.asset_data?.id === asset)) }
  lpTokenBalance = lpTokenBalance || 0
  const share = isNumber(supply) ? parseFloat(numberToFixed(lpTokenBalance * 100 / supply)) : 0
  const position_loading = address && selected && !no_pool && !error && (!userPools || pool_loading)

  const pool_tokens_data = toArray(_.concat(adopted, local)).map((d, i) => {
    const { address, symbol, decimals, balance } = { ...d }
    return {
      i,
      contract_address: address,
      chain_id,
      symbol,
      decimals,
      image: (equalsIgnoreCase(address, contract_address) ? contract_data?.image : equalsIgnoreCase(address, next_asset?.contract_address) ? next_asset?.image || contract_data?.image : null) || asset_data?.image,
      balance,
    }
  })
  adopted = { ...adopted, asset_data: _.head(pool_tokens_data) }
  local = { ...local, asset_data: _.last(pool_tokens_data) }

  const native_asset = !adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local
  const wrapped_asset = adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local
  const native_amount = Number(native_asset?.balance) || 0
  const wrapped_amount = Number(wrapped_asset?.balance) || 0
  const total_amount = native_amount + wrapped_amount

  let { price } = { ...getAssetData(asset, assets_data) }
  price = price || 0
  const my_position_url = url && lpTokenAddress && `${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`
  const my_position_value = lpTokenBalance * price

  const stats_data = pools_daily_stats_data?.[`${dailyMetric}s`]
  const chartData = !pool_loading && stats_data && {
    data: toArray(stats_data).filter(d => equalsIgnoreCase(d.pool_id, canonicalHash) && d.domain === domainId).map(d => {
      const { day, balances, swap_day, volume } = { ...d }
      let time
      let value
      switch (dailyMetric) {
        case 'tvl':
          time = day
          value = _.sum(balances)
          break
        case 'volume':
        default:
          time = swap_day
          value = volume
          break
      }
      return { ...d, timestamp: moment(time).valueOf(), value }
    }).filter(d => moment().diff(moment(d.timestamp), 'days') <= timeframe),
    chain_data,
    asset_data: getAssetData(asset, assets_data),
    pool_data,
  }

  const metricClassName = 'bg-slate-50 dark:bg-slate-900 bg-opacity-60 dark:bg-opacity-60 rounded border dark:border-slate-800 flex flex-col space-y-12 3xl:space-y-16 py-5 3xl:py-8 px-4 3xl:px-6'
  const titleClassName = 'text-slate-400 dark:text-slate-200 text-base 3xl:text-xl font-medium'
  const valueClassName = 'text-lg sm:text-3xl 3xl:text-4xl font-semibold'
  const gridValueClassName = 'text-lg 3xl:text-2xl font-semibold'
  const boxShadow = `${color || '#e53f3f'}${theme === 'light' ? '44' : '33'} 0px 32px 128px 64px`

  return (
    <div className="sm:min-h-full bg-transparent space-y-0 3xl:space-y-2">
      <div className="w-32 sm:w-64 3xl:w-96 mx-auto sm:mr-8" style={{ boxShadow, WebkitBoxShadow: boxShadow, MozBoxShadow: boxShadow }} />
      <div className="grid grid-cols-2 gap-2">
        <div className={`${metricClassName} col-span-2 pt-6 pb-1`}>
          <LineChart
            id={dailyMetric}
            data={chartData}
            header={
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-8">
                <div className="w-fit border-b dark:border-slate-800 flex items-center justify-between space-x-4">
                  {DAILY_METRICS.map((m, i) => (
                    <div
                      key={i}
                      onClick={() => setDailyMetric(m)}
                      className={`w-fit cursor-pointer border-b-2 ${dailyMetric === m ? 'border-slate-300 dark:border-slate-200' : 'border-transparent text-slate-400 dark:text-slate-500'} text-base 3xl:text-xl font-medium pt-0 pb-3 px-2`}
                    >
                      {getTitle(m)}
                    </div>
                  ))}
                </div>
                <div className="w-fit border-b dark:border-slate-800 flex items-center justify-between space-x-4">
                  {TIMEFRAMES.map((t, i) => (
                    <div
                      key={i}
                      onClick={() => setTimeframe(t)}
                      className={`w-fit cursor-pointer border-b-2 ${timeframe === t ? 'border-slate-300 dark:border-slate-200' : 'border-transparent text-slate-400 dark:text-slate-500'} text-base 3xl:text-xl font-medium pt-0 pb-3 px-2`}
                    >
                      {t}D
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        </div>
        <div className={metricClassName}>
          <span className={titleClassName}>
            Pool Composition
          </span>
          <div className="space-y-3">
            {!(position_loading || pool_loading) && (
              <ProgressBar
                width={native_amount * 100 / total_amount}
                className="w-full 3xl:h-2 rounded-lg"
                backgroundClassName="3xl:h-2 rounded-lg"
                style={{ backgroundColor: asset_data?.color }}
                backgroundStyle={{ backgroundColor: `${asset_data?.color}33` }}
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {position_loading || pool_loading ?
                <Spinner /> :
                pool_tokens_data.map((d, i) => {
                  const { contract_address, symbol, image, balance } = { ...d }
                  const _url = `${url}${contract_path?.replace('{address}', contract_address)}`
                  return (
                    <div key={i} className="flex flex-col space-y-1">
                      <a
                        href={_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2"
                      >
                        {image && (
                          <Image
                            src={image}
                            width={16}
                            height={16}
                            className="3xl:w-5 3xl:h-5 rounded-full"
                          />
                        )}
                        <span className="text-xs 3xl:text-lg font-medium">
                          {symbol}
                        </span>
                      </a>
                      <a
                        href={_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={gridValueClassName}
                      >
                        {pool_data && !error ?
                          <div className="flex items-center space-x-1.5">
                            {balance > -1 && (
                              <>
                                <NumberDisplay
                                  value={balance}
                                  noTooltip={true}
                                  className={gridValueClassName}
                                />
                                {total_amount > 0 && (
                                  <NumberDisplay
                                    value={balance * 100 / total_amount}
                                    prefix="("
                                    suffix="%)"
                                    noTooltip={true}
                                    className="text-xs 3xl:text-lg mt-0.5"
                                  />
                                )}
                              </>
                            )}
                          </div> :
                          pool_loading && <Spinner />
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
              <Spinner /> :
              <>
                <div className="flex flex-col space-y-1 3xl:space-y-1.5">
                  {my_position_url ?
                    <a
                      href={my_position_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs 3xl:text-lg font-medium"
                    >
                      Current Value (USD)
                    </a> :
                    <span className="text-xs 3xl:text-lg font-medium">
                      Current Value (USD)
                    </span>
                  }
                  {my_position_url ?
                    <a
                      href={my_position_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={gridValueClassName}
                    >
                      <NumberDisplay
                        value={my_position_value}
                        prefix="$"
                        noTooltip={true}
                        className={gridValueClassName}
                      />
                    </a> :
                    <NumberDisplay
                      value={my_position_value}
                      prefix="$"
                      noTooltip={true}
                      className={gridValueClassName}
                    />
                  }
                </div>
                <div className="flex flex-col space-y-1 3xl:space-y-1.5">
                  <span className="text-xs 3xl:text-lg font-medium">
                    Share
                  </span>
                  <NumberDisplay
                    value={share}
                    suffix="%"
                    noTooltip={true}
                    className={gridValueClassName}
                  />
                </div>
              </>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
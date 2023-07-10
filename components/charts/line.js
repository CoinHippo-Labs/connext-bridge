import { useState, useEffect } from 'react'
import { ResponsiveContainer, AreaChart, linearGradient, stop, XAxis, Area, Tooltip } from 'recharts'
import _ from 'lodash'
import moment from 'moment'

import Spinner from '../spinner'
import NumberDisplay from '../number'
import Image from '../image'
import { toArray, equalsIgnoreCase } from '../../lib/utils'

export default (
  {
    id = 'tvl',
    data,
    field = 'value',
    title = '',
    description = '',
    dateFormat = 'D MMM',
    header,
  },
) => {
  const [chartData, setChartData] = useState(null)
  const [x, setX] = useState(null)

  useEffect(
    () => {
      if (data) {
        const _data = data.data
        setChartData(
          toArray(_data).map((d, i) => {
            const { timestamp } = { ...d }
            const time = moment(timestamp).utc()
            const time_string = time.format(dateFormat)
            return { ...d, time_string }
          })
        )
      }
    },
    [data],
  )

  const CustomTooltip = ({ active, payload }) => {
    if (active) {
      const { balances, volume, swap_count, time_string } = { ..._.head(payload)?.payload }
      const { pool_data } = { ...data }
      const { contract_data, adopted, local } = { ...pool_data }
      const { contract_address, next_asset } = { ...contract_data }

      let component
      switch (id) {
        case 'tvl':
          component = contract_data && (
            <>
              <div className="flex items-center space-x-2">
                {contract_data.image && (
                  <Image
                    src={contract_data.image}
                    width={18}
                    height={18}
                    className="3xl:w-6 3xl:h-6 rounded-full"
                  />
                )}
                <NumberDisplay
                  value={balances?.[(equalsIgnoreCase(contract_address, adopted?.address) ? adopted : local)?.index]}
                  maxDecimals={2}
                  noTooltip={true}
                  className="text-base 3xl:text-2xl font-semibold"
                />
              </div>
              <div className="flex items-center space-x-2">
                {next_asset?.image && (
                  <Image
                    src={next_asset.image}
                    width={18}
                    height={18}
                    className="3xl:w-6 3xl:h-6 rounded-full"
                  />
                )}
                <NumberDisplay
                  value={balances?.[(equalsIgnoreCase(next_asset?.contract_address, adopted?.address) ? adopted : local)?.index]}
                  maxDecimals={2}
                  noTooltip={true}
                  className="text-base 3xl:text-2xl font-semibold"
                />
              </div>
            </>
          )
          break
        case 'volume':
          component = (
            <>
              <div className="flex flex-col space-y-1">
                <span className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                  Volume
                </span>
                <NumberDisplay
                  value={volume}
                  maxDecimals={2}
                  noTooltip={true}
                  className="text-base 3xl:text-2xl font-semibold"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                  No. Transactions
                </span>
                <NumberDisplay
                  value={swap_count}
                  className="text-base 3xl:text-2xl font-semibold"
                />
              </div>
            </>
          )
          break
        default:
          break
      }

      return component && (
        <div className="bg-slate-100 dark:bg-slate-800 dark:bg-opacity-75 border border-slate-200 dark:border-slate-800 flex flex-col space-y-2 p-2">
          <span className="leading-4 whitespace-nowrap text-slate-600 dark:text-slate-200 text-base 3xl:text-2xl font-medium">
            {time_string}
          </span>
          {component}
        </div>
      )
    }
    else {
      return null
    }
  }

  const { chain_data, asset_data } = { ...data }
  const { color } = { ...chain_data }
  const d = toArray(chartData).find(d => d.timestamp === x)

  let focus_value
  let focus_time_string
  if (d) {
    focus_value = d[field]
    focus_time_string = d.time_string
  }
  else if (chartData) {
    const _data = _.last(chartData)
    switch (id) {
      case 'tvl':
        focus_value = _data?.[field]
        focus_time_string = _data?.time_string
        break
      case 'volume':
        focus_value = _.sumBy(chartData, field)
        focus_time_string = toArray(_.concat(_.head(chartData)?.time_string, _data?.time_string)).join(' - ')
      default:
        break
    }
  }
  const gradient_id = `gradient-${id}`

  return (
    <div className="bg-transparent rounded space-y-2">
      <div className="flex items-start justify-between space-x-1">
        {header || (
          <div className="flex flex-col space-y-0.5">
            <span className="3xl:text-2xl font-semibold">
              {title}
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl">
              {description}
            </span>
          </div>
        )}
        {typeof focus_value === 'number' && (
          <div className="flex flex-col items-end space-y-0.5">
            <div className="flex items-center space-x-2">
              <NumberDisplay
                value={focus_value}
                maxDecimals={2}
                noTooltip={true}
                className="text-base 3xl:text-2xl font-semibold"
              />
              {asset_data?.image && (
                <Image
                  src={asset_data.image}
                  width={18}
                  height={18}
                  className="3xl:w-6 3xl:h-6 rounded-full"
                />
              )}
            </div>
            <span className="leading-4 whitespace-nowrap text-slate-400 dark:text-slate-500 text-2xs sm:text-sm 3xl:text-xl font-medium text-right">
              {focus_time_string}
            </span>
          </div>
        )}
      </div>
      <div className="w-full h-64">
        {chartData ?
          <ResponsiveContainer>
            <AreaChart
              data={chartData}
              onMouseEnter={e => setX(_.head(e?.activePayload)?.payload?.timestamp)}
              onMouseMove={e => setX(_.head(e?.activePayload)?.payload?.timestamp)}
              onMouseLeave={() => setX(null)}
              margin={{ top: 2, right: 2, bottom: 4, left: 2 }}
              className="small-x"
            >
              <defs>
                <linearGradient id={gradient_id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="50%" stopColor={color} stopOpacity={0.66} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.33} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time_string" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Area type="basis" dataKey={field} stroke={color} fillOpacity={0.2} fill={`url(#${gradient_id})`} />
            </AreaChart>
          </ResponsiveContainer> :
          <div className="w-full h-4/5 flex items-center justify-center">
            <Spinner width={36} height={36} />
          </div>
        }
      </div>
    </div>
  )
}
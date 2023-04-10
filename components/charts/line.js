import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import {
  ResponsiveContainer,
  AreaChart,
  linearGradient,
  stop,
  XAxis,
  Area,
  Tooltip,
} from 'recharts'
import { TailSpin } from 'react-loader-spinner'

import DecimalsFormat from '../decimals-format'
import Image from '../image'
import { currency_symbol } from '../../lib/object/currency'
import { toArray, equalsIgnoreCase, loaderColor } from '../../lib/utils'

const CustomTooltip = (
  {
    id,
    chartData,
    active,
    payload,
    label,
  },
) => {
  if (active) {
    const {
      balances,
      volume,
      swap_count,
      time_string,
    } = { ..._.head(payload)?.payload }

    const {
      pool_data,
    } = { ...chartData }

    const {
      contract_data,
      adopted,
      local,
    } = { ...pool_data }

    const {
      contract_address,
      next_asset,
    } = { ...contract_data }

    let component

    switch (id) {
      case 'tvl':
        component = (
          contract_data &&
          <>
            <div className="flex items-center space-x-2">
              {
                contract_data.image &&
                (
                  <Image
                    src={contract_data.image}
                    width={18}
                    height={18}
                    className="3xl:w-6 3xl:h-6 rounded-full"
                  />
                )
              }
              <DecimalsFormat
                value={balances?.[(equalsIgnoreCase(contract_address, adopted?.address) ? adopted : local)?.index]}
                maxDecimals={2}
                className="text-base 3xl:text-2xl font-semibold"
              />
            </div>
            <div className="flex items-center space-x-2">
              {
                next_asset?.image &&
                (
                  <Image
                    src={next_asset.image}
                    width={18}
                    height={18}
                    className="3xl:w-6 3xl:h-6 rounded-full"
                  />
                )
              }
              <DecimalsFormat
                value={balances?.[(equalsIgnoreCase(next_asset?.contract_address, adopted?.address) ? adopted : local)?.index]}
                maxDecimals={2}
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
              <DecimalsFormat
                value={volume}
                maxDecimals={2}
                className="text-base 3xl:text-2xl font-semibold"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                No. Transactions
              </span>
              <DecimalsFormat
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
    return (
      component &&
      (
        <div className="bg-slate-100 dark:bg-slate-800 dark:bg-opacity-75 border border-slate-200 dark:border-slate-800 flex flex-col space-y-2 p-2">
          <span className="leading-4 whitespace-nowrap text-slate-600 dark:text-slate-200 text-base 3xl:text-2xl font-medium">
            {time_string}
          </span>
          {component}
        </div>
      )
    )
  }

  return null
}

export default (
  {
    id = 'tvl',
    title = '',
    description = '',
    dateFormat = 'D MMM',
    valueField = 'value',
    isCumulative = false,
    chartData,
    header,
  },
) => {
  const {
    preferences,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }

  const [data, setData] = useState(null)
  const [xFocus, setXFocus] = useState(null)

  useEffect(
    () => {
      if (chartData) {
        const {
          data,
        } = { ...chartData }

        setData(
          toArray(data)
            .map((d, i) => {
              const {
                timestamp,
              } = { ...d }

              return {
                ...d,
                time_string: moment(timestamp).utc().format(dateFormat),
              }
            })
        )
      }
    },
    [chartData],
  )

  const d = toArray(data).find(d => d.timestamp === xFocus)

  let focus_value, focus_time_string, maxDecimals

  if (d || isCumulative) {
    focus_value = (d || _.last(data))?.[valueField]
    focus_time_string = (d || _.last(data))?.time_string
  }
  else if (data) {
    switch (id) {
      case 'tvl':
        focus_value = _.last(data)?.[valueField]
        focus_time_string = _.last(data)?.time_string
        maxDecimals = 2
        break
      case 'volume':
        focus_value = _.sumBy(data, valueField)
        focus_time_string = toArray(_.concat(_.head(data)?.time_string, _.last(data)?.time_string)).join(' - ')
        maxDecimals = 0
      default:
        break
    }
  }

  const {
    chain_data,
    asset_data,
  } = { ...chartData }

  const {
    color,
  } = { ...chain_data }

  return (
    <div className="bg-transparent rounded space-y-2">
      <div className="flex items-start justify-between space-x-1">
        {
          header ||
          (
            <div className="flex flex-col space-y-0.5">
            <span className="3xl:text-2xl font-semibold">
              {title}
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl">
              {description}
            </span>
          </div>
          )
        }
        {
          typeof focus_value === 'number' &&
          (
            <div className="flex flex-col items-end space-y-0.5">
              <div className="flex items-center space-x-2">
                <DecimalsFormat
                  value={focus_value}
                  maxDecimals={maxDecimals}
                  className="uppercase text-base 3xl:text-2xl font-semibold"
                />
                {
                  asset_data?.image &&
                  (
                    <Image
                      src={asset_data.image}
                      width={18}
                      height={18}
                      className="3xl:w-6 3xl:h-6 rounded-full"
                    />
                  )
                }
              </div>
              <span className="leading-4 whitespace-nowrap text-slate-400 dark:text-slate-500 text-2xs sm:text-sm 3xl:text-xl font-medium text-right">
                {focus_time_string}
              </span>
            </div>
          )
        }
      </div>
      <div className="w-full h-64">
        {data ?
          <ResponsiveContainer>
            <AreaChart
              data={data}
              onMouseEnter={
                e => {
                  if (e) {
                    const {
                      timestamp,
                    } = { ..._.head(e.activePayload)?.payload }

                    setXFocus(timestamp)
                  }
                }
              }
              onMouseMove={
                e => {
                  if (e) {
                    const {
                      timestamp,
                    } = { ..._.head(e.activePayload)?.payload }

                    setXFocus(timestamp)
                  }
                }
              }
              onMouseLeave={() => setXFocus(null)}
              margin={
                {
                  top: 2,
                  right: 2,
                  bottom: 4,
                  left: 2,
                }
              }
              className="small-x"
            >
              <defs>
                <linearGradient
                  id={`gradient-${id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="50%"
                    stopColor={color}
                    stopOpacity={0.66}
                  />
                  <stop
                    offset="100%"
                    stopColor={color}
                    stopOpacity={0.33}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time_string"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    id={id}
                    chartData={chartData}
                  />
                }
                cursor={
                  {
                    fill: 'transparent',
                  }
                }
              />
              <Area
                type="basis"
                dataKey={valueField}
                stroke={color}
                fillOpacity={0.2}
                fill={`url(#gradient-${id})`}
              />
            </AreaChart>
          </ResponsiveContainer> :
          <div className="w-full h-4/5 flex items-center justify-center">
            <TailSpin
              width="36"
              height="36"
              color={loaderColor(theme)}
            />
          </div>
        }
      </div>
    </div>
  )
}
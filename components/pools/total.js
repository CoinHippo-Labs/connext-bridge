import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { RotatingTriangles } from 'react-loader-spinner'

import { currency_symbol } from '../../lib/object/currency'
import { number_format, loader_color } from '../../lib/utils'

export default () => {
  const {
    preferences,
    pools,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        pools: state.pools,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    pools_data,
  } = { ...pools }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 rounded-xl shadow dark:shadow-slate-400 gap-4 p-4">
      <div className="flex flex-col space-y-0.5">
        <span className="text-slate-600 dark:text-slate-300 text-base font-medium">
          Total Liquidity
        </span>
        <span className="text-lg font-semibold">
          {pools_data ?
            <>
              {number_format(
                _.sumBy(
                  pools_data,
                  'liquidity',
                ),
                '0,0.000000',
                true,
              )}
            </> :
            <div className="mt-1">
              <RotatingTriangles
                color={loader_color(theme)}
                width="24"
                height="24"
              />
            </div>
          }
        </span>
      </div>
      <div className="flex flex-col space-y-0.5">
        <span className="text-slate-600 dark:text-slate-300 text-base font-medium">
          Fee Earnings
        </span>
        <span className="text-lg font-semibold">
          {pools_data ?
            <>
              {currency_symbol}
              {number_format(
                _.sumBy(
                  pools_data,
                  'fees',
                ),
                '0,0.000000',
                true,
              )}
            </> :
            <div className="mt-1">
              <RotatingTriangles
                color={loader_color(theme)}
                width="24"
                height="24"
              />
            </div>
          }
        </span>
      </div>
      <div className="flex flex-col space-y-0.5">
        <span className="text-slate-600 dark:text-slate-300 text-base font-medium">
          APY
        </span>
        <span className="text-lg font-semibold">
          {pools_data ?
            <>
              {number_format(
                _.meanBy(
                  pools_data,
                  'apy.day',
                ),
                '0,0.000000',
                true,
              )}
              %
            </> :
            <div className="mt-1">
              <RotatingTriangles
                color={loader_color(theme)}
                width="24"
                height="24"
              />
            </div>
          }
        </span>
      </div>
    </div>
  )
}
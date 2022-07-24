import { useSelector, shallowEqual } from 'react-redux'
import { TailSpin } from 'react-loader-spinner'

import { currency_symbol } from '../../lib/object/currency'
import { number_format, loader_color } from '../../lib/utils'

export default ({ data }) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  return (
    <div className="rounded-2xl py-2">
      {data ?
        <div className="grid grid-flow-row grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
              Rate
            </span>
            <span className="text-lg font-bold">
              {number_format(0, '0,0.000000')}
            </span>
          </div>
          <div className="flex flex-col space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
              Slippage Tolerance
            </span>
            <span className="text-lg font-bold">
              {number_format(0, '0,0.00')}%
            </span>
          </div>
          <div className="flex flex-col space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
              Price Impact
            </span>
            <span className="text-lg font-bold">
              {number_format(0, '0,0.00')}%
            </span>
          </div>
          <div className="flex flex-col space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
              Minimum Received
            </span>
            <span className="text-lg font-bold">
              {currency_symbol}{number_format(0, '0,0.000000')}
            </span>
          </div>
        </div> :
        <TailSpin color={loader_color(theme)} width="36" height="36" />
      }
    </div>
  )
}
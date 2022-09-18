import { useSelector, shallowEqual } from 'react-redux'
import { TailSpin, RotatingTriangles } from 'react-loader-spinner'

import { number_format, loader_color } from '../../lib/utils'

export default ({
  data,
  amount_received,
  asset_data,
}) => {
  const {
    preferences,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }

  const {
    rate,
    slippage,
    price_impact,
  } = { ...data }

  return (
    <div className="rounded-2xl pt-1">
      {data ?
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500 text-base font-medium">
              Rate
            </span>
            <span className="text-lg font-semibold">
              {number_format(
                rate,
                '0,0.000000',
                true,
              )}
            </span>
          </div>
          <div className="flex flex-col space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500 text-base font-medium">
              Slippage Tolerance
            </span>
            <span className="text-lg font-semibold">
              {number_format(
                slippage,
                '0,0.000000',
                true,
              )}%
            </span>
          </div>
          <div className="flex flex-col space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500 text-base font-medium">
              Price Impact
            </span>
            <span className="text-lg font-semibold">
              {number_format(
                price_impact,
                '0,0.000000',
                true,
              )}%
            </span>
          </div>
          <div className="flex flex-col space-y-0.5">
            <span className="text-slate-400 dark:text-slate-500 text-base font-medium">
              Minimum Received
            </span>
            <span className="flex items-center whitespace-nowrap text-lg font-semibold space-x-2">
              {typeof amount_received === 'boolean' ?
                <RotatingTriangles
                  color="white"
                  width="24"
                  height="24"
                /> :
                <span>
                  {number_format(
                    amount_received *
                    (
                      100 -
                      (slippage || 0)
                    ) /
                    100,
                    '0,0.00000000',
                    true,
                  )}
                </span>
              }
              <span className="hidden sm:block text-sm">
                {asset_data?.symbol}
              </span>
            </span>
          </div>
        </div> :
        <div className="flex items-center justify-center">
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
import { useSelector, shallowEqual } from 'react-redux'
import { Oval } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'

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
    <div className="space-y-2">
      {/*<div className="flex items-center space-x-2 sm:mx-3">
        <span className="tracking-wider whitespace-nowrap text-slate-400 dark:text-slate-600 font-normal">
          Swap Breakdown
        </span>
      </div>
      <div className="w-full h-0.25 bg-gray-200 dark:bg-slate-700 sm:px-1" />*/}
      <div className="space-y-2.5 sm:mx-3">
        {
          data &&
          (
            <>
              {/*<div className="flex items-center justify-between space-x-1">
                <div className="tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-200 font-medium">
                  Minimum Received
                </div>
                {typeof amount_received === 'boolean' ?
                  <div className="flex items-center space-x-1.5">
                    <span className="tracking-wider text-slate-600 dark:text-slate-200 font-medium">
                      estimating
                    </span>
                    <Oval
                      color={loader_color(theme)}
                      width="20"
                      height="20"
                    />
                  </div> :
                  <span className="whitespace-nowrap tracking-wider text-xs font-semibold space-x-1.5">
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
                    <span>
                      {asset_data?.symbol}
                    </span>
                  </span>
                }
              </div>*/}
              <div className="flex items-center justify-between space-x-1">
                <div className="tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-200 font-medium">
                  Rate
                </div>
                <span className="whitespace-nowrap tracking-wider text-xs font-semibold space-x-1.5">
                  <span>
                    {number_format(
                      rate,
                      '0,0.000000',
                      true,
                    )}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between space-x-1">
                <div className="tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-200 font-medium">
                  Price Impact
                </div>
                <span className="whitespace-nowrap tracking-wider text-xs font-semibold space-x-1.5">
                  <span>
                    {number_format(
                      price_impact,
                      '0,0.000000',
                      true,
                    )}
                    %
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between space-x-1">
                <Tooltip
                  placement="top"
                  content="The maximum percentage you are willing to lose due to market changes."
                  className="z-50 bg-black text-white text-xs"
                >
                  <div className="tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-200 font-medium">
                    Slippage Tolerance
                  </div>
                </Tooltip>
                <span className="whitespace-nowrap tracking-wider text-xs font-semibold space-x-1.5">
                  <span>
                    {number_format(
                      slippage,
                      '0,0.000000',
                      true,
                    )}
                    %
                  </span>
                </span>
              </div>
            </>
          )
        }
      </div>
    </div>
  )
}
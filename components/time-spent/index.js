import { useState, useEffect } from 'react'
import moment from 'moment'
import { Tooltip } from '@material-tailwind/react'

import { totalTimeString } from '../../lib/utils'

export default (
  {
    fromTime,
    toTime,
    noTooltip = false,
    placement = 'top',
    title = 'time',
    titleClassName = 'normal-case text-xs font-semibold',
    className = 'normal-case text-slate-400 dark:text-slate-600 font-medium',
  },
) => {
  const [trigger, setTrigger] = useState(false)

  useEffect(
    () => {
      const timeout =
        setTimeout(
          () => setTrigger(!trigger),
          1 * 1000,
        )

      return () => clearTimeout(timeout)
    },
    [trigger],
  )

  const from_time = typeof fromTime === 'number' && moment(fromTime * 1000)
  const to_time = moment(toTime ? !isNaN(toTime) ? Number(toTime) * 1000 : toTime : undefined)

  const time_string = totalTimeString(fromTime, toTime || moment().unix())

  return (
    from_time &&
    to_time &&
    (!noTooltip ?
      <Tooltip
        placement={placement}
        content={
          <div className="flex flex-col space-y-1 my-1">
            <div className={titleClassName}>
              {title}
            </div>
            <div className={className}>
              <div className="w-38 whitespace-nowrap text-2xs font-medium space-x-1">
                <span>
                  {from_time.format('MMM D, YYYY h:mm:ss A')}
                </span>
                <span>
                  -
                </span>
                <span>
                  {to_time.format('MMM D, YYYY h:mm:ss A')}
                </span>
              </div>
            </div>
          </div>
        }
        className="z-50 bg-dark text-white text-xs"
      >
        <div className={className}>
          {time_string}
        </div>
      </Tooltip> :
      <div className={className}>
        {time_string}
      </div>
    )
  )
}
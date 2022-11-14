import { useState, useEffect } from 'react'
import moment from 'moment'
import { Tooltip } from '@material-tailwind/react'

import { total_time_string } from '../../lib/utils'

export default ({
  from_time,
  to_time,
  no_tooltip = false,
  placement = 'top',
  title = 'time',
  titleClassName = 'normal-case text-xs font-semibold',
  className = 'normal-case text-slate-400 dark:text-slate-600 font-normal',
}) => {
  const [trigger, setTrigger] = useState(false)

  useEffect(() => {
    const timeout =
      setTimeout(() =>
        setTrigger(!trigger),
        1 * 1000,
      )

    return () => clearTimeout(timeout)
  }, [trigger])

  const _from_time =
    typeof from_time === 'number' &&
    moment(
      !isNaN(from_time) ?
        Number(from_time) * 1000 :
        from_time
    )

  const _to_time =
    moment(
      to_time ?
        !isNaN(to_time) ?
          Number(to_time) * 1000 :
          to_time :
        undefined
    )

  const time_string =
    total_time_string(
      from_time,
      to_time ||
      moment()
        .unix(),
    )

  return (
    _from_time &&
    _to_time &&
    (
      !no_tooltip ?
        <Tooltip
          placement={placement}
          content={
            <div className="flex flex-col space-y-1 my-1">
              <div className={titleClassName}>
                {title}
              </div>
              <div className={className}>
                <div className="w-38 whitespace-nowrap text-2xs font-normal space-x-1">
                  <span>
                    {
                      _from_time
                        .format('MMM D, YYYY h:mm:ss A')
                    }
                  </span>
                  <span>
                    -
                  </span>
                  <span>
                    {
                      _to_time
                        .format('MMM D, YYYY h:mm:ss A')
                    }
                  </span>
                </div>
              </div>
            </div>
          }
          className="z-50 bg-black text-white text-xs"
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
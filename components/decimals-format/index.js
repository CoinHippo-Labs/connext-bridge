import _ from 'lodash'
import { Tooltip } from '@material-tailwind/react'

export default (
  {
    value,
    delimiter = '.',
    max_decimals = 6,
    prefix = '',
    suffix = '',
    placement = 'top',
    className = 'whitespace-nowrap text-xs font-semibold',
  },
) => {
  let _value =
    typeof value === 'string' ?
      value :
      typeof value === 'number' ?
        value
          .toString() :
        undefined

  if (
    typeof _value === 'string' &&
    _value.includes(delimiter) &&
    !_value.endsWith(delimiter)
  ) {
    const decimals =
      _.last(
        _value
          .split(delimiter)
      )

    const value_number =
      Number(
        _value
          .split(',')
          .join('')
      )

    if (
      value_number >=
      Math.pow(
        10,
        -max_decimals,
      )
    ) {
      if (decimals.length > max_decimals) {
        _value =
          value_number
            .toFixed(max_decimals)
      }
      else {
        _value = undefined
      }
    }
    else {
      if (decimals.length > max_decimals) {
        _value =
          `<${
            max_decimals > 0 ?
              `0${delimiter}${
                _.range(max_decimals - 1)
                  .map(i => '0')
                  .join('')
              }` :
              ''
          }1`
      }
      else {
        _value = undefined
      }
    }

    while (
      _value?.includes(delimiter) &&
      _value.endsWith('0') &&
      !_value.endsWith(`${delimiter}00`)
    ) {
      _value =
        _value
          .substring(
            0,
            _value.length - 1,
          )
    }

    if (_value?.endsWith(`${delimiter}0`)) {
      _value =
        _.head(
          _value
            .split(delimiter)
        )
    }
  }
  else {
    _value = undefined
  }

  if (
    typeof value === 'string' &&
    value.endsWith(`${delimiter}0`)
  ) {
    value =
      _.head(
        value
          .split(delimiter)
      )
  }

  return (
    typeof _value === 'string' ?
      <Tooltip
        placement={placement}
        content={
          `${prefix}${
            value
              .toString()
          }${suffix}`
        }
        className="z-50 bg-dark text-white text-xs"
      >
        <span className={className}>
          {`${prefix}${_value}${suffix}`}
        </span>
      </Tooltip> :
      <span className={className}>
        {`${prefix}${value}${suffix}`}
      </span>
  )
}
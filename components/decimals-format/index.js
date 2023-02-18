import _ from 'lodash'
import { Tooltip } from '@material-tailwind/react'

import { split, numberFormat } from '../../lib/utils'

export default (
  {
    value,
    delimiter = '.',
    maxDecimals,
    prefix = '',
    suffix = '',
    noTooltip = false,
    placement = 'top',
    className = 'whitespace-nowrap text-xs font-semibold',
  },
) => {
  let _value =
    typeof value === 'string' ?
      value :
      typeof value === 'number' ?
        value.toString() :
        undefined

  if (
    typeof _value === 'string' &&
    _value.includes(delimiter) &&
    !_value.endsWith(delimiter)
  ) {
    const decimals = _.last(_value.split(delimiter))
    const value_number = Number(split(_value).join(''))

    if (typeof maxDecimals !== 'number') {
      if (value_number >= 1000) {
        maxDecimals = 0
      }
      else if (value_number >= 1) {
        maxDecimals = 2
      }
      else {
        maxDecimals = 6
      }
    }

    if (Math.abs(value_number) >= Math.pow(10, -maxDecimals)) {
      if (decimals.length > maxDecimals) {
        _value = value_number.toFixed(maxDecimals)
      }
      else {
        _value = undefined
      }
    }
    else {
      if (decimals.length > maxDecimals) {
        _value =
          `<${
            maxDecimals > 0 ?
              `0${delimiter}${
                _.range(maxDecimals - 1)
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
      _value = _value.substring(0, _value.length - 1)
    }

    if (_value?.endsWith(`${delimiter}0`)) {
      _value = _.head(_value.split(delimiter))
    }
  }
  else {
    _value = undefined
  }

  if (typeof value === 'string' && value.endsWith(`${delimiter}0`)) {
    value = _.head(value.split(delimiter))
  }

  if (_value && Number(_value) >= 1000) {
    _value = numberFormat(_value, '0,0.00', true)
  }
  else if (value && Number(value) >= 1000) {
    value = numberFormat(value, '0,0.00', true)
  }

  return (
    typeof _value === 'string' ?
      !noTooltip ?
        <Tooltip
          placement={placement}
          content={`${prefix}${value.toString()}${suffix}`}
          className="z-50 bg-dark text-white text-xs"
        >
          <span className={className}>
            {`${prefix}${_value}${suffix}`}
          </span>
        </Tooltip> :
        <span className={className}>
          {`${prefix}${_value}${suffix}`}
        </span> :
      <span className={className}>
        {`${prefix}${value}${suffix}`}
      </span>
  )
}
import { Tooltip } from '@material-tailwind/react'
import _ from 'lodash'

import { split, numberFormat } from '../../lib/utils'

const LARGE_NUMBER_THRESHOLD = 1000

export default (
  {
    value,
    format = '0,0.00',
    delimiter = '.',
    maxDecimals,
    prefix = '',
    suffix = '',
    noTooltip = false,
    placement = 'top',
    tooltipContent = '',
    className = 'whitespace-nowrap text-sm 3xl:text-xl font-semibold',
  },
) => {
  const valid = !isNaN(value)
  let _value = ['string', 'number'].includes(typeof value) ? value.toString() : undefined

  if (typeof _value === 'string' && _value.includes(delimiter) && !_value.endsWith(delimiter)) {
    const value_number = Number(split(_value).join(''))
    const decimals = _.last(_value.split(delimiter))
    maxDecimals = typeof maxDecimals !== 'number' ? value_number >= LARGE_NUMBER_THRESHOLD ? 0 : value_number >= 1 ? 2 : 6 : maxDecimals

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
        _value = `<${maxDecimals > 0 ? `0${delimiter}${_.range(maxDecimals - 1).map(i => '0').join('')}` : ''}1`
      }
      else {
        _value = undefined
      }
    }

    while (_value?.includes(delimiter) && _value.endsWith('0') && !_value.endsWith(`${delimiter}00`)) {
      _value = _value.substring(0, _value.length - 1)
    }
    if (_value?.endsWith(`${delimiter}0`) || _value?.endsWith(delimiter)) {
      _value = _.head(_value.split(delimiter))
    }
  }
  else {
    _value = undefined
  }

  if (typeof value === 'string' && value.endsWith(`${delimiter}0`)) {
    value = _.head(value.split(delimiter))
  }
  if (_value && Number(_value) >= LARGE_NUMBER_THRESHOLD) {
    _value = numberFormat(_value, format, true)
  }
  else if (value && Number(value) >= LARGE_NUMBER_THRESHOLD) {
    value = numberFormat(value, format, true)
  }

  return valid && (
    typeof _value === 'string' ?
      !noTooltip || tooltipContent ?
        <Tooltip
          placement={placement}
          content={tooltipContent || `${prefix}${value.toString()}${suffix}`}
        >
          <span className={className}>
            {`${prefix}${_value}${suffix}`}
          </span>
        </Tooltip> :
        <span className={className}>
          {`${prefix}${_value}${suffix}`}
        </span> :
      tooltipContent ?
        <Tooltip
          placement={placement}
          content={tooltipContent}
        >
          <span className={className}>
            {![undefined, null].includes(value) ? `${prefix}${value}${suffix}` : '-'}
          </span>
        </Tooltip> :
        <span className={className}>
          {![undefined, null].includes(value) ? `${prefix}${value}${suffix}` : '-'}
        </span>
  )
}
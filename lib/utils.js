import { utils } from 'ethers'
const { formatUnits } = { ...utils }
import numeral from 'numeral'
import _ from 'lodash'
import moment from 'moment'

const toCase = (string, to_case = 'normal') => {
  if (typeof string === 'string') {
    string = string.trim()
    switch (to_case) {
      case 'upper':
        string = string.toUpperCase()
        break
      case 'lower':
        string = string.toLowerCase()
        break
      default:
        break
    }
  }
  return string
}

export const split = (
  string,
  to_case = 'normal',
  delimiter = ',',
  filter_blank = true,
) =>
  (typeof string !== 'string' && ![undefined, null].includes(string) ?
    [string] :
    (typeof string === 'string' ? string : '').split(delimiter).map(s => toCase(s, to_case))
  )
  .filter(s => !filter_blank || s)

export const toArray = (
  x,
  to_case = 'normal',
  delimiter = ',',
  filter_blank = true,
) =>
  Array.isArray(x) ?
    x.map(v => toCase(v, to_case)).filter(v => !filter_blank || v) :
    split(x, to_case, delimiter, filter_blank)

export const find = (x, list = []) => list.find(_x => typeof x === 'string' ? equalsIgnoreCase(_x, x) : _x === x)

export const includesStringList = (x, list = []) => toArray(list).findIndex(s => toArray(x).findIndex(_x => _x.includes(s)) > -1) > -1

export const removeDecimal = number => {
  if (typeof number === 'number') {
    number = number.toString()
  }

  if (number.includes('NaN')) {
    return number.replace('NaN', '< 0.00000001')
  }
  if (typeof number === 'string') {
    if (number.indexOf('.') > -1) {
      let decimal = number.substring(number.indexOf('.') + 1)
      while (decimal.endsWith('0')) {
        decimal = decimal.substring(0, decimal.length - 1)
      }

      if (number.substring(0, number.indexOf('.')).length >= 7 && decimal.length > 2 && !isNaN(`0.${decimal}`)) {
        decimal = Number(`0.${decimal}`).toFixed(2)
        if (decimal.indexOf('.') > -1) {
          decimal = decimal.substring(decimal.indexOf('.') + 1)
          while (decimal.endsWith('0')) {
            decimal = decimal.substring(0, decimal.length - 1)
          }
        }
      }
      return `${number.substring(0, number.indexOf('.'))}${decimal ? '.' : ''}${decimal}`
    }
    return number
  }
  return ''
}

const toDecimal = n => {
  const sign = Math.sign(n)
  if (/\d+\.?\d*e[\+\-]*\d+/i.test(n)) {
    const zero = '0'
    const parts = String(n).toLowerCase().split('e')
    const e = parts.pop()
    let l = Math.abs(e)
    const direction = e / l
    const coeff_array = parts[0].split('.')
    if (direction === -1) {
      coeff_array[0] = Math.abs(coeff_array[0])
      n = `${zero}.${new Array(l).join(zero)}${coeff_array.join('')}`
    }
    else {
      const dec = coeff_array[1]
      if (dec) {
        l = l - dec.length
      }
      n = `${coeff_array.join('')}${new Array(l + 1).join(zero)}`
    }
  }
  return sign < 0 ? -n : n
}

export const numberFormat = (number, format, is_exact) => {
  if (number === Infinity) {
    return number.toString()
  }
  let formatted_number = numeral(number).format(format.includes('.000') && Math.abs(Number(number)) >= 1.01 ? format.substring(0, format.indexOf('.') + (is_exact ? 7 : 3)) : format === '0,0' && Number(number) < 1 ? '0,0.00' : format)
  if (['NaN', 'e+', 'e-', 't'].findIndex(s => formatted_number.includes(s)) > -1) {
    formatted_number = number.toString()
    if (formatted_number.includes('e-')) {
      formatted_number = toDecimal(number)
    }
    else if (formatted_number.includes('e+')) {
      const [n, e] = formatted_number.split('e+')
      if (Number(e) <= 72) {
        const fixed_decimals = 2
        let _number = `${parseInt(Number(Number(n).toFixed(fixed_decimals)) * Math.pow(10, fixed_decimals))}${_.range(Number(e)).map(i => '0').join('')}`
        _number = Number(formatUnits(BigInt(_number), 16 + fixed_decimals))
        const _format = `0,0${_number >= 100000 ? '.00a' : _number >= 100 ? '' : _number >= 1 ? '.00' : '.000000'}`
        return `${numberFormat(_number, _format)}t`
      }
      else {
        return numeral(number).format('0,0e+0')
      }
    }
    else {
      return numeral(number).format(`0,0${number < 1 ? '.00' : ''}a`)
    }
  }
  else if (typeof number === 'number' && ['a', '+'].findIndex(c => format.includes(c)) < 0 && Number(split(formatted_number).join('')).toString() !== removeDecimal(split(formatted_number).join(''))) {
    formatted_number = number.toString()
  }
  let string = removeDecimal(formatted_number) || ''
  if (string.toLowerCase().endsWith('t') && split(string).length > 1) {
    string = numeral(number).format('0,0e+0')
  }
  if (['0.0', ''].includes(string)) {
    string = '0'
  }
  return toCase(string, 'upper')
}

export const numberToFixed = (number, decimals = 18) => {
  if (typeof number !== 'string') {
    try {
      number = number.toString()
    } catch (error) {
      number = ''
    }
  }
  return split(number, 'normal', '.').map((s, i) => i === 1 ? s.substring(0, decimals) : s).join('.')
}

const names = {
  btc: 'Bitcoin',
  eth: 'Ethereum',
}

export const capitalize = s => typeof s !== 'string' ? '' : split(split(split(s, 'normal', ' ').join('_'), 'normal', '-').join('_'), 'normal', '_').map(x => `${x.substr(0, 1).toUpperCase()}${x.substr(1)}`).join(' ')

export const getTitle = (s, data) => names[s] ? names[s] : data?.name && data.id === s ? data.name : s && s.length <= 3 ? s.toUpperCase() : capitalize(s)

export const ellipse = (string, length = 10, prefix = '') => !string ? '' : string.length < (length * 2) + 3 ? string : `${string.startsWith(prefix) ? prefix : ''}${string.replace(prefix, '').slice(0, length)}...${string.replace(prefix, '').slice(-length)}`

export const equalsIgnoreCase = (a, b) => (!a && !b) || a?.toLowerCase() === b?.toLowerCase()

export const getPath = asPath => {
  const path = !asPath ? '/' : asPath.toLowerCase()
  return path.includes('?') ? path.substring(0, path.indexOf('?')) : path
}

export const queryStringToParams = s => s && JSON.parse(`{"${s.replace(/&/g, '","').replace(/=/g, '":"')}"}`, (k, v) => k === '' ? v : decodeURIComponent(v))

export const getQueryParams = path => path?.includes('?') ? { ...queryStringToParams(path.substring(path.indexOf('?') + 1)) } : {}

export const createMomentFromUnixtime = time => moment(time ? !isNaN(time) ? Number(time) * 1000 : time : undefined)

export const _totalTimeString = (total_time, a, b) => {
  if (typeof total_time === 'number') {
    total_time = parseInt(total_time)
  }
  return (
    total_time < 60 ?
      `${total_time || 0}s` :
      total_time < 60 * 60 ?
        `${Math.floor(total_time / 60)}m${total_time % 60 > 0 ? ` ${total_time % 60}s` : ''}` :
        total_time < 24 * 60 * 60 ?
          moment.utc(total_time * 1000).format('HH:mm:ss') :
          typeof a === 'number' && typeof b === 'number' ?
            total_time < 30 * 24 * 60 * 60 ?
              `${moment(b).diff(moment(a), 'hours')} hours` :
              `${moment(b).diff(moment(a), 'days')} days` :
            `${moment().diff(moment().subtract(total_time, 'seconds'), 'days')} day`
  )
}

export const totalTimeString = (a, b) => {
  if (!(typeof a === 'number' && typeof b === 'number')) {
    return null
  }
  a = a * 1000
  b = b * 1000
  return _totalTimeString(moment(b).diff(moment(a), 'seconds'), a, b)
}

export const toJson = s => {
  if (s) {
    if (typeof s === 'object')
      return s
    try {
      if (typeof s === 'string' && s.startsWith('{') && s.endsWith('}') && !s.includes('"')) {
        try {
          s = `{${split(s.substring(1, s.length - 1), 'normal', ',').map(_s => split(_s, 'normal', ':').map(a => typeof a === 'string' ? `"${a}"` : a).join(':')).join(',')}}`
        } catch (error) {}
      }
      return JSON.parse(s)
    } catch (error) {}
  }
  return null
}

export const fixDecimals = (number = 0, decimals = 2) => parseFloat((number || 0).toFixed(decimals))

export const normalizeQuote = (string, to_case = 'normal') => split(split(string, 'normal', '"').join(''), 'normal', `'`).join('')

export const loaderColor = theme => theme === 'dark' ? 'white' : '#3b82f6'

export const switchColor = theme => { return { on: theme === 'dark' ? '#2563eb' : '#3b82f6', off: theme === 'dark' ? '#808080' : '#e2e2e2' } }

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const errorPatterns = ['(', '[']

export const normalizeMessage = (message, status, delimiter = ' ') => split(message, 'normal', delimiter).join(delimiter).substring(0, status === 'failed' && errorPatterns.findIndex(c => message?.indexOf(c) > -1) > -1 ? message.indexOf(errorPatterns.find(c => message.indexOf(c) > -1)) : undefined) || message

export const parseError = error => {
  const message = error?.reason || error?.data?.message || error?.data?.text || error?.message
  const code = _.slice(split(message, 'lower', ' '), 0, 2).join('_')
  return { message, code }
}
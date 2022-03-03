import numeral from 'numeral'

const url = (url, params) => {
  if (url) {
    url = new URL(url)

    if (params) {
      const urlSearchParams = new URLSearchParams(url.search)
      Object.keys(params).filter(key => typeof params[key] !== 'undefined').forEach(key => urlSearchParams.append(key, params[key]))
      url.search = urlSearchParams
    }
  }

  return url
}

export const getRequestUrl = (base_url, path, params) => {
  params = { ...params, path }

  if (typeof path !== 'string') {
    delete params.path
  }

  return url(base_url, params)
}

export const generateUrl = (url, params, paramsFilterOut) => {
  url = url || '/'

  return [url, Object.entries({ ...params }).filter(([param, value]) => !(paramsFilterOut && paramsFilterOut.includes(param))).map(entry => entry.join('=')).join('&')].filter(urlPart => urlPart).join('?')
}

export const paramsToObject = string => string && JSON.parse(`{"${string.replace(/&/g, '","').replace(/=/g, '":"')}"}`, (key, value) => key === '' ? value : decodeURIComponent(value))

const numberOptimizeDecimal = number => {
  if (typeof number === 'number') {
    number = number.toString()
  }

  if (number.includes('NaN')) {
    return number.replace('NaN', '<0.00000001')
  }

  if (typeof number === 'string') {
    if (number.indexOf('.') > -1) {
      let decimal = number.substring(number.indexOf('.') + 1)

      while (decimal.endsWith('0')) {
        decimal = decimal.substring(0, decimal.length - 1)
      }

      if (number.substring(0, number.indexOf('.')).length >= 7 && decimal.length > 2 && !isNaN(`0.${decimal}`)) {
        decimal = Number(`0.${decimal}`).toFixed(2).toString()
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

export const numberFormat = (number, format, is_exact) => {
  let _number = numberOptimizeDecimal(numeral(number).format(format.includes('.000') && Math.abs(Number(number)) >= 1.01 ? `${format.substring(0, format.indexOf('.') + (is_exact ? 7 : 3))}` : format === '0,0' && Number(number) < 1 ? '0,0.00' : format))

  if (_number?.toLowerCase().endsWith('t') && _number.split(',').length > 1) {
    _number = numeral(number).format('0,0e+0')
  }

  return _number
}

const capitalize = s => typeof s !== 'string' ? '' : s.trim().split(' ').join('_').split('-').join('_').split('_').map(x => x.trim()).filter(x => x).map(x => `${x.substr(0, 1).toUpperCase()}${x.substr(1)}`).join(' ')

const names = {}

export const getName = (s, data) => names[s] ? names[s] : data && data.name && data.id === s ? data.name : s && s.length <= 3 ? s.toUpperCase() : capitalize(s)

export const ellipseAddress = (address, width = 10) => !address ? '' : address.length < width * 2 ? address : `${address.slice(0, width)}...${address.slice(-width)}`

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

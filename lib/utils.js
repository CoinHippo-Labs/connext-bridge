import numeral from 'numeral'

const remove_decimal = number => {
  if (typeof number === 'number') {
    number = number.toString()
  }

  if (number.includes('NaN')) {
    return number.replace(
      'NaN',
      '< 0.00000001',
    )
  }

  if (typeof number === 'string') {
    if (number.indexOf('.') > -1) {
      let decimal = number.substring(
        number.indexOf('.') + 1,
      )

      while (decimal.endsWith('0')) {
        decimal = decimal.substring(
          0,
          decimal.length - 1,
        )
      }

      if (
        number.substring(
          0,
          number.indexOf('.'),
        ).length >= 7 &&
        decimal.length > 2 &&
        !isNaN(`0.${decimal}`)
      ) {
        decimal = Number(`0.${decimal}`)
          .toFixed(2)
          .toString()

        if (decimal.indexOf('.') > -1) {
          decimal = decimal.substring(
            decimal.indexOf('.') + 1,
          )

          while (decimal.endsWith('0')) {
            decimal = decimal.substring(
              0,
              decimal.length - 1,
            )
          }
        }
      }

      return `${number.substring(
        0,
        number.indexOf('.'),
      )}${decimal ?
        '.' :
        ''
      }${decimal}`
    }

    return number
  }

  return ''
}

export const number_format = (
  number,
  format,
  is_exact,
) => {
  let string = remove_decimal(
    numeral(number)
      .format(
        format.includes('.000') &&
        Math.abs(Number(number)) >= 1.01 ?
          format.substring(
            0,
            format.indexOf('.') +
            (is_exact ?
              7 :
              3
            )
          ) :
          format === '0,0' &&
          Number(number) < 1 ?
            '0,0.00' :
            format
      )
  )

  if (
    string?.toLowerCase().endsWith('t') &&
    string.split(',').length > 0
  ) {
    string = numeral(number)
      .format('0,0e+0')
  }

  return string
}

const names = {
  btc: 'Bitcoin',
  eth: 'Ethereum',
}

export const capitalize = s =>
  typeof s !== 'string' ?
    '' :
    s.trim()
      .split(' ')
      .join('_')
      .split('-')
      .join('_')
      .split('_')
      .map(x => x.trim())
      .filter(x => x)
      .map(x => `${x.substr(0, 1).toUpperCase()}${x.substr(1)}`)
      .join(' ')

export const name = (
  s,
  data,
) => names[s] ?
  names[s] :
  data?.name && data.id === s ?
    data.name :
    s && s.length <= 3 ?
      s.toUpperCase() :
      capitalize(s)

export const ellipse = (
  string,
  length = 10,
  prefix = '',
) => !string ?
  '' :
  string.length < (length * 2) + 3 ?
    string :
    `${string.startsWith(prefix) ?
      prefix :
      ''
    }${string
      .replace(
        prefix,
        '',
      )
      .slice(
        0,
        length,
      )
    }...${string
      .replace(
        prefix,
        '',
      )
      .slice(-length)
    }`

export const equals_ignore_case = (
  a,
  b,
) => (!a && !b) ||
  a?.toLowerCase() === b?.toLowerCase()

export const params_to_obj = s => s &&
  JSON.parse(
    `{"${
      s.replace(
        /&/g,
        '","',
      ).replace(
        /=/g,
        '":"',
      )
    }"}`,
    (k, v) => k === '' ?
      v :
      decodeURIComponent(v),
  )

export const to_json = s => {
  if (s) {
    if (typeof s === 'object')
      return s

    try {
      return JSON.parse(s)
    } catch (error) {}
  }

  return null
}

export const loader_color = theme =>
  theme === 'dark' ?
    'white' :
    '#3b82f6'

export const switch_color = theme => {
  return {
    on: theme === 'dark' ?
      '#2563eb' :
      '#3b82f6',
    off: theme === 'dark' ?
      '#64748b' :
      '#e2e8f0',
  }
}

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

import _ from 'lodash'

import { name, equals_ignore_case } from './utils'

export default (
  path,
  data,
  chains_data = [],
  assets_data = [],
) => {
  path = !path ?
    '/' :
    path.toLowerCase()
  path = path.includes('?') ?
    path.substring(
      0,
      path.indexOf('?'),
    ) :
    path

  const _paths = path
    .split('/')
    .filter(x => x)

  let title = `${
    _.cloneDeep(_paths)
      .reverse()
      .map(x =>
        name(
          x,
          data,
        )
      )
      .join(' - ')
  }${_paths.length > 0 ?
    ` | ${process.env.NEXT_PUBLIC_APP_NAME}` :
    process.env.NEXT_PUBLIC_DEFAULT_TITLE
  }`
  let description = process.env.NEXT_PUBLIC_DEFAULT_DESCRIPTION
  const image = `${process.env.NEXT_PUBLIC_SITE_URL}/images/ogimage.png`
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}${path}`

  if (
    path.includes('from-') &&
    path.includes('to-')
  ) {
    const paths = path
      .replace(
        '/',
        '',
      )
      .split('-')

    const from_chain = paths[paths.indexOf('from') + 1]
    const to_chain = paths[paths.indexOf('to') + 1]
    const asset_id = _.head(paths) !== 'from' ?
      _.head(paths) :
      null

    const from_chain_name = chains_data?.find(c => c.id === from_chain)?.name ||
      name(from_chain)
    const to_chain_name = chains_data?.find(c => c.id === to_chain)?.name ||
      name(to_chain)
    const asset_symbol = assets_data?.find(a =>
      a.id === asset_id ||
      equals_ignore_case(a.symbol, asset_id)
    )?.symbol ||
      'tokens'

    title = `Send ${asset_symbol} ${from_chain_name ?
      `from ${from_chain_name} ` :
      ''
    }${to_chain_name ?
      `to ${to_chain_name} ` :
      ''
    }with Connext`
    description = `The most secure ${from_chain_name} bridge to ${to_chain_name} to move tokens across blockchains in a trustless way`
  }
  else if (
    path.includes('on-')
  ) {
    const is_swap = path.includes('/swap')

    const paths = path
      .replace(
        `/${is_swap ?
          'swap' :
          'pool'
        }/`,
        '',
      )
      .split('-')

    const chain = paths[paths.indexOf('on') + 1]
    const asset_id = _.head(paths) !== 'on' ?
      _.head(paths) :
      null

    const chain_name = chains_data?.find(c => c.id === chain)?.name ||
      name(chain)
    const asset_symbol = assets_data?.find(a =>
      a.id === asset_id ||
      equals_ignore_case(a.symbol, asset_id)
    )?.symbol ||
      'tokens'

    title = `${is_swap ?
      'Swap' :
      'Add'
    } ${asset_symbol}${is_swap ?
      '' :
      ' liquidity'
    } ${chain_name ?
      `on ${chain_name} ` :
      ''
    }with Connext`
    description = `The most secure protocol to move tokens across blockchains in a trustless way`
  }

  return {
    title,
    description,
    url,
    image,
  }
}
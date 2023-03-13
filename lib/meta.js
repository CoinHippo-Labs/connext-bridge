import _ from 'lodash'

import { getChain } from './object/chain'
import { getAsset } from './object/asset'
import { split, name, equalsIgnoreCase } from './utils'

export default (
  path,
  data,
  chains_data = [],
  assets_data = [],
) => {
  path = !path ? '/' : path.toLowerCase()
  path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path

  const _paths = split(path, 'normal', '/')

  let title =
    `${
      _.reverse(_.cloneDeep(_paths))
      .map(x => name(x, data))
      .join(' - ')
    }${
      _paths.length > 0 ?
        ` | ${process.env.NEXT_PUBLIC_APP_NAME}` :
        process.env.NEXT_PUBLIC_DEFAULT_TITLE
    }`

  let description = process.env.NEXT_PUBLIC_DEFAULT_DESCRIPTION
  const image = `${process.env.NEXT_PUBLIC_APP_URL}/images/ogimage.png`
  const url = `${process.env.NEXT_PUBLIC_APP_URL}${path}`

  if (path.includes('from-') && path.includes('to-')) {
    const paths = split(path.replace('/', ''), 'normal', '-')

    const from_chain = paths[paths.indexOf('from') + 1]
    const to_chain = paths[paths.indexOf('to') + 1]
    const asset_id = _.head(paths) !== 'from' ? _.head(paths) : null

    const from_chain_name = getChain(from_chain, chains_data)?.name || name(from_chain)
    const to_chain_name = getChain(to_chain, chains_data)?.name || name(to_chain)
    const asset_symbol = getAsset(asset_id, assets_data)?.symbol || 'tokens'

    title = `Send ${asset_symbol} ${from_chain_name ? `from ${from_chain_name} ` : ''}${to_chain_name ? `to ${to_chain_name} ` : ''}with Connext`
    description = `The most secure ${from_chain_name} bridge to ${to_chain_name} to move tokens across blockchains in a trustless way.`
  }
  else if (path.includes('on-')) {
    const is_swap = path.includes('/swap')
    const paths = split(path.replace(`/${is_swap ? 'swap' : 'pool'}/`, ''), 'normal', '-')

    const chain = paths[paths.indexOf('on') + 1]
    const asset_id = _.head(paths) !== 'from' ? _.head(paths) : null

    const chain_name = getChain(chain, chains_data)?.name || name(chain)
    const asset_symbol = getAsset(asset_id, assets_data)?.symbol || 'tokens'

    title = `${is_swap ? 'Swap' : 'Add'} ${asset_symbol}${is_swap ? '' : ' liquidity'} ${chain_name ? `on ${chain_name} ` : ''}with Connext`
    description = is_swap ? `Swap your ${asset_symbol} on ${chain_name}.` : `Add ${asset_symbol} liquidity on ${chain_name} to earn rewards.`
  }
  else {
    switch (path) {
      case '/pools':
      case '/pool':
        description = `Add liquidity to earn rewards.`
        break
      case '/swap':
        description = `Swap your tokens.`
        break
      default:
        break
    }
  }

  return {
    title,
    description,
    url,
    image,
  }
}
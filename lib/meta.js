import _ from 'lodash'

import { getChainData, getAssetData } from './object'
import { split, getTitle } from './utils'

export default (path, data, chains_data = [], assets_data = []) => {
  path = !path ? '/' : path.toLowerCase()
  path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path
  const _paths = split(path, 'normal', '/')

  let title = `${_.reverse(_.cloneDeep(_paths)).filter(x => !(x.startsWith('[') && x.endsWith(']'))).map(x => getTitle(x, data)).join(' - ')}${_paths.length > 0 ? ` | ${process.env.NEXT_PUBLIC_APP_NAME}` : process.env.NEXT_PUBLIC_DEFAULT_TITLE}`
  let description = process.env.NEXT_PUBLIC_DEFAULT_DESCRIPTION
  const image = `${process.env.NEXT_PUBLIC_APP_URL}/images/ogimage.png`
  const url = `${process.env.NEXT_PUBLIC_APP_URL}${path}`

  if (path.includes('from-') && path.includes('to-')) {
    const paths = split(path.replace('/', ''), 'normal', '-')
    const fromChain = paths[paths.indexOf('from') + 1]
    const toChain = paths[paths.indexOf('to') + 1]
    const asset = _.head(paths) !== 'from' ? _.head(paths) : null
    const fromChainName = getChainData(fromChain, chains_data)?.name || getTitle(fromChain)
    const toChainName = getChainData(toChain, chains_data)?.name || getTitle(toChain)
    const symbol = getAssetData(asset, assets_data)?.symbol || 'tokens'
    title = `Send ${symbol} ${fromChainName ? `from ${fromChainName} ` : ''}${toChainName ? `to ${toChainName} ` : ''}with Connext`
    description = `The most secure ${fromChainName} bridge to ${toChainName} to move tokens across blockchains in a trustless way.`
  }
  else if (path.includes('on-')) {
    const is_swap = path.includes('/swap')
    const paths = split(path.replace(`/${is_swap ? 'swap' : 'pool'}/`, ''), 'normal', '-')
    const chain = paths[paths.indexOf('on') + 1]
    const asset = _.head(paths) !== 'on' ? _.head(paths) : null
    const chainName = getChainData(chain, chains_data)?.name || getTitle(chain)
    const symbol = getAssetData(asset, assets_data)?.symbol || 'tokens'
    title = `${is_swap ? 'Swap' : 'Add'} ${symbol}${is_swap ? '' : ' liquidity'} ${chainName ? `on ${chainName} ` : ''}with Connext`
    description = is_swap ? `Swap your ${symbol} on ${chainName}.` : `Add ${symbol} liquidity on ${chainName} to earn rewards.`
  }
  else {
    switch (path) {
      case '/pools':
      case '/pool':
        description = 'Add liquidity to earn rewards.'
        break
      case '/swap':
        description = 'Swap your tokens.'
        break
      default:
        break
    }
  }

  return { title, description, url, image }
}
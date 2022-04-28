import _ from 'lodash'
import { name } from './utils'

export default function meta(path, data, chains, assets) {
  path = !path ? '/' : path.toLowerCase()
  path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path
  const pathSplit = path.split('/').filter(x => x)

  let title = `${_.cloneDeep(pathSplit).reverse().map(x => name(x, data)).join(' - ')}${pathSplit.length > 0 ? ` | ${process.env.NEXT_PUBLIC_APP_NAME}` : process.env.NEXT_PUBLIC_DEFAULT_TITLE}`
  let description = process.env.NEXT_PUBLIC_DEFAULT_DESCRIPTION
  const image = `${process.env.NEXT_PUBLIC_SITE_URL}/images/ogimage.png`
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}${path}`
  if (path.includes('from-') && path.includes('to-')) {
    const paths = path.replace('/', '').split('-')
    const from_chain = paths[paths.indexOf('from') + 1]
    const to_chain = paths[paths.indexOf('to') + 1]
    const from_chain_name = chains?.find(c => c.id === from_chain)?.name || name(from_chain)
    const to_chain_name = chains?.find(c => c.id === to_chain)?.name || name(to_chain)
    const asset_id = paths[0] !== 'from' ? paths[0] : null
    const asset_symbol = assets?.find(a => a.id === asset_id || a.symbol?.toLowerCase() === asset_id)?.symbol || 'tokens'
    title = `Bridge ${asset_symbol} ${from_chain_name ? `from ${from_chain_name} ` : ''}${to_chain_name ? `to ${to_chain_name} ` : ''}with Connext`
    description = `The most secure ${from_chain_name} bridge to ${to_chain_name} to move tokens across blockchains in a trustless way`
  }
  return {
    title,
    description,
    url,
    image,
  }
}
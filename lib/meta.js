import _ from 'lodash'
import { getName } from './utils'

export default function getMeta(path, data, chains, assets) {
  path = !path ? '/' : path.toLowerCase()
  path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path

  const pathSplit = path.split('/').filter(x => x)

  let title = `${_.cloneDeep(pathSplit).reverse().map(x => getName(x, data)).join(' - ')}${pathSplit.length > 0 ? ` | ${process.env.NEXT_PUBLIC_APP_NAME}` : process.env.NEXT_PUBLIC_DEFAULT_TITLE}`
  let description = process.env.NEXT_PUBLIC_DEFAULT_DESCRIPTION
  let image = `${process.env.NEXT_PUBLIC_SITE_URL}/images/ogimage.png`
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}${path}`

  if (path.includes('from-') && path.includes('to-')) {
    const paths = path.replace('/', '').split('-')
    const fromChainId = paths[paths.indexOf('from') + 1]
    const toChainId = paths[paths.indexOf('to') + 1]
    const fromChainTitle = chains?.find(c => c.id === fromChainId)?.title || getName(fromChainId)
    const toChainTitle = chains?.find(c => c.id === toChainId)?.title || getName(toChainId)
    const assetId = paths[0] !== 'from' ? paths[0] : null
    const assetTitle = assets?.find(a => a.id === assetId || a.symbol?.toLowerCase() === assetId)?.symbol || 'tokens'

    title = `Bridge ${assetTitle} ${fromChainTitle ? `from ${fromChainTitle} ` : ''}${toChainTitle ? `to ${toChainTitle} ` : ''}with Connext`
    description = `The most secure ${fromChainTitle} bridge to ${toChainTitle} to move tokens across blockchains in a trustless way`
  }

  return {
    title,
    description,
    url,
    image,
  }
}
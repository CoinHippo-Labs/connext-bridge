import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'

import routes from '../routes'
import { DEFAULT_DESTINATION_CHAIN } from '../../../../lib/config'
import { getChainData, getAssetData } from '../../../../lib/object'
import { toArray } from '../../../../lib/utils'

export default ({ onClick }) => {
  const { chains, assets, wallet } = useSelector(state => ({ chains: state.chains, assets: state.assets, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { chain_id } = { ...wallet_data }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { bridge, swap } = { ...query }

  return (
    <div className="flex flex-col">
      {routes.map((d, i) => {
        const { id, disabled, others_paths, group, icon } = { ...d }
        let { title, path } = { ...d }

        switch (id) {
          case 'bridge':
            if (pathname === '/[bridge]' && bridge) {
              path = pathname.replace('[bridge]', bridge)
            }
            else {
              let sourceChain
              let destinationChain
              let asset
              if (chains_data && assets_data) {
                const source_chain_data = getChainData(chain_id, chains_data, { not_disabled: true, get_head: true })
                sourceChain = source_chain_data?.id
                const destination_chain_data = sourceChain !== DEFAULT_DESTINATION_CHAIN && getChainData(DEFAULT_DESTINATION_CHAIN, chains_data) ? DEFAULT_DESTINATION_CHAIN : getChainData(chain_id, chains_data, { not_disabled: true, get_head: true, except: sourceChain })
                destinationChain = destination_chain_data?.id
                const asset_data = getAssetData(undefined, assets_data, { chain_ids: [source_chain_data?.chain_id, destination_chain_data?.chain_id], not_disabled: true, get_head: true })
                asset = asset_data?.id
              }
              path = `/${sourceChain && destinationChain ? `${asset ? `${asset.toUpperCase()}-` : ''}from-${sourceChain}-to-${destinationChain}` : ''}`
            }
            break
          case 'swap':
            if (pathname === '/swap/[swap]' && swap) {
              path = pathname.replace('[swap]', swap)
            }
            else {
              let chain
              let asset
              if (chains_data && assets_data) {
                const _chains_data = getChainData(chain_id, chains_data, { must_have_pools: true, return_all: true }).filter(c => getAssetData(undefined, assets_data, { chain_id: c.chain_id, not_disabled: true, get_head: true, only_pool_asset: true }))
                const chain_data = _.head(_chains_data)
                chain = chain_data?.id
                const asset_data = getAssetData(undefined, assets_data, { chain_id: chain_data?.chain_id, not_disabled: true, get_head: true, only_pool_asset: true })
                asset = asset_data?.id
              }
              path = `/swap/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`
            }
            break
          default:
            break
        }

        const external = !path?.startsWith('/')
        const selected = !external && (pathname === path || toArray(others_paths).includes(pathname))
        const item = (
          <>
            {icon}
            <span className="whitespace-nowrap">
              {title}
            </span>
          </>
        )
        const className = `w-full ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} flex items-center uppercase ${selected ? 'text-blue-600 dark:text-white text-sm font-extrabold' : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 text-sm font-medium'} space-x-1.5 py-2 px-3`
        return external ?
          <a
            key={i}
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            className={className}
          >
            {item}
          </a> :
          <Link key={i} href={path}>
            <div
              onClick={onClick}
              className={className}
            >
              {item}
            </div>
          </Link>
      })}
    </div>
  )
}
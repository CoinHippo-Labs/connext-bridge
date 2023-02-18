import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'

import menus from '../menus'
import { getChain } from '../../../../lib/object/chain'
import { getAsset } from '../../../../lib/object/asset'
import { toArray } from '../../../../lib/utils'

export default (
  {
    onClick,
  },
) => {
  const {
    chains,
    assets,
    wallet,
  } = useSelector(
    state => (
      {
        chains: state.chains,
        assets: state.assets,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    chain_id,
  } = { ...wallet_data }

  const router = useRouter()
  const {
    pathname,
    query,
  } = { ...router }
  const {
    bridge,
    swap,
    source,
  } = { ...query }

  return (
    <div className="flex flex-wrap">
      {menus
        .filter(m =>
          m?.path &&
          !['pool'].includes(source)
        )
        .map(m => {
          const {
            id,
            disabled,
            others_paths,
            external,
            icon,
          } = { ...m }
          let {
            title,
            path,
          } = { ...m }

          switch (id) {
            case 'bridge':
              if (pathname === '/[bridge]' && bridge) {
                path = pathname.replace('[bridge]', bridge)
              }
              else {
                let source_chain, destination_chain, asset

                if (chains_data && assets_data) {
                  const source_chain_data = getChain(chain_id, chains_data, true, false, true)
                  source_chain = source_chain_data?.id

                  const destination_chain_data = getChain(chain_id, chains_data, true, false, true, source_chain)
                  destination_chain = destination_chain_data?.id

                  const chain_ids = [source_chain_data?.chain_id, destination_chain_data?.chain_id]

                  const asset_data = getAsset(null, assets_data, chain_ids, undefined, undefined, true, true)
                  asset = asset_data?.id
                }

                path = `/${source_chain && destination_chain ? `${asset ? `${asset.toUpperCase()}-` : ''}from-${source_chain}-to-${destination_chain}` : ''}`
              }
              break
            case 'pools':
              path = '/pools'
              break
            case 'swap':
              if (pathname === '/swap/[swap]' && swap) {
                path = pathname.replace('[swap]', swap)
              }
              else {
                let chain, asset

                if (chains_data && assets_data) {
                  const _chains_data =
                    getChain(chain_id, chains_data, true, true, false, undefined, true)
                      .filter(c =>
                        getAsset(null, assets_data, c?.chain_id, undefined, undefined, true, true, true)
                      )
                  const chain_data = _.head(_chains_data)
                  chain = chain_data?.id

                  const asset_data = getAsset(null, assets_data, chain_data?.chain_id, undefined, undefined, true, true, true)
                  asset = asset_data?.id
                }

                path = `/swap/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`
              }
              break
            case 'explorer':
              title = 'Explorer'
              path = process.env.NEXT_PUBLIC_EXPLORER_URL
              break
            default:
              break
          }

          const selected = !external && (pathname === path || toArray(others_paths).includes(pathname))

          const item = (
            <>
              {icon}
              <span className="whitespace-nowrap">
                {title}
              </span>
            </>
          )

          const className =
            `dropdown-item w-full bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 ${
              disabled ?
                'cursor-not-allowed' :
                'cursor-pointer'
            } flex items-center uppercase ${
              selected ?
                'text-blue-600 dark:text-white text-sm font-extrabold' :
                'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 text-sm font-semibold hover:font-bold'
            } space-x-1.5 p-3`

          return (
            external ?
              <a
                key={id}
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClick}
                className={className}
              >
                {item}
              </a> :
              <Link
                key={id}
                href={path}
              >
                <div
                  onClick={onClick}
                  className={className}
                >
                  {item}
                </div>
              </Link>
          )
        })
      }
    </div>
  )
}
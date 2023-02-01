import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'

import menus from '../menus'

export default (
  {
    onClick,
    address,
  },
) => {
  const {
    chains,
    assets,
    wallet,
  } = useSelector(state =>
    (
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
      {
        menus
          .filter(m =>
            m?.path &&
            (
              ![
                'pool',
              ]
              .includes(source)
            )
          )
          .map((m, i) => {
            const {
              id,
              disabled,
              emphasize,
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
                if (
                  pathname === '/[bridge]' &&
                  bridge
                ) {
                  path =
                    `${
                      pathname
                        .replace(
                          '[bridge]',
                          bridge,
                        )
                    }`
                }
                else {
                  let source_chain,
                    destination_chain,
                    asset

                  if (
                    chains_data &&
                    assets_data
                  ) {
                    const source_chain_data =
                      _.head(
                        chains_data
                          .filter(c =>
                            !c?.disabled &&
                            (
                              c?.chain_id === chain_id ||
                              chains_data
                                .findIndex(_c =>
                                  !_c?.disabled &&
                                  _c?.chain_id === chain_id
                                ) < 0
                            )
                          )
                      )

                    source_chain = source_chain_data?.id

                    const destination_chain_data =
                      _.head(
                        chains_data
                          .filter(c =>
                            !c?.disabled &&
                            c?.id !== source_chain
                          )
                      )

                    destination_chain = destination_chain_data?.id

                    const asset_data =
                      _.head(
                        assets_data
                          .filter(a =>
                            [
                              source_chain_data?.chain_id,
                              destination_chain_data?.chain_id,
                            ]
                            .findIndex(i =>
                              (a?.contracts || [])
                                .findIndex(c =>
                                  c?.chain_id === i
                                ) < 0
                            ) < 0
                          )
                      )

                    asset = asset_data?.id
                  }

                  path =
                    `/${
                      source_chain &&
                      destination_chain ?
                        `${
                          asset ?
                            `${asset.toUpperCase()}-` :
                            ''
                        }from-${source_chain}-to-${destination_chain}` :
                        ''
                    }`
                }
                break
              case 'pools':
                path = '/pools'
                break
              case 'swap':
                if (
                  pathname === '/swap/[swap]' &&
                  swap
                ) {
                  path =
                    `${
                      pathname
                        .replace(
                          '[swap]',
                          swap,
                        )
                    }`
                }
                else {
                  let chain,
                    asset

                  if (
                    chains_data &&
                    assets_data
                  ) {
                    const chain_data =
                      _.head(
                        chains_data
                          .filter(c =>
                            !c?.disabled &&
                            (
                              c?.chain_id === chain_id ||
                              chains_data
                                .findIndex(_c =>
                                  !_c?.disabled &&
                                  _c?.chain_id === chain_id &&
                                  assets_data
                                    .findIndex(a =>
                                      (a?.contracts || [])
                                        .findIndex(__c =>
                                          __c?.chain_id === _c?.chain_id &&
                                          __c?.is_pool
                                        ) > -1
                                    ) > -1
                                ) < 0
                            ) &&
                            assets_data
                              .findIndex(a =>
                                (a?.contracts || [])
                                  .findIndex(_c =>
                                    _c?.chain_id === c?.chain_id &&
                                    _c?.is_pool
                                  ) > -1
                              ) > -1
                          )
                      )

                    chain = chain_data?.id

                    const asset_data =
                      _.head(
                        assets_data
                          .filter(a =>
                            [
                              chain_data?.chain_id,
                            ]
                            .findIndex(i =>
                              (a?.contracts || [])
                                .findIndex(c =>
                                  c?.chain_id === i &&
                                  c?.is_pool
                                ) < 0
                            ) < 0
                          )
                      )

                    asset = asset_data?.id
                  }

                  path =
                    `/swap/${
                      chain ?
                        `${
                          asset ?
                            `${asset.toUpperCase()}-` :
                            ''
                        }on-${chain}` :
                        ''
                    }`
                }
                break
              case 'explorer':
                title = 'Explorer'
                path = process.env.NEXT_PUBLIC_EXPLORER_URL
                break
              default:
                break
            }

            const selected =
              !external &&
              (
                pathname === path ||
                others_paths?.includes(pathname)
              )

            const item =
              (
                <>
                  {icon}
                  <span className="whitespace-nowrap tracking-wider">
                    {title}
                  </span>
                </>
              )

            const right_icon =
              emphasize ?
                <HeadShake
                  duration={1500}
                  forever
                >
                  <FaHandPointLeft
                    size={20}
                  />
                </HeadShake> :
                undefined

            const className =
              `dropdown-item w-full bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 ${
                disabled ?
                  'cursor-not-allowed' :
                  ''
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
                  {right_icon}
                </a> :
                <Link
                  key={id}
                  href={path}
                >
                <a
                  onClick={onClick}
                  className={className}
                >
                  {item}
                  {right_icon}
                </a>
                </Link>
            )
          })
      }
    </div>
  )
}
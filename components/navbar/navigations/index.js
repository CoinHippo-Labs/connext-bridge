import Link from 'next/link'
import { useRouter } from 'next/router'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'

import menus from './menus'

export default (
  {
    address,
  },
) => {
  const router = useRouter()
  const {
    pathname,
    query,
  } = { ...router }
  const {
    bridge,
    pool,
    swap,
    source,
  } = { ...query }

  return (
    <div className="hidden xl:flex items-center space-x-0 xl:space-x-2 mx-auto">
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
          .map(m => {
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
                  path = '/'
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
                  path = '/swap'
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
                  <span className="whitespace-nowrap">
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
                    size={18}
                  />
                </HeadShake> :
                undefined

            const className =
              `bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 rounded ${
                disabled ?
                  'cursor-not-allowed' :
                  ''
              } flex items-center uppercase ${
                selected ?
                  'text-blue-600 dark:text-white text-sm font-extrabold' :
                  'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 text-sm font-semibold hover:font-bold'
              } space-x-1.5 py-2 px-2.5`

            return (
              external ?
                <a
                  key={id}
                  href={path}
                  target="_blank"
                  rel="noopener noreferrer"
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
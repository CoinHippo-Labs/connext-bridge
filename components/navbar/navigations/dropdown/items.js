import Link from 'next/link'
import { useRouter } from 'next/router'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'

import menus from '../menus'

export default ({
  onClick,
  address,
}) => {
  const router = useRouter()
  const {
    pathname,
  } = { ...router }

  return (
    <div className="flex flex-wrap">
      {menus
        .filter(m => m?.path)
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
            case 'explorer':
              if (address) {
                title = 'My Transfers'

                const address_path = '/address/'

                path = `${path}${!path.includes(address_path) ?
                  `${address_path}${address}` :
                  ''
                }`
              }
              else {
                title = 'Explorer'
                path = process.env.NEXT_PUBLIC_EXPLORER_URL
              }
              break
            default:
              break
          }

          const selected = !external &&
            (
              pathname === path ||
              others_paths?.includes(pathname)
            )

          const item = (
            <>
              {icon}
              <span className="whitespace-nowrap tracking-wider">
                {title}
              </span>
            </>
          )

          const right_icon = emphasize ?
            <HeadShake
              duration={1500}
              forever
            >
              <FaHandPointLeft
                size={20}
              />
            </HeadShake> :
            undefined

          const className = `dropdown-item w-full bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 ${disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase ${selected ? 'text-blue-600 dark:text-white text-sm font-bold' : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 text-sm font-normal hover:font-semibold'} space-x-1.5 p-3`

          return external ?
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
        })
      }
    </div>
  )
}
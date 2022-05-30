import Link from 'next/link'
import { useRouter } from 'next/router'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'
import { TiArrowRight } from 'react-icons/ti'

import menus from '../menus'

export default ({ onClick, address }) => {
  const router = useRouter()
  const { pathname } = { ...router }

  return (
    <div className="flex flex-wrap">
      {menus.filter(m => m?.path).map((m, i) => {
        switch (m.id) {
          case 'explorer':
            if (address) {
              m.title = 'My Transfers'
              const address_path = '/address/'
              m.path = `${m.path}${!m.path?.includes(address_path) ? `${address_path}${address}` : ''}`
            }
            else {
              m.title = 'Explorer'
              m.path = process.env.NEXT_PUBLIC_EXPLORER_URL
            }
            break
          default:
            break
        }
        const item = (
          <>
            {m.icon}
            <span className="text-xs">
              {m.title}
            </span>
          </>
        )
        const right_icon = m.emphasize ?
          <HeadShake duration={1500} forever>
            <FaHandPointLeft size={20} />
          </HeadShake> : m.external ?
          <TiArrowRight size={20} className="transform -rotate-45" /> : null
        const className = `dropdown-item w-full bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 ${m.disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase text-blue-600 dark:text-white ${!m.external && (pathname === m.path || m.others_paths?.includes(pathname)) ? 'font-extrabold' : 'font-medium hover:font-bold'} space-x-1.5 p-3`
        return m.external ?
          <a
            key={i}
            href={m.path}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            className={className}
          >
            {item}
            {right_icon}
          </a>
          :
          <Link key={i} href={m.path}>
            <a
              onClick={onClick}
              className={className}
            >
              {item}
              {right_icon}
            </a>
          </Link>
      })}
    </div>
  )
}
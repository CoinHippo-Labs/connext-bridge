import Link from 'next/link'
import { useRouter } from 'next/router'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'
import { TiArrowRight } from 'react-icons/ti'

import menus from './menus'

export default function Navigations({ address }) {
  const router = useRouter()
  const { pathname } = { ...router }

  return (
    <div className="hidden xl:flex items-center space-x-0 xl:space-x-2 mx-auto">
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
            <span className="whitespace-nowrap">
              {m.title}
            </span>
          </>
        )
        const right_icon = m.emphasize ?
          <HeadShake duration={1500} forever>
            <FaHandPointLeft size={20} />
          </HeadShake> : m.external ?
          <TiArrowRight size={20} className="transform -rotate-45" /> : null
        const className = `bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg ${m.disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase text-xs ${!m.external && pathname === m.path ? 'font-bold' : 'font-medium hover:font-bold'} space-x-1.5 py-2.5 px-3`
        return m.external ?
          <a
            key={i}
            href={m.path}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {item}
            {right_icon}
          </a>
          :
          <Link key={i} href={m.path}>
            <a className={className}>
              {item}
              {right_icon}
            </a>
          </Link>
      })}
    </div>
  )
}
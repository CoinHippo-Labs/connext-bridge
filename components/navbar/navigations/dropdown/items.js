import Link from 'next/link'
import { useRouter } from 'next/router'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'
import { TiArrowRight } from 'react-icons/ti'

import menus from '../menus'

export default function Items({ onClick, address }) {
  const router = useRouter()
  const { pathname } = { ...router }

  return (
    <div className="flex flex-wrap">
      {menus.filter(m => m?.path).map((m, i) => {
        switch (m.id) {
          case 'explorer':
            if (address) {
              m.title = 'My Transfers'
              m.path = `${m.path}/address/${address}`
            }
            break
          default:
            break
        }
        const item = (
          <>
            {m.icon}
            <span className="text-xs">{m.title}</span>
          </>
        )
        const right_icon = m.emphasize ?
          <HeadShake duration={1500} forever>
            <FaHandPointLeft size={20} />
          </HeadShake> : m.external ?
          <TiArrowRight size={20} className="transform -rotate-45" /> : null
        const className = `dropdown-item w-full bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900 ${m.disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase ${!m.external && pathname === m.path ? 'font-bold' : 'font-medium'} space-x-1.5 p-3`
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
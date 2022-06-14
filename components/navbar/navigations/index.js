import Link from 'next/link'
import { useRouter } from 'next/router'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'
import { TiArrowRight } from 'react-icons/ti'

import menus from './menus'

export default ({ address }) => {
  const router = useRouter()
  const { pathname, query } = { ...router }
  const { bridge, pool, swap } = { ...query }

  return (
    <div className="hidden xl:flex items-center space-x-0 xl:space-x-2 mx-auto">
      {menus.filter(m => m?.path).map((m, i) => {
        switch (m.id) {
          case 'bridge':
            if (pathname === '/[bridge]' && bridge) {
              m.path = `${pathname.replace('[bridge]', bridge)}`
            }
            else {
              m.path = '/'
            }
            break
          case 'pools':
            if (pathname === '/pool/[pool]' && pool) {
              m.path = `${pathname.replace('[pool]', pool)}`
            }
            else {
              m.path = '/pools'
            }
            break
          case 'swap':
            if (pathname === '/swap/[swap]' && swap) {
              m.path = `${pathname.replace('[swap]', swap)}`
            }
            else {
              m.path = '/swap'
            }
            break
          case 'explore':
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
        const className = `bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg ${m.disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase text-blue-600 dark:text-white text-xs ${!m.external && (pathname === m.path || m.others_paths?.includes(pathname)) ? 'font-extrabold' : 'font-medium hover:font-bold'} space-x-1.5 py-2.5 px-3`
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
import Link from 'next/link'
import { useRouter } from 'next/router'

import { TiArrowRight } from 'react-icons/ti'

import { navigations } from '../../../lib/menus'

export default function Navigation() {
  const router = useRouter()
  const { pathname } = { ...router }

  return (
    <div className="hidden lg:flex items-center space-x-0 lg:space-x-2 mx-auto xl:ml-20">
      {navigations.map((item, i) => {
        const className = `bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900 rounded flex items-center uppercase text-xs xl:text-sm p-2 ${pathname === item.path ? 'text-gray-900 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100 font-bold' : 'text-gray-400 hover:text-gray-500 dark:text-gray-200 dark:hover:text-gray-100 font-medium'}`

        return item.external ?
          <a key={i} href={item.path} target="_blank" rel="noopener noreferrer" className={className}>
            {item.icon}
            <span>{item.title}</span>
            <TiArrowRight size={18} className="transform -rotate-45" />
          </a>
          :
          <Link key={i} href={item.path}>
            <a className={className}>
              {item.icon}
              <span>{item.title}</span>
            </a>
          </Link>
      })}
    </div>
  )
}
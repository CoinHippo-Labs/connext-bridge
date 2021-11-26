import Link from 'next/link'
import { useRouter } from 'next/router'

import { TiArrowRight } from 'react-icons/ti'

import { navigations } from '../../../../lib/menus'

export default function Navigations({ handleDropdownClick }) {
  const router = useRouter()
  const { pathname } = { ...router }

  return (
    <div className="flex flex-wrap">
      {navigations.map((item, i) => {
        const className = `dropdown-item w-full bg-transparent flex items-center uppercase space-x-1 p-3 ${pathname === item.path ? 'text-gray-900 hover:text-gray-800 dark:text-gray-100 dark:hover:text-gray-200 font-bold' : 'text-gray-600 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 font-medium'}`

        return item.external ?
          <a key={i} onClick={handleDropdownClick} href={item.path} target="_blank" rel="noopener noreferrer" className={className}>
            {item.icon}
            <span className="text-xs">{item.title}</span>
            <TiArrowRight size={18} className="transform -rotate-45" />
          </a>
          :
          <Link key={i} href={item.path}>
            <a onClick={handleDropdownClick} className={className}>
              {item.icon}
              <span className="text-xs">{item.title}</span>
            </a>
          </Link>
      })}
    </div>
  )
}
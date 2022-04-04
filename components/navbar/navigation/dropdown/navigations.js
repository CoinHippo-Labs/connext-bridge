import Link from 'next/link'
import { useRouter } from 'next/router'

import { TiArrowRight } from 'react-icons/ti'

import { navigations } from '../../../../lib/menus'

export default function Navigations({ handleDropdownClick }) {
  const router = useRouter()
  const { pathname } = { ...router }

  return (
    <div className="flex flex-wrap">
      {navigations.filter(item => item?.path).map((item, i) => {
        const className = `dropdown-item w-full bg-transparent flex items-center uppercase ${pathname === item.path ? 'text-black dark:text-white font-bold' : 'text-blue-600 dark:text-white font-medium'} p-3`

        return item.external ?
          <a key={i} onClick={handleDropdownClick} href={item.path} target="_blank" rel="noopener noreferrer" className={className}>
            {item.icon && (
              <span className="mb-0.5 mr-1">{item.icon}</span>
            )}
            <span className="text-xs">{item.title}</span>
            <TiArrowRight size={16} className="transform -rotate-45" />
          </a>
          :
          <Link key={i} href={item.path}>
            <a onClick={handleDropdownClick} className={className}>
              {item.icon && (
                <span className="mb-0.5 mr-1">{item.icon}</span>
              )}
              <span className="text-xs">{item.title}</span>
            </a>
          </Link>
      })}
    </div>
  )
}
import { useState, useEffect, useRef } from 'react'

import { FiMenu } from 'react-icons/fi'

import Navigations from './navigations'

export default function DropdownNavigation() {
  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = event => {
      if (
        hidden ||
        buttonRef.current.contains(event.target) ||
        dropdownRef.current.contains(event.target)
      ) {
        return false
      }
      setHidden(!hidden)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [hidden, buttonRef, dropdownRef])

  const handleDropdownClick = () => setHidden(!hidden)

  return (
    <div className="block lg:hidden relative">
      <button
        ref={buttonRef}
        onClick={handleDropdownClick}
        className="w-10 sm:w-12 h-16 flex items-center justify-center"
      >
        <FiMenu size={24} />
      </button>
      <div
        ref={dropdownRef} 
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 left-0 mt-12`}
      >
        <div className="dropdown-content w-40 bottom-start">
          <Navigations handleDropdownClick={handleDropdownClick} />
        </div>
      </div>
    </div>
  )
}
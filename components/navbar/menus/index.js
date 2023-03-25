import { useState, useEffect, useRef } from 'react'
import { RxHamburgerMenu } from 'react-icons/rx'

import Items from './items'

export default () => {
  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(
    () => {
      const handleClickOutside = e => {
        if (hidden || buttonRef.current.contains(e.target) || dropdownRef.current.contains(e.target)) {
          return false
        }

        setHidden(!hidden)
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    },
    [hidden, buttonRef, dropdownRef],
  )

  const onClick = () => setHidden(!hidden)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={onClick}
        className="w-8 h-16 flex items-center justify-center sm:mr-2 2xl:w-10 2xl:h-20"
      >
        <RxHamburgerMenu
          size={20}
          className="2xl:w-6 2xl:h-6"
        />
      </button>
      <div
        ref={dropdownRef}
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 right-4 mt-12`}
      >
        {
          !hidden &&
          (
            <div className="dropdown-content w-44 2xl:w-60 bottom-start">
              <Items />
            </div>
          )
        }
      </div>
    </div>
  )
}
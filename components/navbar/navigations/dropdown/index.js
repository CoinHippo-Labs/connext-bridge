import { useState, useEffect, useRef } from 'react'
import { FiMenu } from 'react-icons/fi'

import Items from './items'

export default () => {
  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = e => {
      if (hidden || buttonRef.current.contains(e.target) || dropdownRef.current.contains(e.target)) return false
      setHidden(!hidden)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [hidden, buttonRef, dropdownRef])

  const onClick = () => setHidden(!hidden)

  return (
    <div className="block xl:hidden relative">
      <button
        ref={buttonRef}
        onClick={onClick}
        className="w-10 sm:w-12 h-16 flex items-center justify-center"
      >
        <FiMenu size={24} />
      </button>
      <div
        ref={dropdownRef} 
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 left-0 mt-12`}
      >
        <div className="dropdown-content w-40 bottom-start">
          <Items onClick={onClick} />
        </div>
      </div>
    </div>
  )
}
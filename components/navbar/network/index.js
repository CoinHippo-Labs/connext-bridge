import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import Loader from 'react-loader-spinner'
import { BsPatchExclamationFill } from 'react-icons/bs'

import Networks from './networks'

export default function DropdownNetwork({ chain_id }) {
  const { chains, preferences } = useSelector(state => ({ chains: state.chains, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { theme } = { ...preferences }

  const chain = chains_data?.find(_chain => _chain?.chain_id === chain_id)

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
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleDropdownClick}
        className="w-10 sm:w-12 h-16 flex items-center justify-center"
      >
        {chain ?
          chain.image ?
            <img
              src={chain.image}
              alt=""
              className="w-6 h-6 rounded-full"
            />
            :
            <span className="font-bold">{chain.short_name}</span>
          :
          chains_data ?
            <BsPatchExclamationFill size={20} />
            :
            <Loader type="Puff" color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="16" height="16" />
        }
      </button>
      <div
        ref={dropdownRef} 
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 right-3 mt-12`}
      >
        <div className="dropdown-content w-64 bottom-start">
          <Networks handleDropdownClick={handleDropdownClick} />
        </div>
      </div>
    </div>
  )
}
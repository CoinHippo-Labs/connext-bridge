import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import { Img } from 'react-image'
import { Puff } from 'react-loader-spinner'
import { RiQuestionLine } from 'react-icons/ri'

import Networks from './networks'

export default function DropdownNetwork({ chain_id }) {
  const { preferences, chains } = useSelector(state => ({ preferences: state.preferences, chains: state.chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }

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

  const chain = chains_data?.find(c => c?.chain_id === chain_id)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleDropdownClick}
        className="w-10 sm:w-12 h-16 flex items-center justify-center"
      >
        {chain ?
          chain.image ?
            <Img
              src={chain.image}
              alt=""
              className="w-6 h-6 rounded-full"
            />
            :
            <span className="font-bold">{chain.short_name}</span>
          :
          chains_data ?
            <RiQuestionLine size={20} />
            :
            <Puff color={theme === 'dark' ? 'white' : '#3B82F6'} width="24" height="24" />
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
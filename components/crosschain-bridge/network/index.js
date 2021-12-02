import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import { Img } from 'react-image'
import Loader from 'react-loader-spinner'
import { BsPatchExclamationFill } from 'react-icons/bs'
import { IoRadioButtonOn } from 'react-icons/io5'

// import Networks from './networks'
import Search from './search'
import Modal from '../../modals/modal-confirm'

export default function DropdownNetwork({ disabled, chain_id, onSelect, isFrom, from, to }) {
  const { chains, chains_status, preferences } = useSelector(state => ({ chains: state.chains, chains_status: state.chains_status, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { chains_status_data } = { ...chains_status }
  const { theme } = { ...preferences }

  const chain = chains_data?.find(_chain => _chain?.chain_id === chain_id)

  const [hidden, setHidden] = useState(true)

  // const buttonRef = useRef(null)
  // const dropdownRef = useRef(null)

  // useEffect(() => {
  //   const handleClickOutside = event => {
  //     if (
  //       hidden ||
  //       buttonRef.current.contains(event.target) ||
  //       dropdownRef.current.contains(event.target)
  //     ) {
  //       return false
  //     }
  //     setHidden(!hidden)
  //   }

  //   document.addEventListener('mousedown', handleClickOutside)
  //   return () => document.removeEventListener('mousedown', handleClickOutside)
  // }, [hidden, buttonRef, dropdownRef])

  const handleDropdownClick = _chain_id => {
    if (onSelect && typeof _chain_id === 'number') {
      onSelect(_chain_id)
    }

    setHidden(!hidden)
  }

  return (
    <Modal
      hidden={hidden}
      buttonTitle={chain ?
        <div className="w-36 min-w-max bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-3xl flex items-center justify-center text-lg space-x-1.5 py-1.5 px-4">
          <IoRadioButtonOn size={16} className={`${chain?.disabled ? 'text-gray-400 dark:text-gray-600' : !chains_status_data || chains_status_data?.find(_chain => _chain?.id === chain.id)?.synced ? 'text-green-600 dark:text-green-500' : 'text-red-500 dark:text-red-600'}`} />
          <Img
            src={chain.image}
            alt=""
            className="w-6 h-6 rounded-full"
          />
          <span className="sm:hidden font-semibold">{chain.title}</span>
          <span className="hidden sm:block font-semibold">{chain.short_name}</span>
        </div>
        :
        chains_data ?
          <div className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-3xl uppercase text-gray-500 hover:text-gray-600 dark:text-gray-200 dark:hover:text-gray-100 text-lg font-medium py-1.5 px-4">Select Chain</div>
          :
          <Loader type="Puff" color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="24" height="24" />
      }
      onClick={open => setHidden(!open)}
      buttonClassName={`${!chains_data ? 'w-40' : ''} h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      title={isFrom ? 'From' : 'To'}
      body={<Search
        id={chain_id}
        updateId={_id => handleDropdownClick(_id)}
        from={from}
        to={to}
      />}
      noButtons={true}
    />
  )
}
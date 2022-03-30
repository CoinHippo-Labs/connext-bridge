import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import { Img } from 'react-image'
import { Puff } from 'react-loader-spinner'
import { IoRadioButtonOn } from 'react-icons/io5'

import Search from './search'
import Modal from '../../modals/modal-confirm'

import { chainTitle } from '../../../lib/object/chain'

export default function DropdownNetwork({ disabled, chain_id, onSelect, from, to, side = 'from' }) {
  const { preferences, chains, chains_status, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, chains_status: state.chains_status, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { chains_status_data } = { ...chains_status }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }

  const [hidden, setHidden] = useState(true)

  const handleDropdownClick = _chain_id => {
    if (onSelect && typeof _chain_id === 'number') {
      onSelect(_chain_id)
    }

    setHidden(!hidden)
  }

  const chain = chains_data?.find(c => c?.chain_id === chain_id)

  return (
    <Modal
      hidden={hidden}
      disabled={disabled}
      onClick={open => setHidden(!open)}
      buttonTitle={chain ?
        <div className="w-48 min-w-max bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-3xl shadow flex items-center justify-center text-lg space-x-1.5 py-2 px-4">
          {chains_status_data ?
            <IoRadioButtonOn size={16} className={`${chain?.disabled ? 'text-gray-400 dark:text-gray-600' : chains_status_data?.find(c => c?.id === chain.id)?.synced ? 'text-green-600 dark:text-green-500' : 'text-red-500 dark:text-red-600'}`} />
            :
            address && (
              <Puff color={theme === 'dark' ? '#60A5FA' : '#2563EB'} width="16" height="16" />
            )
          }
          <Img
            src={chain.image}
            alt=""
            className="w-6 h-6 rounded-full"
          />
          <span className="sm:hidden font-semibold">{chain.title}</span>
          <span className="hidden sm:block text-base font-semibold">{chainTitle(chain)}</span>
        </div>
        :
        chains_data ?
          <div className="w-48 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-3xl shadow uppercase text-gray-500 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 text-lg font-medium py-2 px-4">Chain</div>
          :
          <Puff color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="24" height="24" />
      }
      buttonClassName={`${!chains_data ? 'w-48' : ''} h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      title={<span className="capitalize">{side}</span>}
      body={<Search
        chain_id={chain_id}
        updateChainId={_chain_id => handleDropdownClick(_chain_id)}
        from={from}
        to={to}
      />}
      noButtons={true}
      id="modal-network"
    />
  )
}
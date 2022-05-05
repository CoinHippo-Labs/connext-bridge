import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Puff } from 'react-loader-spinner'
import { IoRadioButtonOn } from 'react-icons/io5'

import Image from '../../image'
import Search from './search'
import Modal from '../../modals'
import { chainName } from '../../../lib/object/chain'
import { loader_color } from '../../../lib/utils'

export default ({
  disabled = false,
  value,
  onSelect,
  source,
  destination,
  origin = 'source',
}) => {
  const { preferences, chains, chains_status, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, chains_status: state.chains_status, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { chains_status_data } = { ...chains_status }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }

  const [hidden, setHidden] = useState(true)

  const onClick = id => {
    if (onSelect) {
      onSelect(id)
    }
    setHidden(!hidden)
  }

  const chain_data = chains_data?.find(c => c?.id === value)

  return (
    <Modal
      id="modal-chains"
      noButtons={true}
      hidden={hidden}
      disabled={disabled}
      onClick={open => setHidden(!open)}
      buttonTitle={chains_data ?
        <div className="w-48 min-w-max bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-2xl shadow dark:shadow-slate-400 flex items-center justify-center space-x-1.5 py-2 px-3">
          {chains_status_data ?
            <IoRadioButtonOn size={16} className={`${chain_data?.disabled ? 'text-gray-400 dark:text-gray-600' : chains_status_data?.find(c => c?.id === chain_data?.id)?.synced ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`} />
            :
            address && chain_data && (
              <Puff color={loader_color(theme)} width="16" height="16" />
            )
          }
          {chain_data && (
            <Image
              src={chain_data.image}
              alt=""
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <span className="text-sm sm:text-base font-semibold">
            {chain_data ? chainName(chain_data) : 'Chain'}
          </span>
        </div>
        :
        <Puff color={loader_color(theme)} width="24" height="24" />
      }
      buttonClassName={`w-48 min-w-max h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      title={<span className="flex items-center space-x-1">
        <span className="capitalize">
          {origin}
        </span>
        <span>Chain</span>
      </span>}
      body={(
        <Search
          value={value}
          onSelect={id => onClick(id)}
          source={source}
          destination={destination}
        />
      )}
    />
  )
}
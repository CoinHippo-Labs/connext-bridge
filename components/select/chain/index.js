import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Puff } from 'react-loader-spinner'

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
  const {
    preferences,
    chains,
    wallet,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    address,
  } = { ...wallet_data }

  const [hidden, setHidden] = useState(true)

  const onClick = id => {
    if (onSelect) {
      onSelect(id)
    }

    setHidden(!hidden)
  }

  const chain_data = chains_data?.find(c => c?.id === value)
  const {
    image,
  } = { ...chain_data }

  return (
    <Modal
      id="modal-chains"
      noButtons={true}
      hidden={hidden}
      disabled={disabled}
      onClick={open => setHidden(!open)}
      buttonTitle={chains_data ?
        <div className="w-32 sm:w-48 min-w-max bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl shadow dark:shadow-slate-700 flex items-center justify-center space-x-1 sm:space-x-1.5 py-1.5 sm:py-2 px-2 sm:px-3">
          {image && (
            <>
              <div className="flex sm:hidden">
                <Image
                  src={image}
                  alt=""
                  width={18}
                  height={18}
                  className="rounded-full"
                />
              </div>
              <div className="hidden sm:flex">
                <Image
                  src={image}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              </div>
            </>
          )}
          <span className="whitespace-nowrap text-xs sm:text-base font-semibold">
            {
              chainName(chain_data) ||
              'Chain'
            }
          </span>
        </div> :
        <Puff
          color={loader_color(theme)}
          width="24"
          height="24"
        />
      }
      buttonClassName={`w-32 sm:w-48 min-w-max h-10 sm:h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      title={<span className="flex items-center space-x-1">
        <span className="capitalize">
          {origin}
        </span>
        <span>
          Chain
        </span>
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
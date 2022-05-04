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
  chain,
}) => {
  const { preferences, chains, assets } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const [hidden, setHidden] = useState(true)

  const onClick = id => {
    if (onSelect) {
      onSelect(id)
    }
    setHidden(!hidden)
  }

  const chain_data = chains_data?.find(c => c?.id === chain)
  const asset_data = assets_data?.find(c => c?.id === value)
  const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
  const image = contract_data?.image || asset_data?.image

  return (
    <Modal
      id="modal-assets"
      noButtons={true}
      hidden={hidden}
      disabled={disabled}
      onClick={open => setHidden(!open)}
      buttonTitle={assets_data ?
        <div className="w-48 min-w-max bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-2xl shadow dark:shadow-slate-400 flex items-center justify-center space-x-1.5 py-2 px-3">
          {image && (
            <Image
              src={image}
              alt=""
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <span className="text-sm sm:text-base font-semibold">
            {asset_data ? contract_data?.symbol || asset_data.symbol : 'Token'}
          </span>
        </div>
        :
        <Puff color={loader_color(theme)} width="24" height="24" />
      }
      buttonClassName={`w-48 min-w-max h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      title={<div className="flex items-center justify-between">
        <span className="flex items-center space-x-2">
          <span className="capitalize">
            {origin}
          </span>
          <span>Token</span>
        </span>
        {chain_data && (
          <div className="flex items-center space-x-2">
            {chain_data.image && (
              <Image
                src={chain_data.image}
                alt=""
                width={24}
                height={24}
                className="rounded-full"
              />
            )}
            <span className="font-semibold">
              {chainName(chain_data)}
            </span>
          </div>
        )}
      </div>}
      body={(
        <Search
          value={value}
          onSelect={id => onClick(id)}
          chain={chain}
        />
      )}
    />
  )
}
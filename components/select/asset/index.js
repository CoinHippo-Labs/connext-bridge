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
  origin = 'source',
  is_pool = false,
  data,
}) => {
  const {
    preferences,
    chains,
    assets,
    pool_assets,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        pool_assets: state.pool_assets,
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
    assets_data,
  } = { ...assets }
  const {
    pool_assets_data,
  } = { ...pool_assets }

  const [hidden, setHidden] = useState(true)

  const onClick = id => {
    if (onSelect) {
      onSelect(id)
    }

    setHidden(!hidden)
  }

  const chain_data = chains_data?.find(c => c?.id === chain)
  const {
    chain_id,
  } = { ...chain_data }

  const _assets_data = is_pool ?
    pool_assets_data :
    assets_data

  const asset_data = data ||
    _assets_data?.find(c => c?.id === value)
  const {
    contracts,
  } = { ...asset_data }

  const contract_data = contracts?.find(c => c?.chain_id === chain_id)
  let {
    symbol,
    image,
  } = { ...contract_data }

  symbol = is_pool ?
    data?.symbol ||
    asset_data?.symbol ||
      'From Token' :
      symbol ||
        asset_data?.symbol ||
        'Token'
  image = image ||
    asset_data?.image

  return (
    <Modal
      id="modal-assets"
      noButtons={true}
      hidden={hidden}
      disabled={disabled}
      onClick={open => setHidden(!open)}
      buttonTitle={_assets_data ?
        <div className="w-32 sm:w-48 min-w-max bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl flex items-center justify-center space-x-1 sm:space-x-1.5 py-1.5 sm:py-2 px-2 sm:px-3">
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
          <span className="whitespace-nowrap text-sm sm:text-base font-semibold">
            {symbol}
          </span>
        </div> :
        <Puff
          color={loader_color(theme)}
          width="24"
          height="24"
        />
      }
      buttonClassName={`w-32 sm:w-48 min-w-max h-10 sm:h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      title={<div className="flex items-center justify-between">
        <span className="flex items-center uppercase space-x-1">
          <span>
            {origin}
          </span>
          <span>
            Token
          </span>
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
          is_pool={is_pool}
        />
      )}
    />
  )
}
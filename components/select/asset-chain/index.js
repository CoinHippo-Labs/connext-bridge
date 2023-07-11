import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Popover, PopoverHandler, PopoverContent } from '@material-tailwind/react'
import Linkify from 'react-linkify'
import parse from 'html-react-parser'
import { BiChevronDown } from 'react-icons/bi'

import Search from './search'
import Spinner from '../../spinner'
import Image from '../../image'
import Modal from '../../modal'
import { chainName, getChainData, getAssetData, getContractData } from '../../../lib/object'
import { equalsIgnoreCase } from '../../../lib/utils'

export default (
  {
    disabled = false,
    value,
    onSelect,
    chain,
    destinationChain,
    origin = '',
    isBridge = false,
    isPool = false,
    showNextAssets = false,
    showNativeAssets = false,
    showOnlyWrappable = false,
    fixed = false,
    data,
    className = 'flex items-center space-x-1.5 sm:space-x-2 sm:-ml-1',
  },
) => {
  const { chains, assets, pool_assets } = useSelector(state => ({ chains: state.chains, assets: state.assets, pool_assets: state.pool_assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { pool_assets_data } = { ...pool_assets }

  const [hidden, setHidden] = useState(true)
  const [openPopover, setOpenPopover] = useState(false)
  const triggers = {
    onMouseEnter: () => setOpenPopover(true),
    onMouseLeave: () => setOpenPopover(false),
  }

  const onClick = (id, address) => {
    if (onSelect) {
      onSelect(id, address)
    }
    setHidden(!hidden)
  }

  const chain_data = getChainData(chain, chains_data)
  const { chain_id } = { ...chain_data }
  const _assets_data = isPool ? pool_assets_data : assets_data
  const asset_data = data || getAssetData(value, _assets_data)
  const { contracts } = { ...asset_data }
  const contract_data = getContractData(chain_id, contracts)
  let { symbol, image, tooltip } = { ...contract_data }
  symbol = isPool ? data?.symbol || asset_data?.symbol || 'Select token' : data?.symbol || symbol || asset_data?.symbol || 'Token'
  image = isPool && !data ? asset_data?.image || image : data ? asset_data?.image || image : image || asset_data?.image
  switch (chain) {
    case 'gnosis':
      symbol = symbol === 'DAI' ? `X${symbol}` : symbol
      image = image?.replace('/dai.', '/xdai.')
      break
    default:
      break
  }

  const buttonComponent = (
    <div className={fixed ? 'cursor-default flex items-center space-x-1.5 sm:space-x-2 sm:-ml-1' : className || 'w-32 sm:w-48 min-w-max bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded border dark:border-slate-700 flex items-center justify-between space-x-1.5 sm:space-x-2 py-1.5 sm:py-2 3xl:py-4 px-2 sm:px-3 3xl:px-5'}>
      {image && (
        <>
          <div className="flex sm:hidden">
            <Image
              src={image}
              width={20}
              height={20}
              className="rounded-full"
            />
          </div>
          <div className="hidden sm:flex">
            <Image
              src={image}
              width={24}
              height={24}
              className="3xl:w-8 3xl:h-8 rounded-full"
            />
          </div>
        </>
      )}
      <span className={`whitespace-nowrap sm:text-lg 3xl:text-2xl font-semibold ${!image ? 'sm:ml-3' : ''}`}>
        {symbol}
      </span>
      {!fixed && <BiChevronDown size={18} className="3xl:w-6 3xl:h-6 text-slate-400 dark:text-slate-200" />}
    </div>
  )

  const component = (
    <Modal
      id="modal-assets"
      hidden={hidden}
      disabled={disabled || fixed}
      onClick={open => setHidden(!open)}
      buttonTitle={_assets_data ? buttonComponent : <Spinner name="Puff" />}
      buttonClassName={className || `w-32 sm:w-48 min-w-max h-10 sm:h-12 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      title={
        <div className="flex items-center justify-between space-x-2 pt-1 pb-2">
          <span className="flex items-center space-x-1">
            <span className="capitalize">
              {origin || 'select'}
            </span>
            <span className="normal-case">
              token
            </span>
          </span>
          {chain_data && (
            <div className="flex items-center space-x-2">
              {chain_data.image && (
                <Image
                  src={chain_data.image}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span className="capitalize font-semibold">
                {chainName(chain_data)}
              </span>
            </div>
          )}
        </div>
      }
      body={
        <Search
          value={value}
          onSelect={(a, c) => onClick(a, c)}
          chain={chain}
          destinationChain={destinationChain}
          isBridge={isBridge}
          isPool={isPool}
          showNextAssets={showNextAssets}
          showNativeAssets={showNativeAssets}
          showOnlyWrappable={showOnlyWrappable}
          data={data}
        />
      }
      noButtons={true}
    />
  )

  return (
    tooltip && equalsIgnoreCase(asset_data?.contract_address, contract_data?.contract_address) ?
      <Popover open={openPopover} handler={setOpenPopover}>
        <PopoverHandler {...triggers}>
          <div>{component}</div>
        </PopoverHandler>
        <PopoverContent {...triggers} className="linkify z-50 bg-dark border-black text-white text-xs">
          <Linkify>
            {parse(tooltip)}
          </Linkify>
        </PopoverContent>
      </Popover> :
      component
  )
}
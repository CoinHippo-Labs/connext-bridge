import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { constants } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
import { BiX, BiChevronDown } from 'react-icons/bi'

import Search from './search'
import Spinner from '../../spinner'
import Image from '../../image'
import Modal from '../../modal'
import { getChainData, getAssetData, getContractData } from '../../../lib/object'
import { equalsIgnoreCase } from '../../../lib/utils'

export default (
  {
    disabled = false,
    chain,
    asset,
    address,
    onSelect,
    isBridge = false,
    isPool = false,
    showNextAssets = true,
    showNativeAssets = true,
    showOnlyWrappable = false,
    isDestination = false,
    sourceChain,
    fixed = false,
    className = 'flex items-center space-x-1.5 sm:space-x-2',
  },
) => {
  const { chains, assets, pool_assets } = useSelector(state => ({ chains: state.chains, assets: state.assets, pool_assets: state.pool_assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { pool_assets_data } = { ...pool_assets }

  const [hidden, setHidden] = useState(true)

  const onClick = (chain, asset, address) => {
    if (onSelect) {
      onSelect(chain, asset, address)
    }
    setHidden(!hidden)
  }

  const chain_data = getChainData(chain, chains_data)
  const { chain_id } = { ...chain_data }
  const _assets_data = isPool ? pool_assets_data : assets_data
  const asset_data = getAssetData(asset, _assets_data)
  const { contracts } = { ...asset_data }
  let contract_data = getContractData(chain_id, contracts)
  const { next_asset, wrappable } = { ...contract_data }

  let isNextAsset
  let isNativeAsset
  // next asset
  if (address && equalsIgnoreCase(address, next_asset?.contract_address)) {
    contract_data = { ...contract_data, ...next_asset }
    isNextAsset = true
  }
  // native asset
  else if (wrappable && equalsIgnoreCase(address, ZeroAddress)) {
    contract_data = { ...contract_data, contract_address: ZeroAddress, symbol: asset_data.symbol, image: asset_data.image }
    isNativeAsset = true
  }

  let { symbol, name, image } = { ...contract_data }
  symbol = symbol || asset_data?.symbol || 'Token'
  image = image || asset_data?.image
  switch (chain) {
    case 'gnosis':
      symbol = symbol === 'DAI' ? `X${symbol}` : symbol
      image = image?.replace('/dai.', '/xdai.')
      break
    default:
      break
  }
  name = name || (isNextAsset ? `Next ${asset_data?.name}` : isNativeAsset ? asset_data?.name : equalsIgnoreCase(symbol, `W${asset_data?.symbol}`) ? `Wrapped ${asset_data?.name}` : asset_data?.name)

  const buttonComponent = (
    <div className={fixed ? 'cursor-default flex items-center space-x-1.5 sm:space-x-2' : className || 'w-32 sm:w-48 min-w-max bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded border dark:border-slate-700 flex items-center justify-between space-x-1.5 sm:space-x-2 py-1.5 sm:py-2 3xl:py-4 px-2 sm:px-3 3xl:px-5'}>
      {image && (
        <div className="flex items-end">
          <Image
            src={image}
            width={24}
            height={24}
            className="3xl:w-8 3xl:h-8 rounded-full opacity-89"
          />
          {chain_data?.image && (
            <Image
              src={chain_data.image}
              width={14}
              height={14}
              className="rounded-full z-10 -ml-2"
            />
          )}
        </div>
      )}
      <div className={`flex items-center space-x-1.5 sm:space-x-2 ${!image ? 'sm:ml-3' : ''}`}>
        <span className="whitespace-nowrap sm:text-lg 3xl:text-2xl font-semibold">
          {symbol}
        </span>
      </div>
      {!fixed && <BiChevronDown size={18} className="3xl:w-6 3xl:h-6 text-slate-400 dark:text-slate-200" />}
    </div>
  )

  return (
    <Modal
      hidden={hidden}
      disabled={disabled || fixed}
      onClick={open => setHidden(!open)}
      buttonTitle={_assets_data ? buttonComponent : <Spinner name="Puff" />}
      buttonClassName={`${disabled ? 'cursor-not-allowed' : ''} ${className || 'w-32 sm:w-48 min-w-max h-10 sm:h-12 flex items-center justify-center'}`}
      title={
        <div className="flex items-center justify-between space-x-2 pt-1 pb-2">
          <span>Select {isDestination ? 'destination ' : ''}token</span>
          <div
            onClick={() => setHidden(true)}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-full p-2"
          >
            <BiX size={18} />
          </div>
        </div>
      }
      body={
        <Search
          chain={chain}
          asset={asset}
          address={address}
          onSelect={(chain, asset, address) => onClick(chain, asset, address)}
          isBridge={isBridge}
          isPool={isPool}
          showNextAssets={showNextAssets}
          showNativeAssets={showNativeAssets}
          showOnlyWrappable={showOnlyWrappable}
          isDestination={isDestination}
          sourceChain={sourceChain}
        />
      }
      noButtons={true}
    />
  )
}
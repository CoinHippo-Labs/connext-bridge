import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { DebounceInput } from 'react-debounce-input'
import { Img } from 'react-image'
import { Puff } from 'react-loader-spinner'
import { IoRadioButtonOn } from 'react-icons/io5'

import Search from './search'
import Modal from '../../modals/modal-confirm'

import { chainTitle } from '../../../lib/object/chain'

export default function DropdownAsset({ disabled, swapConfig, onSelect, from, to, side = 'from', amountOnChange }) {
  const { preferences, chains, assets, chains_status, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, chains_status: state.chains_status, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { chains_status_data } = { ...chains_status }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }

  const [hidden, setHidden] = useState(true)

  const handleDropdownClick = _asset_id => {
    if (onSelect && typeof _asset_id === 'string') {
      onSelect(_asset_id)
    }

    setHidden(!hidden)
  }

  const { fromChainId, fromAssetId, toChainId, toAssetId, amount } = { ...swapConfig }
  side = amountOnChange ? 'from' : side
  const chain = chains_data?.find(c => c?.chain_id === (side === 'from' ? fromChainId : toChainId))
  const fromAsset = assets_data?.find(a => a?.id === fromAssetId)
  const toAsset = assets_data?.find(a => a?.id === toAssetId)
  const asset = side === 'from' ? fromAsset : toAsset
  const contract = asset?.contracts?.find(c => c?.chain_id === (side === 'from' ? fromChainId : toChainId))
  const isSupport = fromAsset && toAsset &&
    !(fromChainId && fromAsset.contracts?.findIndex(c => c?.chain_id === fromChainId) < 0) &&
    !(toChainId && toAsset.contracts?.findIndex(c => c?.chain_id === toChainId) < 0)
  const showInput = side === 'from' && isSupport && amountOnChange

  return (
    <div className={`flex items-center space-x-2.5 ${showInput ? 'mt-1 sm:mt-0' : ''}`}>   
      {!showInput && (isSupport || !amountOnChange) && (
        <Modal
          hidden={hidden}
          disabled={disabled}
          onClick={open => setHidden(!open)}
          buttonTitle={asset ?
            <div className={`${!amountOnChange ? 'w-48' : ''} bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 ${!showInput ? 'rounded-3xl shadow justify-center py-2 px-4' : 'rounded-full w-12 h-12 justify-center'} flex items-center text-lg space-x-1.5`}>
              <Img
                src={contract?.image || asset.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              {!showInput && (
                <span className="font-semibold">
                  {contract?.symbol || asset.symbol}
                </span>
              )}
            </div>
            :
            assets_data ?
              <div className="w-48 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-3xl shadow uppercase text-gray-500 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 text-lg font-medium py-2 px-4">Token</div>
              :
              <Puff color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="24" height="24" />
          }
          buttonClassName={`${!assets_data ? 'w-48' : 'min-w-max'} h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
          title={<div className="flex items-center justify-between">
            <span className="capitalize">{side} Token</span>
            {chain && (
              <div className="flex items-center space-x-1.5">
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
                <span className="font-semibold">{chainTitle(chain)}</span>
              </div>
            )}
          </div>}
          body={<Search
            asset_id={asset?.id}
            updateAssetId={_asset_id => handleDropdownClick(_asset_id)}
            from_chain_id={fromChainId}
            chain_id={chain?.chain_id}
            from={from}
            to={to}
            side={side}
          />}
          noButtons={true}
          id="modal-asset"
        />
      )}
      {asset && (
        !showInput ?
          side === 'from' && amountOnChange && (
            <span className="h-8 flex items-center text-gray-400 dark:text-gray-600 text-sm font-light mr-1 pt-0.5">
              Unsupported chain/asset combo
            </span>
          )
          :
          <DebounceInput
            debounceTimeout={300}
            size="small"
            type="number"
            placeholder="0.00"
            disabled={disabled}
            value={typeof amount === 'number' && amount >= 0 ? amount : ''}
            onChange={e => {
              if (amountOnChange) {
                amountOnChange(e.target.value < 0 ? 0 : e.target.value)
              }
            }}
            onWheel={e => e.target.blur()}
            className={`w-48 bg-gray-50 focus:bg-gray-100 dark:bg-gray-800 dark:focus:bg-gray-700 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 dark:focus:ring-0 rounded-3xl font-mono text-lg font-medium text-right px-4`}
          />
      )}
    </div>
  )
}
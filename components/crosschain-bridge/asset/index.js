import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { DebounceInput } from 'react-debounce-input'
import { Img } from 'react-image'
import Loader from 'react-loader-spinner'
import { BsPatchExclamationFill } from 'react-icons/bs'

import Search from './search'
import Modal from '../../modals/modal-confirm'

export default function DropdownAsset({ disabled, swapConfig, onSelect, side = 'from', from, to, amountOnChange }) {
  const { assets, preferences } = useSelector(state => ({ assets: state.assets, preferences: state.preferences }), shallowEqual)
  const { assets_data } = { ...assets }
  const { theme } = { ...preferences }

  const { fromChainId, fromAssetId, toChainId, toAssetId, amount } = { ...swapConfig }
  side = amountOnChange ? 'from' : side

  const asset = assets_data?.find(_asset => _asset?.id === (side === 'from' ? fromAssetId : toAssetId))
  const fromAsset = assets_data?.find(_asset => _asset?.id === fromAssetId)
  const toAsset = assets_data?.find(_asset => _asset?.id === toAssetId)

  const [hidden, setHidden] = useState(true)

  const handleDropdownClick = _asset_id => {
    if (onSelect && typeof _asset_id === 'string') {
      onSelect(_asset_id)
    }

    setHidden(!hidden)
  }

  const isSupport = fromAsset && !(fromChainId && !fromAsset.contracts?.map(_contract => _contract?.chain_id)?.includes(fromChainId)) &&
    toAsset && !(toChainId && !toAsset.contracts?.map(_contract => _contract?.chain_id)?.includes(toChainId))

  const showInput = side === 'from' && amountOnChange && isSupport

  return (
    <div className={`relative flex items-center space-x-2.5 ${showInput ? 'mt-1 sm:mt-0' : ''}`}>   
      {!showInput && (isSupport || !amountOnChange) && (
        <Modal
          hidden={hidden}
          buttonTitle={asset ?
            <div className={`${!amountOnChange ? 'w-48' : ''} bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-${!showInput ? '3xl justify-center py-2 px-4' : 'full w-12 h-12 justify-center'} flex items-center text-lg space-x-1.5`}>
              <Img
                src={asset.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              {!showInput && (
                <span className="font-semibold">{asset.symbol}</span>
              )}
            </div>
            :
            assets_data ?
              <div className="w-48 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-3xl uppercase text-gray-500 hover:text-gray-600 dark:text-gray-200 dark:hover:text-gray-100 text-lg font-medium py-2 px-4">Select Token</div>
              :
              <Loader type="Puff" color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="24" height="24" />
          }
          disabled={disabled}
          onClick={open => setHidden(!open)}
          buttonClassName={`${!assets_data ? 'w-48' : 'min-w-max'} h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
          title={<span className="capitalize">{side}</span>}
          body={<Search
            id={asset?.id}
            updateId={_id => handleDropdownClick(_id)}
            from={from}
            to={to}
          />}
          noButtons={true}
        />
      )}
      {asset && (
        <>
          {!showInput ?
            side === 'from' && amountOnChange ?
              <span className="text-gray-400 dark:text-gray-600 text-base italic mr-1">No Route</span>
              :
              null
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
                  amountOnChange(e.target.value)
                }
              }}
              className={`w-48 bg-gray-100 dark:bg-gray-800 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-3xl font-mono text-lg font-semibold text-right px-4`}
            />
          }
        </>
      )}
    </div>
  )
}
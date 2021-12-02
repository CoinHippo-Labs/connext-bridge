import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { DebounceInput } from 'react-debounce-input'
import { Img } from 'react-image'
import Loader from 'react-loader-spinner'
import { BsPatchExclamationFill } from 'react-icons/bs'

import Assets from './assets'

export default function DropdownAsset({ disabled, assetId, onSelect, fromChainId, toChainId, amount, amountOnChange }) {
  const { assets, preferences } = useSelector(state => ({ assets: state.assets, preferences: state.preferences }), shallowEqual)
  const { assets_data } = { ...assets }
  const { theme } = { ...preferences }

  const asset = assets_data?.find(_asset => _asset?.id === assetId)

  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = event => {
      if (
        hidden ||
        buttonRef.current.contains(event.target) ||
        dropdownRef.current.contains(event.target)
      ) {
        return false
      }
      setHidden(!hidden)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [hidden, buttonRef, dropdownRef])

  const handleDropdownClick = _asset_id => {
    if (onSelect && typeof _asset_id === 'string') {
      onSelect(_asset_id)
    }

    setHidden(!hidden)
  }

  const showInput = asset && !((fromChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(fromChainId)) ||
    (toChainId && !asset.contracts?.map(_contract => _contract?.chain_id)?.includes(toChainId)))

  return (
    <div className={`relative flex items-center space-x-2.5 ${showInput ? 'mt-1 sm:mt-0' : ''}`}>
      <button
        ref={buttonRef}
        disabled={disabled}
        onClick={handleDropdownClick}
        className={`${!assets_data ? 'w-40' : ''} h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      >
        {asset ?
          <div className={`bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-${showInput ? 'full w-12 h-12 justify-center' : '3xl py-1.5 px-4'} flex items-center text-lg space-x-1.5`}>
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
            <div className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-3xl uppercase text-gray-500 hover:text-gray-600 dark:text-gray-200 dark:hover:text-gray-100 text-lg font-medium py-1.5 px-4">Select Token</div>
            :
            <Loader type="Puff" color={theme === 'dark' ? '#F9FAFB' : '#D1D5DB'} width="24" height="24" />
        }
      </button>
      {asset && (
        <>
          {!showInput ?
            <span className="text-gray-400 dark:text-gray-600 text-base italic">No Route</span>
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
      <div
        ref={dropdownRef}
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 left-0 mt-14`}
      >
        <div className="dropdown-content inside w-64 bottom-start">
          <Assets handleDropdownClick={_asset_id => handleDropdownClick(_asset_id)} />
        </div>
      </div>
    </div>
  )
}
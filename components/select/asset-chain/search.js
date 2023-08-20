import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'

import Assets from './assets'

export default (
  {
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
  },
) => {
  const [inputSearch, setInputSearch] = useState('')

  return (
    <div className="navbar-search mt-1">
      <div className="relative">
        <input
          value={inputSearch}
          onChange={e => setInputSearch(e.target.value)}
          type="search"
          placeholder="Search by symbol, name or address"
          className="w-full h-10 bg-transparent appearance-none rounded border border-slate-200 dark:border-slate-800 text-sm pl-10 pr-5"
        />
        <div className="absolute top-0 left-0 mt-3 ml-4">
          <FiSearch className="w-4 h-4" />
        </div>
        <div className="w-full mx-auto pt-4 pb-2">
          <Assets
            chain={chain}
            asset={asset}
            address={address}
            inputSearch={inputSearch}
            onSelect={
              (chain, asset, address) => {
                if (onSelect) {
                  onSelect(chain, asset, address)
                }
              }
            }
            isBridge={isBridge}
            isPool={isPool}
            showNextAssets={showNextAssets}
            showNativeAssets={showNativeAssets}
            showOnlyWrappable={showOnlyWrappable}
            isDestination={isDestination}
            sourceChain={sourceChain}
          />
        </div>
      </div>
    </div>
  )
}
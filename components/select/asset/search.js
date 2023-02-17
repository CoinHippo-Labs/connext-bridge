import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'

import Assets from './assets'

export default (
  {
    value,
    onSelect,
    chain,
    isBridge = false,
    isPool = false,
    showNextAssets = false,
    showNativeAssets = false,
    showOnlyWrapable = false,
    data,
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
          placeholder="Search"
          className="w-full h-10 bg-transparent appearance-none rounded border border-slate-200 dark:border-slate-800 text-sm pl-10 pr-5"
        />
        <div className="absolute top-0 left-0 mt-3 ml-4">
          <FiSearch
            className="w-4 h-4 stroke-current"
          />
        </div>
        <div className="w-full mx-auto pt-4 pb-2">
          <Assets
            value={value}
            inputSearch={inputSearch}
            onSelect={
              (a, c) => {
                if (onSelect) {
                  onSelect(a, c)
                }
              }
            }
            chain={chain}
            isBridge={isBridge}
            isPool={isPool}
            showNextAssets={showNextAssets}
            showNativeAssets={showNativeAssets}
            showOnlyWrapable={showOnlyWrapable}
            data={data}
          />
        </div>
      </div>
    </div>
  )
}
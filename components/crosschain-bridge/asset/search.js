import { useState } from 'react'

import { FiSearch } from 'react-icons/fi'

import Assets from './assets'

export default function Search({ asset_id, updateAssetId, from_chain_id, chain_id, from, to, side }) {
  const [inputSearch, setInputSearch] = useState('')

  return (
    <div className="navbar-search mt-1">
      <div className="relative">
        <div className="flex items-center justify-between">
          <input
            value={inputSearch}
            onChange={e => setInputSearch(e.target.value)}
            type="search"
            placeholder="Search..."
            className="w-4/6 h-10 bg-transparent appearance-none border-gray-300 focus:border-blue-500 dark:border-gray-700 focus:ring-blue-600 dark:focus:ring-gray-600 rounded-3xl text-sm pl-10 pr-5"
          />
          <div className="absolute top-0 left-0 mt-3 ml-4">
            <FiSearch className="w-4 h-4 stroke-current" />
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl whitespace-nowrap uppercase text-gray-700 dark:text-gray-300 text-sm font-medium ml-4 py-1 px-2">
            {side === 'from' ? 'Balances' : 'Max Transfers'}
          </div>
        </div>
        <div className="w-full mx-auto py-2">
          <Assets
            asset_id={asset_id}
            inputSearch={inputSearch}
            handleDropdownClick={asset_id => {
              if (updateAssetId) {
                updateAssetId(asset_id)
              }
            }}
            from_chain_id={from_chain_id}
            chain_id={chain_id}
            from={from}
            to={to}
            side={side}
          />
        </div>
      </div>
    </div>
  )
}
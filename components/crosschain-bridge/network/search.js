import { useState } from 'react'

import { FiSearch } from 'react-icons/fi'

import Networks from './networks'

export default function Search({ chain_id, updateChainId, from, to }) {
  const [inputSearch, setInputSearch] = useState('')

  return (
    <div className="navbar-search mt-1">
      <div className="relative">
        <input
          value={inputSearch}
          onChange={e => setInputSearch(e.target.value)}
          type="search"
          placeholder="Search..."
          className="w-full h-10 bg-transparent appearance-none border-gray-300 focus:border-blue-500 dark:border-gray-700 focus:ring-blue-600 dark:focus:ring-gray-600 rounded-3xl text-sm pl-10 pr-5"
        />
        <div className="absolute top-0 left-0 mt-3 ml-4">
          <FiSearch className="w-4 h-4 stroke-current" />
        </div>
        <div className="w-full mx-auto py-2">
          <Networks
            chain_id={chain_id}
            inputSearch={inputSearch}
            handleDropdownClick={chain_id => {
              if (updateChainId) {
                updateChainId(chain_id)
              }
            }}
            from={from}
            to={to}
          />
        </div>
      </div>
    </div>
  )
}
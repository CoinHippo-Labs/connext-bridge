import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'
import { Puff } from 'react-loader-spinner'
import { IoRadioButtonOn } from 'react-icons/io5'

export default function Networks({ chain_id, inputSearch, handleDropdownClick, from, to }) {
  const { preferences, chains, chains_status, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, chains_status: state.chains_status, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { chains_status_data } = { ...chains_status }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }

  const _chains = _.orderBy(chains_data?.filter(item => !item.menu_hidden).filter(item => !inputSearch || item).map(item => {
    return { ...item, scores: ['short_name', 'title', 'id'].map(field => item[field] && item[field].toLowerCase().includes(inputSearch.toLowerCase()) ? inputSearch.length > 1 ? (inputSearch.length / item[field].length) : .5 : -1) }
  }).map(item => { return { ...item, max_score: _.max(item.scores) } }).filter(item => item.max_score > 1 / 10) || [], ['max_score'], ['desc'])

  return (
    <div className="max-h-96 overflow-y-scroll">
      {_chains?.map((item, i) => (
        item.disabled ?
          <div
            key={i}
            title="Disabled"
            className="dropdown-item rounded-lg cursor-not-allowed flex items-center justify-start space-x-2 p-2"
          >
            <div className="w-5/6 sm:w-4/6 flex items-center space-x-2">
              <IoRadioButtonOn size={12} className="w-4 text-gray-400 dark:text-gray-600" />
              <Img
                src={item.image}
                alt=""
                className="w-8 h-8 rounded-full"
              />
              <span className="w-1/6 sm:w-2/6 text-gray-400 dark:text-gray-600 text-base">{item.title}</span>
            </div>
          </div>
          :
          <div
            key={i}
            onClick={() => handleDropdownClick(item.chain_id)}
            className={`dropdown-item ${item.chain_id === chain_id ? 'bg-gray-100 dark:bg-black' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} rounded-lg cursor-pointer flex items-center justify-start space-x-2 p-2`}
          >
            <div className="w-5/6 sm:w-4/6 flex items-center space-x-2">
              {chains_status_data ?
                <IoRadioButtonOn size={16} className={`w-4 ${chains_status_data?.find(c => c?.chain_id === item.chain_id)?.synced ? 'text-green-600 dark:text-green-500' : 'text-red-500 dark:text-red-600'}`} />
                :
                address && (
                  <Puff color={theme === 'dark' ? '#60A5FA' : '#2563EB'} width="16" height="16" />
                )
              }
              <Img
                src={item.image}
                alt=""
                className="w-8 h-8 rounded-full"
              />
              <span className={`whitespace-nowrap text-base ${item.chain_id === chain_id ? 'font-semibold' : 'font-normal'}`}>{item.title}</span>
            </div>
            {(item.chain_id === from || item.chain_id === to) && (
              <div className="w-1/6 sm:w-2/6 text-gray-400 dark:text-gray-500 text-right">
                {_.uniq([item.chain_id === from ? 'From' : 'To', item.chain_id === to ? 'To' : 'From']).join(' & ')}
              </div>
            )}
          </div>
      ))}
    </div>
  )
}
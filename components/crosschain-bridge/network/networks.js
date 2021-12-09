import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'
import { IoRadioButtonOn } from 'react-icons/io5'

export default function Networks({ id, inputSearch, handleDropdownClick, from, to }) {
  const { chains, chains_status } = useSelector(state => ({ chains: state.chains, chains_status: state.chains_status }), shallowEqual)
  const { chains_data } = { ...chains }
  const { chains_status_data } = { ...chains_status }

  const _chains = _.orderBy(chains_data?.filter(item => !item.menu_hidden).filter(item => !inputSearch || item).map(item => {
    return { ...item, scores: ['short_name', 'title', 'id'].map(field => item[field] && item[field].toLowerCase().includes(inputSearch.toLowerCase()) ? inputSearch.length > 1 ? (inputSearch.length / item[field].length) : .5 : -1) }
  }).map(item => { return { ...item, max_score: _.max(item.scores) } }).filter(item => item.max_score > 3 / 10) || [], ['max_score'], ['desc'])

  return (
    <>
      {/*<div className="dropdown-title">Select Chain</div>*/}
      {/*<div className="flex flex-wrap py-1">
        {chains_data?.filter(item => !item.menu_hidden && !item.disabled).map((item, i) => (
          item.disabled ?
            <div
              key={i}
              title="Disabled"
              className="dropdown-item w-1/2 cursor-not-allowed flex items-center justify-start space-x-1.5 p-2"
            >
              <Img
                src={item.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-xs font-medium">{item.title}</span>
            </div>
            :
            <div
              key={i}
              onClick={() => handleDropdownClick(item.chain_id)}
              className="dropdown-item w-1/2 cursor-pointer flex items-center justify-start space-x-1.5 p-2"
            >
              <Img
                src={item.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-xs font-medium">{item.title}</span>
            </div>
        ))}
      </div>*/}
      <div className="max-h-80 overflow-y-scroll">
        {_chains?.map((item, i) => (
          item.disabled ?
            <div
              key={i}
              title="Disabled"
              className="dropdown-item rounded-lg cursor-not-allowed flex items-center justify-start space-x-2 p-2"
            >
              <IoRadioButtonOn size={12} className="text-gray-400 dark:text-gray-600" />
              <Img
                src={item.image}
                alt=""
                className="w-8 h-8 rounded-full"
              />
              <span className="text-base font-medium">{item.title}</span>
            </div>
            :
            <div
              key={i}
              onClick={() => handleDropdownClick(item.chain_id)}
              className={`dropdown-item ${item.chain_id === id ? 'bg-gray-100 dark:bg-black' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} rounded-lg cursor-pointer flex items-center justify-start space-x-2 p-2`}
            >
              <IoRadioButtonOn size={12} className={`${!chains_status_data || chains_status_data?.find(_chain => _chain?.id === item.id)?.synced ? 'text-green-600 dark:text-green-500' : 'text-red-500 dark:text-red-600'}`} />
              <Img
                src={item.image}
                alt=""
                className="w-8 h-8 rounded-full"
              />
              <span className="whitespace-nowrap text-base font-medium">{item.title}</span>
              {(item.chain_id === from || item.chain_id === to) && (
                <div className="w-full text-gray-400 dark:text-gray-500 italic text-right">
                  {_.uniq([item.chain_id === from ? 'From' : 'To', item.chain_id === to ? 'To' : 'From']).join(' & ')}
                </div>
              )}
            </div>
        ))}
      </div>
    </>
  )
}
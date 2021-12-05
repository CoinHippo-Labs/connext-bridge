import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'

import { numberFormat } from '../../../lib/utils'

export default function Assets({ id, inputSearch, handleDropdownClick, from, to, chain_id }) {
  const { assets, max_transfers } = useSelector(state => ({ assets: state.assets, max_transfers: state.max_transfers }), shallowEqual)
  const { assets_data } = { ...assets }
  const { max_transfers_data } = { ...max_transfers }

  const _assets = _.orderBy(assets_data?.filter(item => !item.menu_hidden).filter(item => !inputSearch || item).map(item => {
    return { ...item, scores: ['symbol', 'id'].map(field => item[field] && item[field].toLowerCase().includes(inputSearch.toLowerCase()) ? inputSearch.length > 1 ? (inputSearch.length / item[field].length) : .5 : -1) }
  }).map(item => { return { ...item, max_score: _.max(item.scores) } }).filter(item => item.max_score > 3 / 10) || [], ['max_score'], ['desc'])

  return (
    <>
      {/*<div className="dropdown-title">Select Token</div>*/}
      {/*<div className="flex flex-wrap py-1">
        {assets_data?.filter(item => !item.menu_hidden && !item.disabled).map((item, i) => (
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
              <span className="text-xs font-medium">{item.symbol}</span>
            </div>
            :
            <div
              key={i}
              onClick={() => handleDropdownClick(item.id)}
              className="dropdown-item w-1/2 cursor-pointer flex items-center justify-start space-x-1.5 p-2"
            >
              <Img
                src={item.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-xs font-medium">{item.symbol}</span>
            </div>
        ))}
      </div>*/}
      <div className="max-h-80 overflow-y-scroll">
        {_assets?.map((item, i) => {
          const contract = item.contracts?.find(_contract => _contract?.chain_id === chain_id)
          const asset = max_transfers_data?.[chain_id]?.[contract?.contract_address]

          return item.disabled ?
            <div
              key={i}
              title="Disabled"
              className="dropdown-item rounded-lg cursor-not-allowed flex items-center justify-start space-x-2 p-2"
            >
              <Img
                src={item.image}
                alt=""
                className="w-8 h-8 rounded-full"
              />
              <span className="text-base font-medium">{item.symbol}</span>
            </div>
            :
            <div
              key={i}
              onClick={() => handleDropdownClick(item.id)}
              className={`dropdown-item ${item.id === id ? 'bg-gray-100 dark:bg-black' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} rounded-lg cursor-pointer flex items-center justify-start space-x-2 p-2`}
            >
              <Img
                src={item.image}
                alt=""
                className="w-8 h-8 rounded-full"
              />
              <span className="whitespace-nowrap text-base font-medium">{item.symbol}</span>
              <div className="w-full ml-auto">
                {contract && asset && (
                  <div className="font-mono font-semibold text-right">{numberFormat(asset.amount / Math.pow(10, contract.contract_decimals), '0,0.00')}</div>
                )}
                {(item.id === from || item.id === to) && (
                  <div className="text-gray-400 dark:text-gray-500 italic text-right">
                    {_.uniq([item.id === from ? 'From' : 'To', item.id === to ? 'To' : 'From']).join(' & ')}
                  </div>
                )}
              </div>
            </div>
        })}
      </div>
    </>
  )
}
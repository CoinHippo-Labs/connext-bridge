import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'

import { numberFormat } from '../../../lib/utils'

export default function Assets({ asset_id, inputSearch, handleDropdownClick, chain_id, from, to, side }) {
  const { chains, assets, balances, max_transfers } = useSelector(state => ({ chains: state.chains, assets: state.assets, balances: state.balances, max_transfers: state.max_transfers }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { balances_data } = { ...balances }
  const { max_transfers_data } = { ...max_transfers }

  const chain = chains_data?.find(c => c?.chain_id === chain_id)

  const _assets = _.orderBy(assets_data?.filter(item => !item.menu_hidden).filter(item => !inputSearch || item).map(item => {
    return { ...item, scores: ['symbol', 'id'].map(field => item[field] && item[field].toLowerCase().includes(inputSearch.toLowerCase()) ? inputSearch.length > 1 ? (inputSearch.length / item[field].length) : .5 : -1) }
  }).map(item => { return { ...item, max_score: _.max(item.scores) } }).filter(item => item.max_score > 1 / 10) || [], ['max_score'], ['desc'])

  return (
    <div className="max-h-96 overflow-y-scroll">
      {_assets?.map((item, i) => {
        const contract = item.contracts?.find(_contract => _contract?.chain_id === chain_id)
        const asset = max_transfers_data?.[chain_id]?.[contract?.contract_address]

        let balance = balances_data?.[chain_id]?.find(_contract => _contract?.contract_address === contract?.contract_address)
        balance = balance || balances_data?.[chain_id]?.find(_contract => item?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase() && chain?.provider_params?.[0]?.nativeCurrency?.symbol?.toLowerCase() === _contract?.contract_ticker_symbol?.toLowerCase())

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
            <span className="whitespace-nowrap text-gray-400 dark:text-gray-600 text-base font-medium">{contract?.symbol || item.symbol}</span>
          </div>
          :
          <div
            key={i}
            onClick={() => handleDropdownClick(item.id)}
            className={`dropdown-item ${item.id === asset_id ? 'bg-gray-100 dark:bg-black' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} rounded-lg cursor-pointer flex items-center justify-start space-x-2 p-2`}
          >
            <Img
              src={item.image}
              alt=""
              className="w-8 h-8 rounded-full"
            />
            <span className={`whitespace-nowrap ${side === 'from' && chain_id && !Number(balance?.balance) ? 'text-gray-300 dark:text-gray-600' : ''} text-base font-medium`}>{contract?.symbol || item.symbol}</span>
            <div className="w-full ml-auto">
              {side === 'from' ?
                balance ?
                  <div className={`flex items-center justify-end ${chain_id && !Number(balance?.balance) ? 'text-gray-300 dark:text-gray-600' : ''} space-x-1`}>
                    <span className="font-mono">{numberFormat((balance.balance || 0) / Math.pow(10, balance.contract_decimals || 0), '0,0.00000000')}</span>
                    <span className="font-semibold">{contract?.symbol || balance.contract_ticker_symbol}</span>
                  </div>
                  :
                  balances_data?.[chain_id] ?
                    <div className="text-gray-300 dark:text-gray-600 text-right">-</div>
                    :
                    null
                :
                contract && asset ?
                  <div className="font-mono font-semibold text-right">{numberFormat(asset.amount / Math.pow(10, contract.contract_decimals), '0,0.00')}</div>
                  :
                  chain && _assets.length > 0 ?
                    <div className="text-right">-</div>
                    :
                    null
              }
              {(item.id === from || item.id === to) && (
                <div className="text-gray-400 dark:text-gray-500 italic text-right">
                  {_.uniq([item.id === from ? 'From' : 'To', item.id === to ? 'To' : 'From']).join(' & ')}
                </div>
              )}
            </div>
          </div>
      })}
    </div>
  )
}
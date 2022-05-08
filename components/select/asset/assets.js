import { Image } from 'react-image'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import { number_format } from '../../../lib/utils'

export default ({ value, inputSearch, onSelect, chain }) => {
  const { chains, assets, balances } = useSelector(state => ({ chains: state.chains, assets: state.assets, balances: state.balances }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { balances_data } = { ...balances }

  const chain_data = chains_data?.find(c => c?.id === chain)
  const chain_id = chain_data?.chain_id

  const assets_data_sorted = _.orderBy(
    assets_data?.filter(a => !inputSearch || a).map(a => {
      return {
        ...a,
        scores: ['symbol', 'name', 'id'].map(f => a[f]?.toLowerCase().includes(inputSearch.toLowerCase()) ?
          inputSearch.length > 1 ? (inputSearch.length / a[f].length) : .5 : -1
        ),
      }
    }).map(a => {
      return {
        ...a,
        max_score: _.max(a.scores),
      }
    }).filter(a => a.max_score > 1 / 10) || [],
    ['max_score'], ['desc']
  )

  return (
    <div className="max-h-96 overflow-y-scroll">
      {assets_data_sorted?.map((a, i) => {
        const selected = a.id === value
        const className = `dropdown-item ${a.disabled ? 'cursor-not-allowed' : selected ? 'bg-slate-100 dark:bg-slate-800 cursor-pointer' : 'hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'} rounded-lg flex items-center justify-between p-2`
        const contract_data = a.contracts?.find(c => c?.chain_id === chain_id)
        const image = contract_data?.image || a.image
        const balance = balances_data?.[chain_id]?.find(b => b?.contract_address?.toLowerCase() === contract_data?.contract_address?.toLowerCase())
        const amount = balance && Number(balance.amount)
        const item = (
          <div className="flex items-center space-x-2">
            {image && (
              <Image
                src={image}
                alt=""
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className={`whitespace-nowrap text-base ${selected ? 'font-bold' : 'font-normal'}`}>
              {contract_data?.symbol || a.symbol || a.name}
            </span>
          </div>
        )
        const balance_component = balances_data?.[chain_id] && (
          <div className={`${chain_id && !amount ? 'text-slate-400 dark:text-slate-500' : ''} ${selected ? 'font-semibold' : 'font-normal'} ml-auto`}>
            {typeof amount === 'number' ?
              number_format(amount, amount > 10000 ? '0,0' : amount > 1000 ? '0,0.00' : '0,0.000000', true) : 'n/a'
            }
          </div>
        )
        return a.disabled ?
          <div
            key={i}
            title="Disabled"
            className={className}
          >
            {item}
            {balance_component}
          </div>
          :
          <div
            key={i}
            onClick={() => onSelect(a.id)}
            className={className}
          >
            {item}
            {balance_component}
          </div>
      })}
    </div>
  )
}
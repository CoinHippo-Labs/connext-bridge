import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Image from '../../image'

export default ({ value, inputSearch, onSelect, source, destination }) => {
  const { preferences, chains, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }

  const chains_data_sorted = _.orderBy(
    chains_data?.filter(c => !inputSearch || c).map(c => {
      return {
        ...c,
        scores: ['short_name', 'name', 'id'].map(f => c[f]?.toLowerCase().includes(inputSearch.toLowerCase()) ?
          inputSearch.length > 1 ? (inputSearch.length / c[f].length) : .5 : -1
        ),
      }
    }).map(c => {
      return {
        ...c,
        max_score: _.max(c.scores),
      }
    }).filter(c => c.max_score > 1 / 10) || [],
    ['max_score'], ['desc']
  )

  return (
    <div className="max-h-96 overflow-y-scroll">
      {chains_data_sorted?.map((c, i) => {
        const selected = c.id === value
        const className = `dropdown-item ${c.disabled ? 'cursor-not-allowed' : selected ? 'bg-slate-100 dark:bg-slate-800 cursor-pointer' : 'hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'} rounded-lg flex items-center justify-between p-2`
        const item = (
          <>
            <div className="flex items-center space-x-2">
              {c.image && (
                <Image
                  src={c.image}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className={`whitespace-nowrap text-base ${selected ? 'font-bold' : 'font-normal'}`}>
                {c.name}
              </span>
            </div>
            {[source, destination].includes(c.id) && (
              <div className="flex items-center space-x-2 ml-auto">
                {_.uniq([c.id === source ? 's' : 'd', c.id === destination ? 'd' : 's']).map((o, i) => (
                  <div key={i} className="bg-blue-600 rounded-lg uppercase text-white text-lg font-semibold px-2">
                    {o}
                  </div>
                ))}
              </div>
            )}
          </>
        )
        return c.disabled ?
          <div
            key={i}
            title="Disabled"
            className={className}
          >
            {item}
          </div>
          :
          <div
            key={i}
            onClick={() => onSelect(c.id)}
            className={className}
          >
            {item}
          </div>
      })}
    </div>
  )
}
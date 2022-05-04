import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { Puff } from 'react-loader-spinner'
import { IoRadioButtonOn } from 'react-icons/io5'

import Image from '../../image'
import { loader_color } from '../../../lib/utils'

export default ({ value, inputSearch, onSelect, source, destination }) => {
  const { preferences, chains, chains_status, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, chains_status: state.chains_status, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { chains_status_data } = { ...chains_status }
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
        const className = `dropdown-item ${c.disabled ? 'cursor-not-allowed' : selected ? 'bg-slate-100 dark:bg-slate-800 cursor-pointer' : 'hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'} rounded-lg flex items-center justify-start space-x-2 p-2`
        const item = (
          <>
            {chains_status_data ?
              <IoRadioButtonOn size={16} className={`${c?.disabled ? 'text-gray-400 dark:text-gray-600' : chains_status_data?.find(_c => _c?.id === c?.id)?.synced ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`} />
              :
              address && (
                <Puff color={loader_color(theme)} width="16" height="16" />
              )
            }
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
            {([source, destination].includes(c.id) && (
              <div className="flex items-center space-x-2 ml-auto">
                {_.uniq([c.id === source ? 's' : 'd', c.id === to ? 'd' : 's']).map((o, i) => (
                  <div key={i} className="bg-blue-600 rounded-lg uppercase text-base p-2">
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
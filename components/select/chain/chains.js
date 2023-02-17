import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Image from '../../image'
import { split, toArray, name, equalsIgnoreCase } from '../../../lib/utils'

export default (
  {
    value,
    inputSearch,
    onSelect,
    source,
    destination,
    isPool = false,
  },
) => {
  const {
    chains,
  } = useSelector(
    state => (
      {
        chains: state.chains,
      }
    ),
    shallowEqual,
  )
  const {
    chains_data,
  } = { ...chains }

  const chains_data_sorted =
    _.orderBy(
      toArray(chains_data)
        .filter(c =>
          (!isPool || !c?.no_pool) &&
          (!inputSearch || c)
        )
        .map(c => {
          return {
            ...c,
            scores:
              ['short_name', 'name', 'id']
                .map(f =>
                  split(c[f], 'lower', ' ').join(' ').startsWith(inputSearch.toLowerCase()) ?
                    inputSearch.length > 1 ?
                      inputSearch.length / c[f].length :
                      inputSearch.length > 0 ? .1 : .5 :
                    -1
                ),
          }
        })
        .map(c => {
          const {
            scores,
          } = { ...c }

          return {
            ...c,
            max_score: _.max(scores),
          }
        })
        .filter(c =>
          c.max_score > 1 / 10
        ),
      [
        'group',
        'max_score',
      ],
      [
        'asc',
        'desc',
      ],
    )

  return (
    <div className="max-h-96 overflow-y-scroll disable-scrollbars">
      {chains_data_sorted
        .map((c, i) => {
          const {
            id,
            disabled,
            image,
            group,
          } = { ...c }

          const selected = id === value

          const header =
            group &&
            !equalsIgnoreCase(
              group,
              chains_data_sorted[i - 1]?.group,
            ) &&
            (
              <div className={`text-slate-400 dark:text-slate-500 text-xs mt-${i === 0 ? 0.5 : 3} mb-2 ml-2`}>
                {name(group)}
              </div>
            )

          const item = (
            <>
              <div className="flex items-center space-x-2">
                {
                  image &&
                  (
                    <Image
                      src={image}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )
                }
                <span className={`whitespace-nowrap text-base ${selected ? 'font-bold' : 'font-medium'}`}>
                  {c.name}
                </span>
              </div>
            </>
          )

          const className =
            `dropdown-item ${
              disabled ?
                'cursor-not-allowed' :
                selected ?
                  'bg-slate-100 dark:bg-slate-800 cursor-pointer' :
                  'hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'
            } rounded flex items-center justify-between space-x-2 my-1 p-2`

          return (
            <div key={i}>
              {header}
              {disabled ?
                <div
                  title="Disabled"
                  className={className}
                >
                  {item}
                </div> :
                <div
                  onClick={() => onSelect(id)}
                  className={className}
                >
                  {item}
                </div>
              }
            </div>
          )
        })
      }
    </div>
  )
}
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Image from '../../image'
import { name, equals_ignore_case } from '../../../lib/utils'

export default (
  {
    value,
    inputSearch,
    onSelect,
    source,
    destination,
    is_pool = false,
  },
) => {
  const {
    preferences,
    chains,
    wallet,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    address,
  } = { ...wallet_data }

  const chains_data_sorted =
    _.orderBy(
      (chains_data || [])
        .filter(c =>
          (
            !is_pool ||
            !c?.no_pool
          ) &&
          (
            !inputSearch ||
            c
          )
        )
        .map(c => {
          return {
            ...c,
            scores:
              [
                'short_name',
                'name',
                'id',
                // 'group',
              ]
              .map(f =>
                (c[f] || '')
                  .toLowerCase()
                  .startsWith(
                    inputSearch
                      .toLowerCase()
                  ) ?
                    inputSearch.length > 1 ?
                      (
                        inputSearch.length /
                        c[f].length
                      ) :
                      inputSearch.length > 0 ?
                        .1 :
                        .5 :
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
            max_score:
              _.max(
                scores,
              ),
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
      {
        chains_data_sorted
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
              !equals_ignore_case(
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
                        alt=""
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
                {/*
                  [
                    source,
                    destination,
                  ].includes(id) &&
                  (
                    <div className="flex items-center space-x-2 ml-auto">
                      {
                        _.uniq(
                          [
                            c.id === source ?
                              'o' :
                              'd',
                            id === destination ?
                              'd' :
                              'o',
                          ]
                        )
                        .map((o, i) => (
                          <div
                            key={i}
                            className="bg-blue-600 rounded uppercase text-white text-lg font-semibold px-2"
                          >
                            {o}
                          </div>
                        ))
                      }
                    </div>
                  )
                */}
              </>
            )

            const className = `dropdown-item ${disabled ? 'cursor-not-allowed' : selected ? 'bg-slate-100 dark:bg-slate-800 cursor-pointer' : 'hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'} rounded flex items-center justify-between space-x-2 my-1 p-2`

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
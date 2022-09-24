import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Image from '../../image'
import { number_format, equals_ignore_case } from '../../../lib/utils'

export default ({
  value,
  inputSearch,
  onSelect,
  chain,
  is_pool = false,
}) => {
  const {
    chains,
    assets,
    pool_assets,
    balances,
  } = useSelector(state =>
    (
      {
        chains: state.chains,
        assets: state.assets,
        pool_assets: state.pool_assets,
        balances: state.balances,
      }
    ),
    shallowEqual,
  )
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    pool_assets_data,
  } = { ...pool_assets }
  const {
    balances_data,
  } = { ...balances }

  const chain_data = chains_data?.find(c => c?.id === chain)
  const {
    chain_id,
  } = { ...chain_data }

  const _assets_data = is_pool ?
    pool_assets_data :
    assets_data

  const assets_data_sorted = _.orderBy(
    (_assets_data || [])
      .filter(a =>
        !inputSearch ||
        a
      )
      .map(a => {
        return {
          ...a,
          scores: [
            'symbol',
            'name',
            'id',
          ]
          .map(f => a[f]?.toLowerCase().includes(inputSearch.toLowerCase()) ?
            inputSearch.length > 1 ?
              (
                inputSearch.length /
                a[f].length
              ) :
              .5 :
            -1
          ),
        }
      })
      .map(a => {
        const {
          scores,
        } = { ...a }

        return {
          ...a,
          max_score: _.max(
            scores,
          ),
        }
      })
      .filter(a => a.max_score > 1 / 10),
    ['max_score'],
    ['desc'],
  )

  return (
    <div>
      {_assets_data?.filter(a => a?.preset).length > 0 && (
        <div className="flex flex-wrap items-center mb-2">
          {_assets_data.filter(a => a?.preset).map((a, i) => (
            <div
              key={i}
              onClick={() => onSelect(a.id)}
              className="hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer flex items-center hover:font-semibold space-x-1 mr-1.5 py-1 px-1.5"
            >
              {a.image && (
                <Image
                  src={a.image}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              )}
              <span className={`whitespace-nowrap ${a.id === value ? 'font-bold' : ''}`}>
                {
                  a.symbol ||
                  a.name
                }
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="max-h-96 overflow-y-scroll">
        {assets_data_sorted
          .map((a, i) => {
            const {
              id,
              disabled,
              name,
              contracts,
            } = { ...a }

            const selected = id === value

            const contract_data = contracts?.find(c => c?.chain_id === chain_id)
            const {
              contract_address,
            } = { ...contract_data }
            let {
              symbol,
              image,
            } = { ...contract_data }

            symbol = symbol ||
              a?.symbol ||
              a?.name
            image = image ||
              a?.image

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
                  {is_pool ?
                    name :
                    symbol
                  }
                </span>
              </div>
            )

            const balance = balances_data?.[chain_id]?.find(b =>
              equals_ignore_case(b?.contract_address, contract_address)
            )
            let {
              amount,
            } = { ...balance }

            amount = !isNaN(amount) ?
              amount = Number(amount) :
              null

            const balanceComponent = balances_data?.[chain_id] &&
              (
                <div className={`${chain_id && !amount ? 'text-slate-400 dark:text-slate-500' : ''} ${selected ? 'font-semibold' : 'font-normal'} ml-auto`}>
                  {typeof amount === 'number' ?
                    number_format(
                      amount,
                      amount > 10000 ?
                        '0,0' :
                        amount > 1000 ?
                          '0,0.00' :
                          '0,0.000000',
                      true,
                    ) :
                    'n/a'
                  }
                </div>
              )

            const className = `dropdown-item ${disabled ? 'cursor-not-allowed' : selected ? 'bg-slate-100 dark:bg-slate-800 cursor-pointer' : 'hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'} rounded-lg flex items-center justify-between space-x-2 p-2`

            return disabled ?
              <div
                key={i}
                title="Disabled"
                className={className}
              >
                {item}
                {balanceComponent}
              </div> :
              <div
                key={i}
                onClick={() => onSelect(id)}
                className={className}
              >
                {item}
                {balanceComponent}
              </div>
          })
        }
      </div>
    </div>
  )
}
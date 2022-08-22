import Link from 'next/link'
import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from 'react-icons/md'

import Datatable from '../datatable'
import Image from '../image'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, loader_color } from '../../lib/utils'

export default ({
  view,
  user_pools_data,
}) => {
  const { preferences, pools } = useSelector(state => ({ preferences: state.preferences, pools: state.pools }), shallowEqual)
  const { theme } = { ...preferences }
  const { pools_data } = { ...pools }

  const [uncollapseAssetIds, setUncollapseAssetIds] = useState([])

  const data = view === 'my_pools' ?
    user_pools_data :
    Object.entries(
      _.groupBy(
        pools_data || [],
        'asset_data.id',
      )
    ).map(([k, v]) => {

      return {
        id: k,
        asset_data: _.head(v)?.asset_data,
        pools: _.orderBy(
          v,
          ['liquidity'],
          ['desc'],
        ),
      }
    })

console.log(data)

  return (
    data ?
      <div className="grid my-4 sm:my-6">
        <Datatable
          columns={[
            {
              Header: 'Token',
              accessor: 'asset_data',
              disableSortBy: true,
              Cell: props => {
                const {
                  id,
                  pools,
                } = { ...props.row.original }
                const {
                  image,
                  symbol,
                } = { ...props.value }

                return (
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center space-x-2">
                      {image && (
                        <Image
                          src={image}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      <span className="text-base font-bold">
                        {symbol}
                      </span>
                    </div>
                    {uncollapseAssetIds.includes(id) &&
                      pools?.map((p, i) => {
                        const {
                          chain_data,
                          asset_data,
                          contract_data,
                        } = { ...p }
                        let {
                          name,
                        } = { ...p }
                        let {
                          symbol,
                        } = {  ...contract_data }

                        symbol = symbol || asset_data?.symbol
                        name = name || symbol

                        const chain = chain_data?.id
                        const asset = asset_data?.id

                        return (
                          <Link
                            key={i}
                            href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                          >
                            <a className="h-6 flex items-center font-bold">
                              {name}
                            </a>
                          </Link>
                        )
                      })
                    }
                  </div>
                )
              },
            },
            {
              Header: 'Chains',
              accessor: 'chain_data',
              disableSortBy: true,
              Cell: props => {
                const {
                  id,
                  pools,
                } = { ...props.row.original }

                const onClick = () => {
                  if (pools?.length > 0) {
                    setUncollapseAssetIds(
                      uncollapseAssetIds.includes(id) ?
                        uncollapseAssetIds.filter(_id => _id !== id) :
                        _.concat(
                          uncollapseAssetIds,
                          id,
                        )
                    )
                  }
                }

                return (
                  <div className="flex flex-col space-y-3">
                    <div
                      onClick={() => onClick()}
                      className={`w-fit ${pools?.length > 0 ? 'cursor-pointer' : ''} flex items-center`}
                    >
                      {pools?.length > 0 ?
                        <>
                          {pools.map((p, i) => {
                            const {
                              chain_data,
                            } = { ...p }
                            const {
                              name,
                              image,
                            } = { ...chain_data }

                            return (
                              <div
                                key={i}
                                title={name}
                                className="h-6 mr-1.5"
                              >
                                {image && (
                                  <Image
                                    src={image}
                                    alt=""
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                  />
                                )}
                              </div>
                            )
                          })}
                          <div className="mr-1.5">
                            <button
                              onClick={() => onClick()}
                              className="w-6 h-6 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full flex items-center justify-center p-1"
                            >
                              {uncollapseAssetIds.includes(id) ?
                                <MdKeyboardArrowUp size={18} /> :
                                <MdKeyboardArrowDown size={18} />
                              }
                            </button>
                          </div>
                        </> :
                        <span className="text-slate-400 dark:text-slate-500">
                          No chains supported
                        </span>
                      }
                    </div>
                    {uncollapseAssetIds.includes(id) &&
                      pools?.map((p, i) => {
                        const {
                          chain_data,
                          asset_data,
                        } = { ...p }
                        const {
                          name,
                          image,
                        } = { ...chain_data }

                        const chain = chain_data?.id
                        const asset = asset_data?.id

                        return (
                          <Link
                            key={i}
                            href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                          >
                            <a className="h-6 flex items-center space-x-2">
                              {image && (
                                <Image
                                  src={image}
                                  alt=""
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              )}
                              <span className="text-base font-bold">
                                {name}
                              </span>
                            </a>
                          </Link>
                        )
                      })
                    }
                  </div>
                )
              },
            },
            {
              Header: 'Liquidity',
              accessor: 'liquidity',
              sortType: (a, b) =>
                _.sumBy(
                  a.original.pools,
                  'liquidity',
                ) >
                _.sumBy(
                  b.original.pools,
                  'liquidity',
                ) ?
                  1 :
                  -1,
              Cell: props => {
                const {
                  id,
                  pools,
                } = { ...props.row.original }

                const value = _.sumBy(
                  pools,
                  'liquidity',
                )

                return (
                  <div className="flex flex-col space-y-3">
                    <div className="text-base font-bold text-right">
                      <span className="uppercase">
                        {currency_symbol}
                        {number_format(
                          value,
                          '0,0.00',
                        )}
                      </span>
                    </div>
                    {uncollapseAssetIds.includes(id) &&
                      pools?.map((p, i) => {
                        const {
                          chain_data,
                          asset_data,
                          liquidity,
                        } = { ...p }

                        const chain = chain_data?.id
                        const asset = asset_data?.id
                        const value = liquidity

                        return (
                          <Link
                            key={i}
                            href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                          >
                            <a className="h-6 text-base font-bold text-right">
                              <span className="uppercase">
                                {currency_symbol}
                                {number_format(
                                  value,
                                  '0,0.00',
                                )}
                              </span>
                            </a>
                          </Link>
                        )
                      })
                    }
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
            {
              Header: 'Volume (24H)',
              accessor: 'volume',
              sortType: (a, b) =>
                _.sumBy(
                  a.original.pools,
                  'volume',
                ) >
                _.sumBy(
                  b.original.pools,
                  'volume',
                ) ?
                  1 :
                  -1,
              Cell: props => {
                const {
                  id,
                  pools,
                } = { ...props.row.original }

                const value = _.sumBy(
                  pools,
                  'volume',
                )

                return (
                  <div className="flex flex-col space-y-3">
                    <div className="text-base font-bold text-right">
                      <span className="uppercase">
                        {currency_symbol}
                        {number_format(
                          value,
                          '0,0.00',
                        )}
                      </span>
                    </div>
                    {uncollapseAssetIds.includes(id) &&
                      pools?.map((p, i) => {
                        const {
                          chain_data,
                          asset_data,
                          volume,
                        } = { ...p }

                        const chain = chain_data?.id
                        const asset = asset_data?.id
                        const value = volume

                        return (
                          <Link
                            key={i}
                            href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                          >
                            <a className="h-6 text-base font-bold text-right">
                              <span className="uppercase">
                                {currency_symbol}
                                {number_format(
                                  value,
                                  '0,0.00',
                                )}
                              </span>
                            </a>
                          </Link>
                        )
                      })
                    }
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
            {
              Header: 'Fees (24H)',
              accessor: 'fees',
              sortType: (a, b) =>
                _.sumBy(
                  a.original.pools,
                  'fees',
                ) >
                _.sumBy(
                  b.original.pools,
                  'fees',
                ) ?
                  1 :
                  -1,
              Cell: props => {
                const {
                  id,
                  pools,
                } = { ...props.row.original }

                const value = _.sumBy(
                  pools,
                  'fees',
                )

                return (
                  <div className="flex flex-col space-y-3">
                    <div className="text-base font-bold text-right">
                      <span className="uppercase">
                        {currency_symbol}
                        {number_format(
                          value,
                          '0,0.00',
                        )}
                      </span>
                    </div>
                    {uncollapseAssetIds.includes(id) &&
                      pools?.map((p, i) => {
                        const {
                          chain_data,
                          asset_data,
                          fees,
                        } = { ...p }

                        const chain = chain_data?.id
                        const asset = asset_data?.id
                        const value = fees

                        return (
                          <Link
                            key={i}
                            href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                          >
                            <a className="h-6 text-base font-bold text-right">
                              <span className="uppercase">
                                {currency_symbol}
                                {number_format(
                                  value,
                                  '0,0.00',
                                )}
                              </span>
                            </a>
                          </Link>
                        )
                      })
                    }
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
            {
              Header: 'APY',
              accessor: 'apy.day',
              sortType: (a, b) =>
                _.meanBy(
                  a.original.pools,
                  'apy.day',
                ) >
                _.sumBy(
                  b.original.pools,
                  'apy.day',
                ) ?
                  1 :
                  -1,
              Cell: props => {
                const {
                  id,
                  pools,
                } = { ...props.row.original }

                const value = _.sumBy(
                  pools,
                  'apy.day',
                )

                return (
                  <div className="flex flex-col space-y-3">
                    <div className="text-base font-bold text-right">
                      <span className="uppercase">
                        {number_format(
                          value,
                          '0,0.00',
                        )}
                        %
                      </span>
                    </div>
                    {uncollapseAssetIds.includes(id) &&
                      pools?.map((p, i) => {
                        const {
                          chain_data,
                          asset_data,
                          apy,
                        } = { ...p }

                        const chain = chain_data?.id
                        const asset = asset_data?.id
                        const value = apy?.day

                        return (
                          <Link
                            key={i}
                            href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                          >
                            <a className="h-6 text-base font-bold text-right">
                              <span className="uppercase">
                                {number_format(
                                  value,
                                  '0,0.00',
                                )}
                                %
                              </span>
                            </a>
                          </Link>
                        )
                      })
                    }
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
          ].filter(c => !(
            view === 'my_pools' ?
              [
                'liquidity',
                'volume',
                'fees',
                'apy.day',
              ] :
              [
                'lpTokenBalance',
                'balances',
                'share',
              ]
          ).includes(c.accessor))}
          data={data}
          noPagination={data.length <= 10}
          defaultPageSize={50}
          className="no-border"
        />
      </div> :
      <div className="h-32 flex items-center justify-center my-4 sm:my-6">
        <TailSpin
          color={loader_color(theme)}
          width="32"
          height="32"
        />
      </div>
  )
}
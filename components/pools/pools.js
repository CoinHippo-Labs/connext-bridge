import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from 'react-icons/md'

import Datatable from '../datatable'
import Image from '../image'
import { ProgressBar } from '../progress-bars'
import DecimalsFormat from '../decimals-format'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, equals_ignore_case, loader_color } from '../../lib/utils'

const WRAPPED_PREFIX =
  process.env.NEXT_PUBLIC_WRAPPED_PREFIX ||
  'next'

export default (
  {
    view,
    user_pools_data,
  },
) => {
  const {
    preferences,
    chains,
    assets,
    pool_assets,
    pools,
    wallet,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        pool_assets: state.pool_assets,
        pools: state.pools,
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
    assets_data,
  } = { ...assets }
  const {
    pool_assets_data,
  } = { ...pool_assets }
  const {
    pools_data,
  } = { ...pools }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    chain_id,
    address,
  } = { ...wallet_data }

  const [uncollapseAssetIds, setUncollapseAssetIds] = useState(null)

  useEffect(
    () => {
      if (
        pools_data &&
        (
          !uncollapseAssetIds ||
          uncollapseAssetIds.length < 4
        )
      ) {
        const ids =
          pools_data
            .map(p => p?.asset_data?.id)
            .filter(id => id)

        setUncollapseAssetIds(ids)
      }
    },
    [pools_data],
  )

  const data =
    view === 'my_positions' ?
      user_pools_data ?
        user_pools_data
          .filter(p =>
            Number(p?.lpTokenBalance) > 0
          )
          .map(p => {
            const {
              chain_data,
              lpTokenBalance,
            } = { ...p }
            let {
              id,
              share,
            } = { ...p }

            id =
              id ||
              `${chain_data?.id}_${p?.asset_data?.id}`

            const pool_data = (pools_data || [])
              .find(_p =>
                _p?.id === id
              )
            const {
              adopted,
              local,
              supply,
              rate,
            } = { ...pool_data }

            share =
              !isNaN(supply) ?
                Number(lpTokenBalance) *
                100 /
                Number(supply) :
                share

            const asset_data = (assets_data || [])
              .find(a =>
                a?.id === pool_data?.asset_data?.id
              )
            const {
              price,
            } = { ...asset_data }

            const tvl =
              typeof price === 'number' ?
                (
                  supply ||
                  _.sum(
                    [
                      adopted,
                      local,
                    ]
                    .filter(t => t)
                    .map(t => {
                      const {
                        balance,
                        index,
                      } = { ...t }

                      return (
                        Number(
                          balance ||
                          '0'
                        ) /
                        (
                          index > 0 &&
                          rate > 0 ?
                            rate :
                            1
                        )
                      )
                    })
                  )
                ) *
                price :
                0

            return {
              ...p,
              share,
              tvl,
            }
          }) :
          null :
      pools_data ||
      pool_assets_data?.length === 0 ?
        _.orderBy(
          Object.entries(
            _.groupBy(
              pools_data ||
              [],
              'asset_data.id',
            )
          )
          .map(([k, v]) => {
            return {
              id: k,
              asset_data: _.head(v)?.asset_data,
              i:
                (pool_assets_data || [])
                  .findIndex(a =>
                    equals_ignore_case(
                      a?.id,
                      k,
                    )
                  ),
              pools:
                _.orderBy(
                  _.concat(
                    v,
                    (pool_assets_data || [])
                      .filter(a =>
                        equals_ignore_case(
                          a?.id,
                          k,
                        )
                      )
                      .flatMap(a =>
                        (a?.contracts || [])
                          .filter(c =>
                            v.findIndex(d =>
                              d?.chain_data?.chain_id === c?.chain_id
                            ) < 0
                          )
                      )
                      .map(d => {
                        const chain_data = (chains_data || [])
                          .find(c =>
                            c?.chain_id === d?.chain_id
                          )

                        const asset_data = (pool_assets_data || [])
                          .find(a =>
                            equals_ignore_case(
                              a?.id,
                              k,
                            )
                          )

                        if (
                          chain_data &&
                          asset_data
                        ) {
                          const {
                            chain_id,
                          } = { ...chain_data }

                          const contract_data = d

                          return {
                            id: `${chain_data.id}_${asset_data.id}`,
                            name:
                              `${
                                contract_data?.symbol ||
                                asset_data.symbol
                              }-Pool`,
                            chain_id,
                            chain_data,
                            asset_data,
                            contract_data,
                          }
                        }
                        else {
                          return null
                        }
                      })
                      .filter(d => d),
                  )
                  .map(d => {
                    const {
                      chain_data,
                      tvl,
                      apr,
                    } = { ...d }

                    return {
                      ...d,
                      i:
                        (chains_data || [])
                          .findIndex(c =>
                            equals_ignore_case(
                              c?.id,
                              chain_data?.id,
                            )
                          ),
                      _tvl:
                        !isNaN(tvl) ?
                          tvl :
                          -1,
                      _apr:
                        !isNaN(apr) ?
                          apr :
                          -1,
                    }
                  }),
                  [
                    'i',
                    '_tvl',
                    '_apr',
                  ],
                  [
                    'asc',
                    'desc',
                    'desc',
                  ],
                ),
            }
          }),
          [
            'i',
          ],
          [
            'asc',
          ],
        ) :
        null

  const chain_data =
    address &&
    (chains_data || [])
      .find(c =>
        c?.chain_id === chain_id
      )

  const {
    color,
  } = { ...chain_data }

  const boxShadow =
    `${
      color ||
      '#e53f3f'
    }${
      theme === 'light' ?
        '44' :
        '33'
    } 0px 32px 128px 64px`

  const no_positions =
    view === 'my_positions' &&
    data &&
    data.length < 1

  return (
    data ?
      <div className="grid my-4 sm:my-6">
        {
          no_positions ?
            <div className="whitespace-nowrap text-slate-800 dark:text-slate-200 ml-2">
              You currently don't have any positions.
            </div> :
            <>
              <div
                className="w-32 sm:w-64 mx-auto"
                style={
                  {
                    boxShadow,
                    WebkitBoxShadow: boxShadow,
                    MozBoxShadow: boxShadow,
                  }
                }
              />
              <Datatable
                columns={
                  [
                    {
                      Header: 'Token',
                      accessor: 'asset_data',
                      disableSortBy: true,
                      Cell: props => {
                        const {
                          id,
                          pools,
                          chain_data,
                          asset_data,
                          contract_data,
                        } = { ...props.row.original }
                        let {
                          name,
                        } = { ...props.row.original }
                        const {
                          image,
                          symbol,
                        } = { ...props.value }

                        const _symbol =
                          view === 'my_positions' ?
                            contract_data?.symbol ||
                            symbol :
                            symbol

                        name =
                          name ||
                          _symbol

                        const chain = chain_data?.id
                        const asset = asset_data?.id

                        return (
                          <div className="flex flex-col space-y-3">
                            {view === 'my_positions' ?
                              <Link
                                href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                              >
                              <a
                                className="h-6 flex items-center font-medium"
                              >
                                {name}
                              </a>
                              </Link> :
                              <>
                                <div className="h-6 flex items-center space-x-2">
                                  {
                                    image &&
                                    (
                                      <Image
                                        src={image}
                                        width={24}
                                        height={24}
                                        className="rounded-full"
                                      />
                                    )
                                  }
                                  <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                                    {_symbol}
                                  </span>
                                </div>
                                {
                                  uncollapseAssetIds?.includes(id) &&
                                  (pools || [])
                                    .map((p, i) => {
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

                                      symbol =
                                        symbol ||
                                        asset_data?.symbol

                                      name =
                                        name ||
                                        symbol

                                      const chain = chain_data?.id
                                      const asset = asset_data?.id

                                      return (
                                        <Link
                                          key={i}
                                          href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                                        >
                                        <a
                                          className="h-6 flex items-center font-medium ml-8"
                                        >
                                          {name}
                                        </a>
                                        </Link>
                                      )
                                    })
                                }
                              </>
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
                          chain_data,
                          asset_data,
                        } = { ...props.row.original }
                        const {
                          name,
                          image,
                        } = { ...props.value }

                        const chain = chain_data?.id
                        const asset = asset_data?.id

                        const onClick = () => {
                          if (pools?.length > 0) {
                            setUncollapseAssetIds(
                              uncollapseAssetIds?.includes(id) ?
                                uncollapseAssetIds
                                  .filter(_id =>
                                    _id !== id
                                  ) :
                                _.concat(
                                  uncollapseAssetIds ||
                                  [],
                                  id,
                                )
                            )
                          }
                        }

                        return (
                          <div className="flex flex-col space-y-3">
                            {view === 'my_positions' ?
                              <Link
                                href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                              >
                              <a
                                className="min-w-max h-6 flex items-center space-x-2"
                              >
                                {
                                  image &&
                                  (
                                    <Image
                                      src={image}
                                      width={24}
                                      height={24}
                                      className="rounded-full"
                                    />
                                  )
                                }
                                <span className="text-sm font-medium">
                                  {name}
                                </span>
                              </a>
                              </Link> :
                              <>
                                <div
                                  onClick={() => onClick()}
                                  className={`w-fit h-6 ${pools?.length > 0 ? 'cursor-pointer' : ''} flex items-center`}
                                >
                                  {pools?.length > 0 ?
                                    <>
                                      {
                                        _.slice(
                                          pools,
                                          0,
                                          3,
                                        )
                                        .map((p, i) => {
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
                                              className="w-5 h-6 flex items-center mr-1.5"
                                            >
                                              {
                                                image &&
                                                (
                                                  <Image
                                                    src={image}
                                                    width={20}
                                                    height={20}
                                                    className="rounded-full"
                                                  />
                                                )
                                              }
                                            </div>
                                          )
                                        })
                                      }
                                      {
                                        pools.length > 3 &&
                                        (
                                          <div className="h-6 flex items-center">
                                            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                                              (+{pools.length - 3})
                                            </span>
                                          </div>
                                        )
                                      }
                                      <div className="mr-1.5">
                                        <button
                                          onClick={() => onClick()}
                                          className="w-5 h-6 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full flex items-center justify-center"
                                        >
                                          {uncollapseAssetIds?.includes(id) ?
                                            <MdKeyboardArrowUp
                                              size={16}
                                            /> :
                                            <MdKeyboardArrowDown
                                              size={16}
                                            />
                                          }
                                        </button>
                                      </div>
                                    </> :
                                    <span className="text-slate-400 dark:text-slate-500">
                                      No chains supported
                                    </span>
                                  }
                                </div>
                                {
                                  uncollapseAssetIds?.includes(id) &&
                                  (pools || [])
                                    .map((p, i) => {
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
                                        <a
                                          className="h-6 flex items-center space-x-2"
                                        >
                                          {
                                            image &&
                                            (
                                              <Image
                                                src={image}
                                                width={24}
                                                height={24}
                                                className="rounded-full"
                                              />
                                            )
                                          }
                                          <span className="hidden sm:block text-sm font-medium">
                                            {name}
                                          </span>
                                        </a>
                                        </Link>
                                      )
                                    })
                                }
                              </>
                            }
                          </div>
                        )
                      },
                    },
                    {
                      Header: 'Assets',
                      accessor: 'assets',
                      sortType: (a, b) =>
                        a.original.tvl > b.original.tvl ?
                          1 :
                          -1,
                      Cell: props => {
                        const {
                          id,
                          asset_data,
                          pools,
                        } = { ...props.row.original }

                        const native_assets =
                          (pools || [])
                            .map(p => {
                              const {
                                adopted,
                                local,
                              } = { ...p }

                              const asset =
                                !adopted?.symbol?.startsWith(WRAPPED_PREFIX) ?
                                  adopted :
                                  local

                              return {
                                ...p,
                                asset,
                              }
                            })

                        const wrapped_assets =
                          (pools || [])
                            .map(p => {
                              const {
                                adopted,
                                local,
                              } = { ...p }

                              const asset =
                                adopted?.symbol?.startsWith(WRAPPED_PREFIX) ?
                                  adopted :
                                  local

                              return {
                                ...p,
                                asset,
                              }
                            })

                        const native_asset = _.head(native_assets)

                        const wrapped_asset = _.head(wrapped_assets)

                        const native_amount =
                          _.sum(
                            native_assets
                              .map(a =>
                                Number(
                                  a?.asset?.balance ||
                                  '0'
                                )
                              ),
                          )

                        const wrapped_amount =
                          _.sum(
                            wrapped_assets
                              .map(a =>
                                Number(
                                  a?.asset?.balance ||
                                  '0'
                                )
                              ),
                          )

                        const total_amount = native_amount + wrapped_amount

                        const {
                          color,
                        } = { ...asset_data }

                        return (
                          <div
                            className="flex flex-col items-end space-y-3"
                            style={
                              {
                                minWidth: '8rem',
                              }
                            }
                          >
                            {
                              total_amount > 0 ?
                                <div
                                  className="w-full h-6 flex flex-col items-end justify-center space-y-0 pt-2 pb-1"
                                >
                                  <ProgressBar
                                    width={native_amount * 100 / total_amount}
                                    className="w-full rounded-lg"
                                    backgroundClassName="rounded-lg"
                                    style={
                                      {
                                        backgroundColor: color,
                                      }
                                    }
                                    backgroundStyle={
                                      {
                                        backgroundColor: `${color}66`,
                                      }
                                    }
                                  />
                                  <div className="w-full flex items-center justify-between space-x-2">
                                    <div className="flex flex-col items-start space-y-0.5">
                                      <Tooltip
                                        placement="top"
                                        content={
                                          <div className="flex flex-col items-end space-y-1">
                                            <div className="flex items-center space-x-1">
                                              {
                                                native_asset?.asset_data?.image &&
                                                (
                                                  <Image
                                                    src={native_asset.asset_data.image}
                                                    width={14}
                                                    height={14}
                                                    className="rounded-full"
                                                  />
                                                )
                                              }
                                              <span className="leading-3 text-2xs font-medium">
                                                {
                                                  native_asset?.asset?.symbol ||
                                                  native_asset?.asset_data?.symbol
                                                }
                                              </span>
                                            </div>
                                            <DecimalsFormat
                                              value={
                                                number_format(
                                                  native_amount * 100 / total_amount,
                                                  native_amount * 100 / total_amount > 100 ?
                                                    '0,0' :
                                                    native_amount * 100 / total_amount > 1 ?
                                                      '0,0.00' :
                                                      '0,0.000000',
                                                  true,
                                                )
                                              }
                                              max_decimals={
                                                native_amount * 100 / total_amount > 100 ?
                                                  0 :
                                                  native_amount * 100 / total_amount > 1 ?
                                                    2 :
                                                    6
                                              }
                                              suffix="%"
                                              className="leading-3 text-2xs font-medium"
                                            />
                                          </div>
                                        }
                                        className="z-50 bg-dark text-white text-xs"
                                      >
                                        <div>
                                          <DecimalsFormat
                                            value={
                                              number_format(
                                                native_amount,
                                                native_amount > 100 ?
                                                  '0,0' :
                                                  native_amount > 1 ?
                                                    '0,0.00' :
                                                    '0,0.000000',
                                                true,
                                              )
                                            }
                                            max_decimals={
                                              native_amount > 100 ?
                                                0 :
                                                native_amount > 1 ?
                                                  2 :
                                                  6
                                            }
                                            className="leading-3 text-slate-600 dark:text-slate-400 text-2xs font-medium"
                                          />
                                        </div>
                                      </Tooltip>
                                    </div>
                                    <div className="flex flex-col items-end space-y-0.5">
                                      <Tooltip
                                        placement="top"
                                        content={
                                          <div className="flex flex-col items-end space-y-1">
                                            <div className="flex items-center space-x-1">
                                              {
                                                (
                                                  wrapped_asset?.contract_data?.next_asset?.image ||
                                                  wrapped_asset?.asset_data?.image
                                                ) &&
                                                (
                                                  <Image
                                                    src={
                                                      wrapped_asset?.contract_data?.next_asset?.image ||
                                                      wrapped_asset?.asset_data?.image
                                                    }
                                                    width={14}
                                                    height={14}
                                                    className="rounded-full"
                                                  />
                                                )
                                              }
                                              <span className="leading-3 text-2xs font-medium">
                                                {
                                                  wrapped_asset?.asset?.symbol ||
                                                  wrapped_asset?.contract_data?.next_asset?.symbol
                                                }
                                              </span>
                                            </div>
                                            <DecimalsFormat
                                              value={
                                                number_format(
                                                  100 - (native_amount * 100 / total_amount),
                                                  100 - (native_amount * 100 / total_amount) > 100 ?
                                                    '0,0' :
                                                    100 - (native_amount * 100 / total_amount) > 1 ?
                                                      '0,0.00' :
                                                      '0,0.000000',
                                                  true,
                                                )
                                              }
                                              max_decimals={
                                                100 - (native_amount * 100 / total_amount) > 100 ?
                                                  0 :
                                                  100 - (native_amount * 100 / total_amount) > 1 ?
                                                    2 :
                                                    6
                                              }
                                              suffix="%"
                                              className="leading-3 text-2xs font-medium"
                                            />
                                          </div>
                                        }
                                        className="z-50 bg-dark text-white text-xs"
                                      >
                                        <div>
                                          <DecimalsFormat
                                            value={
                                              number_format(
                                                wrapped_amount,
                                                wrapped_amount > 100 ?
                                                  '0,0' :
                                                  wrapped_amount > 1 ?
                                                    '0,0.00' :
                                                    '0,0.000000',
                                                true,
                                              )
                                            }
                                            max_decimals={
                                              wrapped_amount > 100 ?
                                                0 :
                                                wrapped_amount > 1 ?
                                                  2 :
                                                  6
                                            }
                                            className="leading-3 text-slate-600 dark:text-slate-400 text-2xs font-medium"
                                          />
                                        </div>
                                      </Tooltip>
                                    </div>
                                  </div>
                                </div> :
                                <div className="h-6 flex items-center justify-end">
                                  <span className="text-slate-400 dark:text-slate-500">
                                    No liquidity
                                  </span>
                                </div>
                            }
                            {
                              uncollapseAssetIds?.includes(id) &&
                              (pools || [])
                                .map((p, i) => {
                                  const {
                                    chain_data,
                                    asset_data,
                                    contract_data,
                                    adopted,
                                    local,
                                    lpTokenAddress,
                                    error,
                                  } = { ...p }

                                  const chain = chain_data?.id
                                  const asset = asset_data?.id

                                  const native_asset =
                                    !adopted?.symbol?.startsWith(WRAPPED_PREFIX) ?
                                      adopted :
                                      local

                                  const wrapped_asset =
                                    adopted?.symbol?.startsWith(WRAPPED_PREFIX) ?
                                      adopted :
                                      local

                                  const native_amount =
                                    Number(
                                      native_asset?.balance ||
                                      '0'
                                    )

                                  const wrapped_amount =
                                    Number(
                                      wrapped_asset?.balance ||
                                      '0'
                                    )

                                  const total_amount = native_amount + wrapped_amount

                                  const {
                                    color,
                                  } = { ...asset_data }

                                  return (
                                    <Link
                                      key={i}
                                      href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                                    >
                                    <a
                                      className="w-full h-6 flex items-center justify-end text-sm font-medium text-right"
                                    >
                                      {
                                        !lpTokenAddress &&
                                        !error ?
                                          <div className="flex items-center justify-end">
                                            <TailSpin
                                              color={loader_color(theme)}
                                              width="18"
                                              height="18"
                                            />
                                          </div> :
                                          total_amount > 0 ?
                                            <div
                                              className="w-full h-6 flex flex-col items-end justify-center space-y-0 pt-2 pb-1"
                                            >
                                              <ProgressBar
                                                width={native_amount * 100 / total_amount}
                                                className="w-full rounded-lg"
                                                backgroundClassName="rounded-lg"
                                                style={
                                                  {
                                                    backgroundColor: color,
                                                  }
                                                }
                                                backgroundStyle={
                                                  {
                                                    backgroundColor: `${color}66`,
                                                  }
                                                }
                                              />
                                              <div className="w-full flex items-center justify-between space-x-2">
                                                <div className="flex flex-col items-start space-y-0.5">
                                                  <Tooltip
                                                    placement="top"
                                                    content={
                                                      <div className="flex flex-col items-end space-y-1">
                                                        <div className="flex items-center space-x-1">
                                                          {
                                                            asset_data?.image &&
                                                            (
                                                              <Image
                                                                src={asset_data.image}
                                                                width={14}
                                                                height={14}
                                                                className="rounded-full"
                                                              />
                                                            )
                                                          }
                                                          <span className="leading-3 text-2xs font-medium">
                                                            {
                                                              native_asset?.symbol ||
                                                              asset_data?.symbol
                                                            }
                                                          </span>
                                                        </div>
                                                        <DecimalsFormat
                                                          value={
                                                            number_format(
                                                              native_amount * 100 / total_amount,
                                                              native_amount * 100 / total_amount > 100 ?
                                                                '0,0' :
                                                                native_amount * 100 / total_amount > 1 ?
                                                                  '0,0.00' :
                                                                  '0,0.000000',
                                                              true,
                                                            )
                                                          }
                                                          max_decimals={
                                                            native_amount * 100 / total_amount > 100 ?
                                                              0 :
                                                              native_amount * 100 / total_amount > 1 ?
                                                                2 :
                                                                6
                                                          }
                                                          suffix="%"
                                                          className="leading-3 text-2xs font-medium"
                                                        />
                                                      </div>
                                                    }
                                                    className="z-50 bg-dark text-white text-xs"
                                                  >
                                                    <div>
                                                      <DecimalsFormat
                                                        value={
                                                          number_format(
                                                            native_amount,
                                                            native_amount > 100 ?
                                                              '0,0' :
                                                              native_amount > 1 ?
                                                                '0,0.00' :
                                                                '0,0.000000',
                                                            true,
                                                          )
                                                        }
                                                        max_decimals={
                                                          native_amount > 100 ?
                                                            0 :
                                                            native_amount > 1 ?
                                                              2 :
                                                              6
                                                        }
                                                        className="leading-3 text-slate-600 dark:text-slate-400 text-2xs font-medium"
                                                      />
                                                    </div>
                                                  </Tooltip>
                                                </div>
                                                <div className="flex flex-col items-end space-y-0.5">
                                                  <Tooltip
                                                    placement="top"
                                                    content={
                                                      <div className="flex flex-col items-end space-y-1">
                                                        <div className="flex items-center space-x-1">
                                                          {
                                                            (
                                                              contract_data?.next_asset?.image ||
                                                              asset_data?.image
                                                            ) &&
                                                            (
                                                              <Image
                                                                src={
                                                                  contract_data?.next_asset?.image ||
                                                                  asset_data?.image
                                                                }
                                                                width={14}
                                                                height={14}
                                                                className="rounded-full"
                                                              />
                                                            )
                                                          }
                                                          <span className="leading-3 text-2xs font-medium">
                                                            {
                                                              wrapped_asset?.symbol ||
                                                              contract_data?.next_asset?.symbol
                                                            }
                                                          </span>
                                                        </div>
                                                        <DecimalsFormat
                                                          value={
                                                            number_format(
                                                              100 - (native_amount * 100 / total_amount),
                                                              100 - (native_amount * 100 / total_amount) > 100 ?
                                                                '0,0' :
                                                                100 - (native_amount * 100 / total_amount) > 1 ?
                                                                  '0,0.00' :
                                                                  '0,0.000000',
                                                              true,
                                                            )
                                                          }
                                                          max_decimals={
                                                            100 - (native_amount * 100 / total_amount) > 100 ?
                                                              0 :
                                                              100 - (native_amount * 100 / total_amount) > 1 ?
                                                                2 :
                                                                6
                                                          }
                                                          suffix="%"
                                                          className="leading-3 text-2xs font-medium"
                                                        />
                                                      </div>
                                                    }
                                                    className="z-50 bg-dark text-white text-xs"
                                                  >
                                                    <div>
                                                      <DecimalsFormat
                                                        value={
                                                          number_format(
                                                            wrapped_amount,
                                                            wrapped_amount > 100 ?
                                                              '0,0' :
                                                              wrapped_amount > 1 ?
                                                                '0,0.00' :
                                                                '0,0.000000',
                                                            true,
                                                          )
                                                        }
                                                        max_decimals={
                                                          wrapped_amount > 100 ?
                                                            0 :
                                                            wrapped_amount > 1 ?
                                                              2 :
                                                              6
                                                        }
                                                        className="leading-3 text-slate-600 dark:text-slate-400 text-2xs font-medium"
                                                      />
                                                    </div>
                                                  </Tooltip>
                                                </div>
                                              </div>
                                            </div> :
                                            <div className="h-6 flex items-center justify-end">
                                              <span className="text-slate-400 dark:text-slate-500">
                                                No liquidity
                                              </span>
                                            </div>
                                      }
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
                      Header: 'Liquidity',
                      accessor: 'tvl',
                      sortType: (a, b) =>
                        _.sumBy(
                          a.original.pools,
                          'tvl',
                        ) >
                        _.sumBy(
                          b.original.pools,
                          'tvl',
                        ) ?
                          1 :
                          -1,
                      Cell: props => {
                        const {
                          id,
                          pools,
                        } = { ...props.row.original }

                        const value =
                          _.sumBy(
                            pools,
                            'tvl',
                          )

                        return (
                          <div className="flex flex-col space-y-3">
                            <div className="h-6 flex items-center justify-end text-right">
                              <DecimalsFormat
                                value={
                                  number_format(
                                    value,
                                    value > 100 ?
                                      '0,0' :
                                      value > 1 ?
                                        '0,0.00' :
                                        '0,0.000000',
                                    true,
                                  )
                                }
                                max_decimals={
                                  value > 100 ?
                                    0 :
                                    value > 1 ?
                                      2 :
                                      6
                                }
                                prefix={currency_symbol}
                                className="uppercase text-slate-600 dark:text-slate-400 text-sm font-medium"
                              />
                            </div>
                            {
                              uncollapseAssetIds?.includes(id) &&
                              (pools || [])
                                .map((p, i) => {
                                  const {
                                    chain_data,
                                    asset_data,
                                    tvl,
                                    lpTokenAddress,
                                    error,
                                  } = { ...p }

                                  const chain = chain_data?.id
                                  const asset = asset_data?.id
                                  const value = tvl

                                  return (
                                    <Link
                                      key={i}
                                      href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                                    >
                                    <a
                                      className="h-6 flex items-center justify-end text-sm font-medium text-right"
                                    >
                                      {
                                        !lpTokenAddress &&
                                        !error ?
                                          <div className="flex items-center justify-end">
                                            <TailSpin
                                              color={loader_color(theme)}
                                              width="18"
                                              height="18"
                                            />
                                          </div> :
                                          <DecimalsFormat
                                            value={
                                              number_format(
                                                value,
                                                value > 100 ?
                                                  '0,0' :
                                                  value > 1 ?
                                                    '0,0.00' :
                                                    '0,0.000000',
                                                true,
                                              )
                                            }
                                            max_decimals={
                                              value > 100 ?
                                                0 :
                                                value > 1 ?
                                                  2 :
                                                  6
                                            }
                                            prefix={currency_symbol}
                                            className="uppercase"
                                          />
                                      }
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
                      Header: 'Volume (7d)',
                      accessor: 'volume_value',
                      sortType: (a, b) =>
                        _.sumBy(
                          a.original.pools,
                          'volume_value',
                        ) >
                        _.sumBy(
                          b.original.pools,
                          'volume_value',
                        ) ?
                          1 :
                          -1,
                      Cell: props => {
                        const {
                          id,
                          pools,
                        } = { ...props.row.original }

                        const value =
                          _.sumBy(
                            pools,
                            'volume_value',
                          )

                        return (
                          <div className="flex flex-col space-y-3">
                            <div className="h-6 flex items-center justify-end text-right">
                              {!isNaN(value) ?
                                <DecimalsFormat
                                  value={
                                    number_format(
                                      value,
                                      value > 100 ?
                                        '0,0' :
                                        value > 1 ?
                                          '0,0.00' :
                                          '0,0.000000',
                                      true,
                                    )
                                  }
                                  max_decimals={
                                    value > 100 ?
                                      0 :
                                      value > 1 ?
                                        2 :
                                        6
                                  }
                                  prefix={currency_symbol}
                                  className="uppercase text-slate-600 dark:text-slate-400 text-sm font-medium"
                                /> :
                                'TBD'
                              }
                            </div>
                            {
                              uncollapseAssetIds?.includes(id) &&
                              (pools || [])
                                .map((p, i) => {
                                  const {
                                    chain_data,
                                    asset_data,
                                    volume_value,
                                  } = { ...p }

                                  const chain = chain_data?.id
                                  const asset = asset_data?.id
                                  const value = volume_value

                                  return (
                                    <Link
                                      key={i}
                                      href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                                    >
                                    <a
                                      className="h-6 flex items-center justify-end text-sm font-medium text-right"
                                    >
                                      {!isNaN(value) ?
                                        <DecimalsFormat
                                          value={
                                            number_format(
                                              value,
                                              value > 100 ?
                                                '0,0' :
                                                value > 1 ?
                                                  '0,0.00' :
                                                  '0,0.000000',
                                              true,
                                            )
                                          }
                                          max_decimals={
                                            value > 100 ?
                                              0 :
                                              value > 1 ?
                                                2 :
                                                6
                                          }
                                          prefix={currency_symbol}
                                          className="uppercase"
                                        /> :
                                        'TBD'
                                      }
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
                      Header: 'Fees (7d)',
                      accessor: 'fees_value',
                      sortType: (a, b) =>
                        _.sumBy(
                          a.original.pools,
                          'fees_value',
                        ) >
                        _.sumBy(
                          b.original.pools,
                          'fees_value',
                        ) ?
                          1 :
                          -1,
                      Cell: props => {
                        const {
                          id,
                          pools,
                        } = { ...props.row.original }

                        const value =
                          _.sumBy(
                            pools,
                            'fees_value',
                          )

                        return (
                          <div className="flex flex-col space-y-3">
                            <div className="h-6 flex items-center justify-end text-right">
                              {!isNaN(value) ?
                                <DecimalsFormat
                                  value={
                                    number_format(
                                      value,
                                      value > 100 ?
                                        '0,0' :
                                        value > 1 ?
                                          '0,0.00' :
                                          '0,0.000000',
                                      true,
                                    )
                                  }
                                  max_decimals={
                                    value > 100 ?
                                      0 :
                                      value > 1 ?
                                        2 :
                                        6
                                  }
                                  prefix={currency_symbol}
                                  className="uppercase text-slate-600 dark:text-slate-400 text-sm font-medium"
                                /> :
                                'TBD'
                              }
                            </div>
                            {
                              uncollapseAssetIds?.includes(id) &&
                              (pools || [])
                                .map((p, i) => {
                                  const {
                                    chain_data,
                                    asset_data,
                                    fees_value,
                                  } = { ...p }

                                  const chain = chain_data?.id
                                  const asset = asset_data?.id
                                  const value = fees_value

                                  return (
                                    <Link
                                      key={i}
                                      href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                                    >
                                    <a
                                      className="h-6 flex items-center justify-end text-sm font-medium text-right"
                                    >
                                      {!isNaN(value) ?
                                        <DecimalsFormat
                                          value={
                                            number_format(
                                              value,
                                              value > 100 ?
                                                '0,0' :
                                                value > 1 ?
                                                  '0,0.00' :
                                                  '0,0.000000',
                                              true,
                                            )
                                          }
                                          max_decimals={
                                            value > 100 ?
                                              0 :
                                              value > 1 ?
                                                2 :
                                                6
                                          }
                                          prefix={currency_symbol}
                                          className="uppercase"
                                        /> :
                                        'TBD'
                                      }
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
                      Header:
                        (
                          <Tooltip
                            placement="top"
                            content="Returns from 0.04% user swap fees"
                            className="z-50 bg-dark text-white text-xs"
                          >
                            <div>
                              APR
                            </div>
                          </Tooltip>
                        ),
                      accessor: 'apr',
                      sortType: (a, b) =>
                        _.meanBy(
                          a.original.pools,
                          'apr',
                        ) >
                        _.sumBy(
                          b.original.pools,
                          'apr',
                        ) ?
                          1 :
                          -1,
                      Cell: props => {
                        const {
                          id,
                          pools,
                        } = { ...props.row.original }

                        const value =
                          _.sumBy(
                            pools
                              .map(p => {
                                const {
                                  apr,
                                  tvl,
                                } = { ...p }

                                return {
                                  ...p,
                                  weighted_apr:
                                    (
                                      (
                                        apr ||
                                        0
                                      ) *
                                      (
                                        tvl ||
                                        0
                                      )
                                    ),
                                }
                              }),
                            'weighted_apr',
                          ) /
                          _.sumBy(
                            pools,
                            'tvl',
                          )

                        return (
                          <div className="flex flex-col space-y-3">
                            <div className="h-6 flex items-center justify-end text-slate-600 dark:text-slate-400 text-sm font-medium text-right">
                              {/*!isNaN(value) ?
                                <DecimalsFormat
                                  value={
                                    number_format(
                                      value * 100,
                                      value * 100 > 1 ?
                                        '0,0.00' :
                                        '0,0.000',
                                      true,
                                    )
                                  }
                                  max_decimals={
                                    value * 100 > 100 ?
                                      0 :
                                      value * 100 > 1 ?
                                        2 :
                                        6
                                  }
                                  suffix="%"
                                  className="uppercase"
                                /> :
                                'TBD'
                              */}
                            </div>
                            {
                              uncollapseAssetIds?.includes(id) &&
                              (pools || [])
                                .map((p, i) => {
                                  const {
                                    chain_data,
                                    asset_data,
                                    apr,
                                  } = { ...p }

                                  const chain = chain_data?.id
                                  const asset = asset_data?.id
                                  const value = apr

                                  return (
                                    <Link
                                      key={i}
                                      href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                                    >
                                    <a
                                      className="h-6 flex items-center justify-end text-sm font-medium text-right"
                                    >
                                      {!isNaN(value) ?
                                        <DecimalsFormat
                                          value={
                                            number_format(
                                              value * 100,
                                              value * 100 > 1 ?
                                                '0,0.00' :
                                                '0,0.000',
                                              true,
                                            )
                                          }
                                          max_decimals={
                                            value * 100 > 100 ?
                                              0 :
                                              value * 100 > 1 ?
                                                2 :
                                                6
                                          }
                                          suffix="%"
                                          className="uppercase"
                                        /> :
                                        'TBD'
                                      }
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
                      Header: 'Your Pool Tokens',
                      accessor: 'lpTokenBalance',
                      sortType: (a, b) =>
                        Number(a.original.lpTokenBalance) *
                        a.original.price >
                        Number(b.original.lpTokenBalance) *
                        b.original.price ?
                          1 :
                          -1,
                      Cell: props => {
                        const {
                          value,
                        } = { ...props }
                        const {
                          chain_data,
                          asset_data,
                          symbol,
                          price,
                        } = { ...props.row.original }

                        const chain = chain_data?.id
                        const asset = asset_data?.id

                        return (
                          <Link
                            href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                          >
                          <a
                            className="h-6 flex flex-col justify-center space-y-1"
                          >
                            <div className="flex items-center text-sm font-medium text-right space-x-1">
                              <DecimalsFormat
                                value={
                                  number_format(
                                    value,
                                    value > 100 ?
                                      '0,0' :
                                      value > 1 ?
                                        '0,0.00' :
                                        '0,0.000000',
                                    true,
                                  )
                                }
                                max_decimals={
                                  value > 100 ?
                                    0 :
                                    value > 1 ?
                                      2 :
                                      6
                                }
                                className="uppercase"
                              />
                              {
                                symbol &&
                                (
                                  <span>
                                    {symbol}
                                  </span>
                                )
                              }
                            </div>
                            {
                              price > 0 &&
                              (
                                <div className="text-slate-800 dark:text-slate-200 text-sm text-right">
                                  <DecimalsFormat
                                    value={
                                      number_format(
                                        value * price,
                                        value * price > 100 ?
                                          '0,0' :
                                          value * price > 1 ?
                                            '0,0.00' :
                                            '0,0.000000',
                                        true,
                                      )
                                    }
                                    max_decimals={
                                      value * price > 100 ?
                                        0 :
                                        value * price > 1 ?
                                          2 :
                                          6
                                    }
                                    prefix={currency_symbol}
                                    className="uppercase"
                                  />
                                </div>
                              )
                            }
                          </a>
                          </Link>
                        )
                      },
                      headerClassName: 'whitespace-nowrap',
                    },
                    {
                      Header: 'Pooled Tokens',
                      accessor: 'balances',
                      sortType: (a, b) =>
                        a.original.tvl > b.original.tvl ?
                          1 :
                          -1,
                      Cell: props => {
                        const {
                          chain_data,
                          asset_data,
                          adopted,
                          local,
                        } = { ...props.row.original }

                        const chain = chain_data?.id
                        const asset = asset_data?.id

                        return (
                          <Link
                            href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                          >
                          <a
                            className="h-6 flex items-center justify-end space-x-1.5"
                          >
                            <div className="flex items-center text-sm font-medium space-x-1">
                              <DecimalsFormat
                                value={
                                  number_format(
                                    adopted?.balance,
                                    adopted?.balance > 100 ?
                                      '0.0' :
                                      adopted?.balance > 1 ?
                                        '0.0.00' :
                                        '0,0.000000',
                                    true,
                                  )
                                }
                                max_decimals={
                                  adopted?.balance > 100 ?
                                    0 :
                                    adopted?.balance > 1 ?
                                      2 :
                                      6
                                }
                                className="uppercase"
                              />
                              {
                                adopted?.symbol &&
                                (
                                  <span>
                                    {adopted.symbol}
                                  </span>
                                )
                              }
                            </div>
                            <span className="text-sm font-medium">
                              /
                            </span>
                            <div className="flex items-center text-sm font-medium space-x-1">
                              <DecimalsFormat
                                value={
                                  number_format(
                                    local?.balance,
                                    local?.balance > 100 ?
                                      '0.0' :
                                      local?.balance > 1 ?
                                        '0.0.00' :
                                        '0,0.000000',
                                    true,
                                  )
                                }
                                max_decimals={
                                  local?.balance > 100 ?
                                    0 :
                                    local?.balance > 1 ?
                                      2 :
                                      6
                                }
                                className="uppercase"
                              />
                              {
                                local?.symbol &&
                                (
                                  <span>
                                    {local.symbol}
                                  </span>
                                )
                              }
                            </div>
                          </a>
                          </Link>
                        )
                      },
                      headerClassName: 'whitespace-nowrap justify-end text-right',
                    },
                    {
                      Header: 'Pool Share',
                      accessor: 'share',
                      sortType: (a, b) =>
                        a.original.share > b.original.share ?
                          1 :
                          -1,
                      Cell: props => {
                        const {
                          value,
                        } = { ...props }
                        const {
                          chain_data,
                          asset_data,
                        } = { ...props.row.original }

                        const chain = chain_data?.id
                        const asset = asset_data?.id

                        return (
                          <Link
                            href={`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`}
                          >
                          <a
                            className="h-6 flex items-center justify-end text-right"
                          >
                            <DecimalsFormat
                              value={
                                typeof value === 'number' ?
                                  number_format(
                                    value,
                                    value > 1 ?
                                      '0,0.00' :
                                      '0,0.000000',
                                    true,
                                  ) :
                                  '-'
                              }
                              max_decimals={
                                value > 100 ?
                                  0 :
                                  value > 1 ?
                                    2 :
                                    6
                              }
                              suffix="%"
                              className="text-sm font-medium"
                            />
                          </a>
                          </Link>
                        )
                      },
                      headerClassName: 'whitespace-nowrap justify-end text-right',
                    },
                  ]
                  .filter(c =>
                    !(
                      view === 'my_positions' ?
                        [
                          'assets',
                          'tvl',
                          'volume_value',
                          'fees_value',
                          'apr',
                        ] :
                        [
                          'lpTokenBalance',
                          'balances',
                          'share',
                        ]
                    ).includes(c.accessor)
                  )
                }
                data={data}
                noPagination={data.length <= 10}
                defaultPageSize={50}
                className="no-border"
              />
            </>
        }
      </div> :
      <div className="my-4 sm:my-6 ml-2">
        <TailSpin
          color={loader_color(theme)}
          width="32"
          height="32"
        />
      </div>
  )
}
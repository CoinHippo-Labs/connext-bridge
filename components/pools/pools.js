import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { Tooltip } from '@material-tailwind/react'
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from 'react-icons/md'
import { FiExternalLink } from 'react-icons/fi'

import Spinner from '../spinner'
import Datatable from '../datatable'
import NumberDisplay from '../number'
import Image from '../image'
import { ProgressBar } from '../progress-bars'
import { WRAPPED_PREFIX } from '../../lib/config'
import { getChainData, getAssetData, getPoolData } from '../../lib/object'
import { isNumber } from '../../lib/number'
import { toArray, equalsIgnoreCase } from '../../lib/utils'

export default ({ view, userPools }) => {
  const { preferences, chains, assets, pool_assets, pools, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, pool_assets: state.pool_assets, pools: state.pools, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { pool_assets_data } = { ...pool_assets }
  const { pools_data } = { ...pools }
  const { wallet_data } = { ...wallet }
  const { chain_id, address } = { ...wallet_data }

  const data = view === 'my_positions' ?
    userPools && _.orderBy(
      userPools.map(d => {
        const { id, chain_data, asset_data, lpTokenBalance } = { ...d }
        let { share } = { ...d }
        const { adopted, local, supply } = { ...getPoolData(id, pools_data) }
        share = isNumber(supply) ? lpTokenBalance * 100 / supply : share
        let { price } = { ...getAssetData(asset_data?.id, assets_data) }
        price = price || 0
        const tvl = (supply || _.sum(toArray(_.concat(adopted, local)).map(a => Number(a.balance)))) * price
        const value = lpTokenBalance * price
        const chain = chain_data?.id
        const asset = asset_data?.id
        return {
          ...d,
          share,
          price,
          tvl,
          value,
          chain,
          asset,
          url: `/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`,
        }
      }),
      ['value', 'tvl'], ['desc', 'desc'],
    ) :
    (pools_data || toArray(pool_assets_data).length === 0) && _.orderBy(
      Object.entries(_.groupBy(toArray(pools_data), 'asset_data.id')).map(([k, v]) => {
        const { asset_data } = { ..._.head(v) }
        return {
          id: k,
          asset_data,
          i: toArray(pool_assets_data).findIndex(d => equalsIgnoreCase(d.id, k)),
          pools: _.orderBy(
            toArray(
              _.concat(
                toArray(v).map(d => {
                  const chain_data = getChainData(d.chain_id, chains_data)
                  const { id, chain_id } = { ...chain_data }
                  const chain = chain_data?.id
                  const asset = asset_data?.id
                  return {
                    ...d,
                    id: [chain, asset].join('_'),
                    chain_id,
                    chain_data,
                    asset_data,
                    chain,
                    asset,
                    url: `/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`,
                  }
                }),
                toArray(pool_assets_data).filter(d => equalsIgnoreCase(d.id, k)).flatMap(d => toArray(d.contracts).filter(c => v.findIndex(d => d.chain_data?.chain_id === c.chain_id) < 0)).map(d => {
                  const chain_data = getChainData(d.chain_id, chains_data)
                  const asset_data = getAssetData(k, pool_assets_data)
                  if (chain_data && asset_data) {
                    const { id, chain_id } = { ...chain_data }
                    const { symbol } = d
                    const chain = chain_data?.id
                    const asset = asset_data?.id
                    return {
                      id: [chain, asset].join('_'),
                      name: `${symbol || asset_data.symbol} Pool`,
                      chain_id,
                      chain_data,
                      asset_data,
                      contract_data: d,
                      chain,
                      asset,
                      url: `/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}`,
                    }
                  }
                  else {
                    return null
                  }
                }),
              )
            )
            .map(d => {
              const { chain_data, tvl, apy } = { ...d }
              const { id } = { ...chain_data }
              return {
                ...d,
                i: toArray(chains_data).findIndex(c => equalsIgnoreCase(c.id, id)),
                _tvl: isNumber(tvl) ? tvl : -1,
                _apy: isNumber(apy) ? apy : -1,
              }
            }),
            ['i', '_tvl', '_apy'], ['asc', 'desc', 'desc'],
          ),
        }
      }),
      ['i'], ['asc'],
    )
    .flatMap(d => d.pools.map(p => { return { ...d, pool: p, url: d.url || p.url } }))

  const { color } = { ...(address && getChainData(chain_id, chains_data)) }
  const boxShadow = `${color || '#e53f3f'}${theme === 'light' ? '44' : '33'} 0px 32px 128px 64px`
  const no_positions = view === 'my_positions' && data && data.length < 1

  return (
    data ?
      no_positions ?
        <div className="whitespace-nowrap text-slate-800 dark:text-slate-200 3xl:text-2xl ml-2">
          You currently don't have any positions.
        </div> :
        <div>
          <div className="w-32 sm:w-64 3xl:w-96" style={{ boxShadow, WebkitBoxShadow: boxShadow, MozBoxShadow: boxShadow }} />
          <Datatable
            columns={[
              {
                Header: 'Token',
                accessor: 'asset_data',
                disableSortBy: true,
                Cell: props => {
                  const { row } = { ...props }
                  const { pool, url } = { ...row.original }
                  let { name, chain_data, asset_data, contract_data } = { ...row.original }

                  chain_data = pool?.chain_data || chain_data
                  asset_data = pool?.asset_data || asset_data
                  contract_data = pool?.contract_data || contract_data
                  const { disabled } = { ...chain_data }
                  const { symbol, image } = { ...asset_data }
                  const { next_asset } = { ...contract_data }
                  name = name || (view === 'my_positions' ? contract_data?.symbol || symbol : symbol)

                  const component = (
                    <div className="flex items-center p-3">
                      <div className="h-6 3xl:h-12 flex items-center">
                        <div className="flex items-center space-x-0.5 mr-2">
                          {image && (
                            <Image
                              src={image}
                              width={24}
                              height={24}
                              className="3xl:w-8 3xl:h-8 rounded-full"
                            />
                          )}
                          {next_asset?.image && (
                            <Image
                              src={next_asset.image}
                              width={24}
                              height={24}
                              className="3xl:w-8 3xl:h-8 rounded-full"
                            />
                          )}
                        </div>
                        <div className="h-full flex items-center 3xl:text-2xl font-medium mr-2">
                          {name}
                        </div>
                        <div className="h-full flex items-center 3xl:text-base">
                          <FiExternalLink size={14} />
                        </div>
                      </div>
                    </div>
                  )

                  return (
                    view === 'my_positions' ?
                      <Link href={url}>
                        {component}
                      </Link> :
                      !disabled ?
                        <Link href={url}>
                          {component}
                        </Link> :
                        component
                  )
                },
                headerClassName: 'whitespace-nowrap 3xl:text-xl 3xl:py-2',
                className: 'p-0',
              },
              {
                Header: 'Chain',
                accessor: 'chain_data',
                disableSortBy: true,
                Cell: props => {
                  const { row } = { ...props }
                  const { pool, url } = { ...row.original }
                  let { chain_data } = { ...row.original }

                  chain_data = pool?.chain_data || chain_data
                  const { name, image, disabled } = { ...chain_data }

                  const component = (
                    <div className="flex items-center p-3">
                      <div className="min-w-max h-6 3xl:h-12 flex items-center space-x-2">
                        {image && (
                          <Image
                            src={image}
                            width={24}
                            height={24}
                            className="3xl:w-8 3xl:h-8 rounded-full"
                          />
                        )}
                        <span className="hidden sm:block 3xl:text-2xl font-medium">
                          {name}
                        </span>
                      </div>
                    </div>
                  )

                  return (
                    view === 'my_positions' ?
                      <Link href={url}>
                        {component}
                      </Link> :
                      !disabled ?
                        <Link href={url}>
                          {component}
                        </Link> :
                        component
                  )
                },
                headerClassName: 'whitespace-nowrap 3xl:text-xl 3xl:py-2',
                className: 'p-0',
              },
              {
                Header: 'Pool Ratio',
                accessor: 'assets',
                sortType: (a, b) => a.original.tvl > b.original.tvl ? 1 : -1,
                Cell: props => {
                  const { row } = { ...props }
                  const { pool, url } = { ...row.original }
                  let { chain_data, asset_data, contract_data } = { ...row.original }
                  const { adopted, local, lpTokenAddress, error } = { ...pool }

                  chain_data = pool?.chain_data || chain_data
                  asset_data = pool?.asset_data || asset_data
                  contract_data = pool?.contract_data || contract_data
                  const { disabled } = { ...chain_data }
                  const { symbol, image, color } = { ...asset_data }
                  const { next_asset } = { ...contract_data }

                  const native_asset = !adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local
                  const wrapped_asset = adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local
                  const native_amount = Number(native_asset?.balance) || 0
                  const wrapped_amount = Number(wrapped_asset?.balance) || 0
                  const total_amount = native_amount + wrapped_amount

                  const component = (
                    <div className="flex items-center p-3">
                      <div className="w-full h-6 3xl:h-12 flex items-center justify-end text-right" style={{ minWidth: '8rem' }}>
                        {!lpTokenAddress && !error ?
                          <Spinner width={18} height={18} /> :
                          total_amount > 0 ?
                            <div className="w-full h-6 3xl:h-12 flex flex-col items-end justify-center space-y-0 3xl:space-y-1 pt-2 pb-1">
                              <ProgressBar
                                width={native_amount * 100 / total_amount}
                                className="w-full 3xl:h-2 rounded-lg"
                                backgroundClassName="3xl:h-2 rounded-lg"
                                style={{ backgroundColor: color }}
                                backgroundStyle={{ backgroundColor: `${color}33` }}
                              />
                              <div className="w-full flex items-center justify-between space-x-2">
                                <div className="flex flex-col items-start">
                                  <Tooltip
                                    placement="top"
                                    content={
                                      <div className="flex flex-col items-end space-y-1">
                                        <div className="flex items-center space-x-1">
                                          {image && (
                                            <Image
                                              src={image}
                                              width={14}
                                              height={14}
                                              className="rounded-full"
                                            />
                                          )}
                                          <span className="leading-3 text-2xs font-medium">
                                            {native_asset?.symbol || symbol}
                                          </span>
                                        </div>
                                        <NumberDisplay
                                          value={native_amount}
                                          noTooltip={true}
                                          className="leading-3 text-2xs font-medium"
                                        />
                                      </div>
                                    }
                                  >
                                    <div>
                                      <NumberDisplay
                                        value={native_amount * 100 / total_amount}
                                        suffix="%"
                                        noTooltip={true}
                                        className="leading-3 3xl:leading-4 text-slate-600 dark:text-slate-400 text-2xs 3xl:text-base font-medium"
                                      />
                                    </div>
                                  </Tooltip>
                                </div>
                                <div className="flex flex-col items-end">
                                  <Tooltip
                                    placement="top"
                                    content={
                                      <div className="flex flex-col items-end space-y-1">
                                        <div className="flex items-center space-x-1">
                                          {next_asset?.image && (
                                            <Image
                                              src={next_asset.image}
                                              width={14}
                                              height={14}
                                              className="rounded-full"
                                            />
                                          )}
                                          <span className="leading-3 text-2xs font-medium">
                                            {wrapped_asset?.symbol || next_asset?.symbol}
                                          </span>
                                        </div>
                                        <NumberDisplay
                                          value={wrapped_amount}
                                          noTooltip={true}
                                          className="leading-3 text-2xs font-medium"
                                        />
                                      </div>
                                    }
                                  >
                                    <div>
                                      <NumberDisplay
                                        value={100 - (native_amount * 100 / total_amount)}
                                        suffix="%"
                                        noTooltip={true}
                                        className="leading-3 3xl:leading-4 text-slate-600 dark:text-slate-400 text-2xs 3xl:text-base font-medium"
                                      />
                                    </div>
                                  </Tooltip>
                                </div>
                              </div>
                            </div> :
                            <span className="text-slate-400 dark:text-slate-500 text-sm 3xl:text-2xl font-medium">
                              No liquidity
                            </span>
                        }
                      </div>
                    </div>
                  )

                  return (
                    !disabled ?
                      <Link href={url}>
                        {component}
                      </Link> :
                      component
                  )
                },
                headerClassName: 'justify-end whitespace-nowrap 3xl:text-xl text-right 3xl:py-2',
                className: 'p-0',
              },
              {
                Header: 'Liquidity',
                accessor: 'tvl',
                disableSortBy: true,
                Cell: props => {
                  const { row } = { ...props }
                  const { pool, url } = { ...row.original }
                  let { chain_data } = { ...row.original }
                  const { lpTokenAddress, tvl, error } = { ...pool }

                  chain_data = pool?.chain_data || chain_data
                  const { disabled } = { ...chain_data }

                  const component = (
                    <div className="flex items-center p-3">
                      <div className="w-full h-6 3xl:h-12 flex items-center justify-end text-right">
                        {!lpTokenAddress && !error ?
                          <Spinner width={18} height={18} /> :
                          <NumberDisplay
                            value={tvl}
                            prefix="$"
                            noTooltip={true}
                            className="3xl:text-2xl font-medium"
                          />
                        }
                      </div>
                    </div>
                  )

                  return (
                    !disabled ?
                      <Link href={url}>
                        {component}
                      </Link> :
                      component
                  )
                },
                headerClassName: 'justify-end whitespace-nowrap 3xl:text-xl text-right 3xl:py-2',
                className: 'p-0',
              },
              {
                Header: 'Volume (7d)',
                accessor: 'volume_value',
                disableSortBy: true,
                Cell: props => {
                  const { row } = { ...props }
                  const { pool, url } = { ...row.original }
                  let { chain_data } = { ...row.original }
                  const { volume_value } = { ...pool }

                  chain_data = pool?.chain_data || chain_data
                  const { disabled } = { ...chain_data }

                  const component = (
                    <div className="flex items-center p-3">
                      <div className="w-full h-6 3xl:h-12 flex items-center justify-end text-right">
                        {isNumber(volume_value) ?
                          <NumberDisplay
                            value={volume_value}
                            prefix="$"
                            noTooltip={true}
                            className="3xl:text-2xl font-medium"
                          /> :
                          <span className="3xl:text-2xl font-medium">
                            TBD
                          </span>
                        }
                      </div>
                    </div>
                  )

                  return (
                    !disabled ?
                      <Link href={url}>
                        {component}
                      </Link> :
                      component
                  )
                },
                headerClassName: 'justify-end whitespace-nowrap 3xl:text-xl text-right 3xl:py-2',
                className: 'p-0',
              },
              {
                Header: 'Fees (7d)',
                accessor: 'fees_value',
                disableSortBy: true,
                Cell: props => {
                  const { row } = { ...props }
                  const { pool, url } = { ...row.original }
                  let { chain_data } = { ...row.original }
                  const { fees_value } = { ...pool }

                  chain_data = pool?.chain_data || chain_data
                  const { disabled } = { ...chain_data }

                  const component = (
                    <div className="flex items-center p-3">
                      <div className="w-full h-6 3xl:h-12 flex items-center justify-end text-right">
                        {isNumber(fees_value) ?
                          <NumberDisplay
                            value={fees_value}
                            prefix="$"
                            noTooltip={true}
                            className="3xl:text-2xl font-medium"
                          /> :
                          <span className="3xl:text-2xl font-medium">
                            TBD
                          </span>
                        }
                      </div>
                    </div>
                  )

                  return (
                    !disabled ?
                      <Link href={url}>
                        {component}
                      </Link> :
                      component
                  )
                },
                headerClassName: 'justify-end whitespace-nowrap 3xl:text-xl text-right 3xl:py-2',
                className: 'p-0',
              },
              {
                Header: (
                  <Tooltip content="Yield from 0.04% user swap fees">
                    <div>APY</div>
                  </Tooltip>
                ),
                accessor: 'apy',
                disableSortBy: true,
                Cell: props => {
                  const { row } = { ...props }
                  const { pool, url } = { ...row.original }
                  let { chain_data } = { ...row.original }
                  const { apy } = { ...pool }

                  chain_data = pool?.chain_data || chain_data
                  const { disabled } = { ...chain_data }

                  const component = (
                    <div className="flex items-center p-3">
                      <div className="w-full h-6 3xl:h-12 flex items-center justify-end text-right">
                        {isNumber(apy) ?
                          <NumberDisplay
                            value={apy * 100}
                            maxDecimals={2}
                            suffix="%"
                            noTooltip={true}
                            className="3xl:text-2xl font-medium"
                          /> :
                          <span className="3xl:text-2xl font-medium">
                            TBD
                          </span>
                        }
                      </div>
                    </div>
                  )

                  return (
                    !disabled ?
                      <Link href={url}>
                        {component}
                      </Link> :
                      component
                  )
                },
                headerClassName: 'justify-end whitespace-nowrap 3xl:text-xl text-right 3xl:py-2',
                className: 'p-0',
              },
              {
                Header: 'Your Pool Tokens',
                accessor: 'lpTokenBalance',
                disableSortBy: true,
                Cell: props => {
                  const { value, row } = { ...props }
                  const { symbol, chain_data, url } = { ...row.original }
                  const { disabled } = { ...chain_data }

                  const component = (
                    <div className="flex items-center p-3">
                      <div className="w-full h-6 3xl:h-12 flex items-center">
                        {isNumber(value) ?
                          <NumberDisplay
                            value={value}
                            suffix={symbol ? ` ${symbol}` : ''}
                            noTooltip={true}
                            className="3xl:text-2xl font-medium"
                          /> :
                          <span className="3xl:text-2xl font-medium">
                            -
                          </span>
                        }
                      </div>
                    </div>
                  )

                  return (
                    !disabled ?
                      <Link href={url}>
                        {component}
                      </Link> :
                      component
                  )
                },
                headerClassName: 'whitespace-nowrap 3xl:text-xl 3xl:py-2',
                className: 'p-0',
              },
              {
                Header: 'Value USD',
                accessor: 'balances',
                disableSortBy: true,
                Cell: props => {
                  const { row } = { ...props }
                  const { chain_data, value, url } = { ...row.original }
                  const { disabled } = { ...chain_data }

                  const component = (
                    <div className="flex items-center p-3">
                      <div className="w-full h-6 3xl:h-12 flex items-center justify-end text-right">
                        {isNumber(value) ?
                          <NumberDisplay
                            value={value}
                            prefix="$"
                            noTooltip={true}
                            className="3xl:text-2xl font-medium"
                          /> :
                          <span className="3xl:text-2xl font-medium">
                            -
                          </span>
                        }
                      </div>
                    </div>
                  )

                  return (
                    !disabled ?
                      <Link href={url}>
                        {component}
                      </Link> :
                      component
                  )
                },
                headerClassName: 'justify-end whitespace-nowrap 3xl:text-xl text-right 3xl:py-2',
                className: 'p-0',
              },
              {
                Header: 'Pool Share',
                accessor: 'share',
                disableSortBy: true,
                Cell: props => {
                  const { value, row } = { ...props }
                  const { chain_data, url } = { ...row.original }
                  const { disabled } = { ...chain_data }

                  const component = (
                    <div className="flex items-center p-3">
                      <div className="w-full h-6 3xl:h-12 flex items-center justify-end text-right">
                        {isNumber(value) ?
                          <NumberDisplay
                            value={value}
                            suffix="%"
                            noTooltip={true}
                            className="3xl:text-2xl font-medium"
                          /> :
                          <span className="3xl:text-2xl font-medium">
                            -
                          </span>
                        }
                      </div>
                    </div>
                  )

                  return (
                    !disabled ?
                      <Link href={url}>
                        {component}
                      </Link> :
                      component
                  )
                },
                headerClassName: 'justify-end whitespace-nowrap 3xl:text-xl text-right 3xl:py-2',
                className: 'p-0',
              },
            ].filter(c => !(view === 'my_positions' ? ['assets', 'tvl', 'volume_value', 'fees_value', 'apy'] : ['lpTokenBalance', 'balances', 'share']).includes(c.accessor))}
            data={data}
            defaultPageSize={100}
            noPagination={data.length <= 10}
            className="no-border no-shadow"
          />
        </div>  :
      <Spinner />
  )
}
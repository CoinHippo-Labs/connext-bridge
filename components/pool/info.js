import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'

import DecimalsFormat from '../decimals-format'
import Image from '../image'
import { currency_symbol } from '../../lib/object/currency'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { toArray, equalsIgnoreCase, loaderColor } from '../../lib/utils'

export default (
  {
    pool,
    userPoolsData,
    disabled = false,
    onSelect,
  },
) => {
  const {
    preferences,
    chains,
    assets,
    pool_assets,
    pools,
    wallet,
  } = useSelector(
    state => (
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
    address,
  } = { ...wallet_data }

  const {
    chain,
    asset,
  } = { ...pool }

  const chain_data = getChain(chain, chains_data)

  const {
    chain_id,
    explorer,
    color,
  } = { ...chain_data }

  const {
    url,
    contract_path,
  } = { ...explorer }

  const selected = !!(chain && asset)

  const no_pool = selected && !getAsset(asset, pool_assets_data, chain_id)

  const pool_data = toArray(pools_data).find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)

  const {
    asset_data,
    contract_data,
    lpTokenAddress,
    adopted,
    local,
    supply,
    volume_value,
    error,
  } = { ...pool_data }

  const {
    contract_address,
    next_asset,
  } = { ...contract_data }

  const pool_loading = selected && !no_pool && !error && !pool_data

  const user_pool_data = pool_data && toArray(userPoolsData).find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)

  const {
    lpTokenBalance,
  } = { ...user_pool_data }

  const share = parseFloat((Number(lpTokenBalance || '0') * 100 / (Number(supply) || 1)).toFixed(18))

  const position_loading = address && selected && !no_pool && !error && (!userPoolsData || pool_loading)

  const pool_tokens_data =
    toArray(
      _.concat(adopted, local)
    )
    .map((a, i) => {
      const {
        address,
        symbol,
        balance,
        decimals,
      } = { ...a }

      return {
        i,
        contract_address: address,
        chain_id,
        symbol,
        decimals,
        image:
          (
            equalsIgnoreCase(
              address,
              contract_address,
            ) ?
              contract_data?.image :
              equalsIgnoreCase(
                address,
                next_asset?.contract_address,
              ) ?
                next_asset?.image || contract_data?.image :
                null
          ) ||
          asset_data?.image,
        balance,
      }
    })

  const {
    price,
  } = { ...getAsset(asset, assets_data) }

  const tvl =
    Number(
      supply ||
      _.sum(
        toArray(
          _.concat(adopted, local)
        )
        .map(a => Number(a.balance))
      )
    ) * (price || 0)

  const metricClassName = 'bg-slate-50 dark:bg-slate-900 bg-opacity-60 dark:bg-opacity-60 rounded border dark:border-slate-800 flex flex-col space-y-12 py-5 px-4'
  const titleClassName = 'text-slate-400 dark:text-slate-200 text-base font-medium'
  const valueClassName = 'text-lg sm:text-3xl font-semibold'
  const gridValueClassName = 'text-lg font-semibold'

  const boxShadow = `${color || '#e53f3f'}${theme === 'light' ? '44' : '33'} 0px 32px 128px 64px`

  return (
    <div className="sm:min-h-full bg-transparent">
      <div className="space-y-6">
        <div className="space-y-0">
          <div
            className="w-32 sm:w-64 mx-auto sm:mr-8"
            style={
              {
                boxShadow,
                WebkitBoxShadow: boxShadow,
                MozBoxShadow: boxShadow,
              }
            }
          />
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
            <div className={metricClassName}>
              <span className={titleClassName}>
                TVL
              </span>
              <div className="flex flex-col space-y-1">
                <span className={valueClassName}>
                  {pool_data && !error ?
                    <span className="uppercase">
                      {currency_symbol}
                      <DecimalsFormat
                        value={tvl}
                        className={valueClassName}
                      />
                    </span> :
                    selected && !no_pool && !error &&
                    (pool_loading ?
                      <div className="mt-1">
                        <TailSpin
                          width="24"
                          height="24"
                          color={loaderColor(theme)}
                        />
                      </div> :
                      '-'
                    )
                  }
                </span>
              </div>
            </div>
            <div className={metricClassName}>
              <span className={titleClassName}>
                Volume (7d)
              </span>
              <div className="flex flex-col space-y-1">
                <span className={valueClassName}>
                  {pool_data && !error ?
                    !isNaN(volume_value) ?
                      <span className="uppercase">
                        {currency_symbol}
                        <DecimalsFormat
                          value={volume_value}
                          className={valueClassName}
                        />
                      </span> :
                      'TBD' :
                    selected && !no_pool && !error &&
                    (pool_loading ?
                      <div className="mt-1">
                        <TailSpin
                          width="24"
                          height="24"
                          color={loaderColor(theme)}
                        />
                      </div> :
                      '-'
                    )
                  }
                </span>
              </div>
            </div>
            <div className={metricClassName}>
              <span className={titleClassName}>
                Liquidity provided
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {position_loading || pool_loading ?
                  <div>
                    <div className="mt-1">
                      <TailSpin
                        width="24"
                        height="24"
                        color={loaderColor(theme)}
                      />
                    </div>
                  </div> :
                  pool_tokens_data
                    .map((p, i) => {
                      const {
                        contract_address,
                        symbol,
                        image,
                        balance,
                      } = { ...p }

                      return (
                        <div
                          key={i}
                          className="flex flex-col space-y-1"
                        >
                          <a
                            href={`${url}${contract_path?.replace('{address}', contract_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2"
                          >
                            {
                              image &&
                              (
                                <Image
                                  src={image}
                                  width={16}
                                  height={16}
                                  className="rounded-full"
                                />
                              )
                            }
                            <span className="text-xs font-medium">
                              {symbol}
                            </span>
                          </a>
                          <a
                            href={`${url}${contract_path?.replace('{address}', contract_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={gridValueClassName}
                          >
                            {pool_data && !error ?
                              <span className="uppercase">
                                {balance > -1 ?
                                  <DecimalsFormat
                                    value={balance}
                                    className={gridValueClassName}
                                  /> :
                                  '-'
                                }
                              </span> :
                              selected && !no_pool && !error &&
                              (pool_loading ?
                                <div className="mt-1">
                                  <TailSpin
                                    width="24"
                                    height="24"
                                    color={loaderColor(theme)}
                                  />
                                </div> :
                                '-'
                              )
                            }
                          </a>
                        </div>
                      )
                    })
                }
              </div>
            </div>
            <div className={metricClassName}>
              <span className={titleClassName}>
                My positions
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {position_loading || pool_loading ?
                  <div>
                    <div className="mt-1">
                      <TailSpin
                        width="24"
                        height="24"
                        color={loaderColor(theme)}
                      />
                    </div>
                  </div> :
                  <>
                    <div className="flex flex-col space-y-1">
                      {lpTokenAddress && url ?
                        <a
                          href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium"
                        >
                          Pool Tokens
                        </a> :
                        <span className="text-xs font-medium">
                          Pool Tokens
                        </span>
                      }
                      {lpTokenAddress && url ?
                        <a
                          href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={gridValueClassName}
                        >
                          <DecimalsFormat
                            value={lpTokenBalance || '0'}
                            className={gridValueClassName}
                          />
                        </a> :
                        <DecimalsFormat
                          value={lpTokenBalance || '0'}
                          className={gridValueClassName}
                        />
                      }
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-medium">
                        Share
                      </span>
                      <DecimalsFormat
                        value={share}
                        suffix="%"
                        className={gridValueClassName}
                      />
                    </div>
                  </>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
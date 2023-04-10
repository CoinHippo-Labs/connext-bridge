import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { utils } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import { TiArrowLeft } from 'react-icons/ti'

import Info from './info'
import Liquidity from './liquidity'
import DecimalsFormat from '../decimals-format'
import Image from '../image'
import { getChain, chainName } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { split, toArray, paramsToObj, loaderColor } from '../../lib/utils'
import { BALANCES_DATA, GET_BALANCES_DATA } from '../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const {
    preferences,
    chains,
    assets,
    pool_assets,
    _pools,
    rpc_providers,
    dev,
    wallet,
    balances,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        pool_assets: state.pool_assets,
        _pools: state.pools,
        rpc_providers: state.rpc_providers,
        dev: state.dev,
        wallet: state.wallet,
        balances: state.balances,
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
  } = { ..._pools }
  const {
    rpcs,
  } = { ...rpc_providers }
  const {
    sdk,
  } = { ...dev }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    chain_id,
    address,
  } = { ...wallet_data }
  const {
    balances_data,
  } = { ...balances }

  const router = useRouter()
  const {
    asPath,
  } = { ...router }

  const [pool, setPool] = useState({})
  const [userPools, setUserPools] = useState(null)
  const [poolsTrigger, setPoolsTrigger] = useState(null)

  // get pool from path
  useEffect(
    () => {
      let updated = false

      const params = paramsToObj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))

      let path = !asPath ? '/' : asPath.toLowerCase()
      path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path

      if (path.includes('on-')) {
        const paths = path.replace('/pool/', '').split('-')

        const chain = paths[paths.indexOf('on') + 1]
        const asset = _.head(paths) !== 'on' ? _.head(paths) : null

        const chain_data = getChain(chain, chains_data)
        const asset_data = getAsset(asset, pool_assets_data)

        if (chain_data) {
          pool.chain = chain
          updated = true
        }

        if (asset_data) {
          pool.asset = asset
          updated = true
        }
      }

      if (updated) {
        setPool(pool)
        setPoolsTrigger(moment().valueOf())
      }
    },
    [asPath, chains_data, pool_assets_data],
  )

  // set pool to path
  useEffect(
    () => {
      const params = (paramsToObj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))) || {}

      if (pool) {
        const {
          chain,
          asset,
        } = { ...pool }

        const chain_data = getChain(chain, chains_data, true, true)

        const {
          chain_id,
        } = { ...chain_data }

        if (chain_data) {
          params.chain = chain

          if (asset && getAsset(asset, pool_assets_data, chain_id)) {
            params.asset = asset
          }
        }
      }

      if (!(params.chain && params.asset) && pool_assets_data?.length > 0) {
        const {
          id,
          contracts,
        } = { ..._.head(pool_assets_data) }

        params.chain = params.chain || getChain(_.head(contracts)?.chain_id, chains_data)?.id
        params.asset = params.asset || id
      }

      if (Object.keys(params).length > 0) {
        const {
          chain,
          asset,
        } = { ...params }

        delete params.chain
        delete params.asset

        router.push(
          `/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`,
          undefined,
          {
            shallow: true,
          },
        )
      }
    },
    [address, pool],
  )

  // update balances
  useEffect(
    () => {
      const {
        id,
      } = { ...getChain(chain_id, chains_data) }

      if (asPath && id) {
        const params = paramsToObj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))

        if (!params?.chain && !asPath.includes('on-') && getChain(id, chains_data, true)) {
          setPool(
            {
              ...pool,
              chain: id,
            }
          )
        }

        getBalances(id)
      }
    },
    [asPath, chain_id, chains_data],
  )

  // update balances
  useEffect(
    () => {
      dispatch(
        {
          type: BALANCES_DATA,
          value: null,
        }
      )

      if (address) {
        const {
          chain,
        } = { ...pool }

        getBalances(chain)
      }
      else {
        reset('address')
      }
    },
    [address],
  )

  // update balances
  useEffect(
    () => {
      const getData = () => {
        if (address) {
          const {
            chain,
          } = { ...pool }

          getBalances(chain)
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(),
          0.25 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [rpcs],
  )

  // update balances
  useEffect(
    () => {
      if (pools_data) {
        _.uniq(
          toArray(
            pools_data.map(p => p?.chain_data?.id)
          )
        )
        .forEach(c => getBalances(c))
      }
    },
    [pools_data],
  )

  // get pools
  useEffect(
    () => {
      const getData = async () => {
        const {
          chain,
        } = { ...pool }

        if (
          sdk &&
          address &&
          chain &&
          poolsTrigger
        ) {
          const chain_data = getChain(chain, chains_data)

          const {
            chain_id,
            domain_id,
          } = { ...chain_data }

          try {
            console.log(
              '[getUserPools]',
              {
                domain_id,
                address,
              },
            )

            const response = _.cloneDeep(await sdk.sdkPool.getUserPools(domain_id, address))

            console.log(
              '[UserPools]',
              {
                domain_id,
                address,
                response,
              },
            )

            if (Array.isArray(response)) {
              setUserPools(
                response
                  .map(p => {
                    const {
                      info,
                      lpTokenBalance,
                      poolTokenBalances,
                    } = { ...p }

                    const {
                      adopted,
                      local,
                      symbol,
                    } = { ...info }

                    if (adopted) {
                      const {
                        balance,
                        decimals,
                      } = { ...adopted }

                      adopted.balance =
                        utils.formatUnits(
                          BigInt(balance || '0'),
                          decimals || 18,
                        )

                      info.adopted = adopted
                    }

                    if (local) {
                      const {
                        balance,
                        decimals,
                      } = { ...local }

                      local.balance =
                        utils.formatUnits(
                          BigInt(balance || '0'),
                          decimals || 18,
                        )

                      info.local = local
                    }

                    const symbols = split(symbol, 'normal', '-')

                    const asset_data = getAsset(null, pool_assets_data, chain_id, undefined, symbols)

                    return {
                      ...p,
                      id: `${chain_data.id}_${asset_data?.id}`,
                      chain_data,
                      asset_data,
                      ...info,
                      symbols,
                      lpTokenBalance: utils.formatEther(BigInt(lpTokenBalance || '0')),
                      poolTokenBalances:
                        toArray(poolTokenBalances)
                          .map((b, i) =>
                            Number(
                              utils.formatUnits(
                                BigInt(b || '0'),
                                adopted?.index === i ?
                                  adopted.decimals :
                                  local?.index === i ?
                                    local.decimals :
                                    18,
                              )
                            )
                          ),
                    }
                  })
              )
            }
            else {
              setUserPools(toArray(userPools))
            }
          } catch (error) {
            console.log(
              '[getUserPools error]',
              {
                domain_id,
                address,
                error,
              },
            )
          }
        }
      }

      getData()
    },
    [sdk, address, poolsTrigger],
  )

  const reset = async origin => {
    const reset_pool = origin !== 'address'

    if (reset_pool) {
      setPool(
        {
          ...pool,
        }
      )
    }

    setPoolsTrigger(moment().valueOf())

    const {
      chain,
    } = { ...pool }

    getBalances(chain)
  }

  const getBalances = chain => {
    dispatch(
      {
        type: GET_BALANCES_DATA,
        value: { chain },
      }
    )
  }

  const {
    chain,
    asset,
  } = { ...pool }

  const chain_data = getChain(chain, chains_data)

  const {
    explorer,
  } = { ...chain_data }

  const {
    url,
    contract_path,
  } = { ...explorer }

  const selected = !!(chain && asset)

  const no_pool = selected && !getAsset(asset, pool_assets_data, chain_data?.chain_id)

  const pool_data = toArray(pools_data).find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)

  const {
    name,
    apy,
    error,
  } = { ...pool_data }

  const pool_loading = selected && !no_pool && !error && !pool_data

  return (
    <div className="w-full mb-4">
      <div className="flex justify-center">
        <div className="w-full flex flex-col space-y-3.5 3xl:space-y-6 my-4 sm:my-12 mx-1 sm:mx-4">
          <Link href="/pools">
            <div className="w-fit rounded border dark:border-slate-800 flex items-center text-slate-600 dark:text-slate-500 space-x-1 3xl:space-x-2 py-0.5 px-2.5">
              <TiArrowLeft
                size={18}
                className="3xl:w-6 3xl:h-6 -ml-0.5"
              />
              <span className="text-base 3xl:text-2xl font-semibold">
                Back to pools
              </span>
            </div>
          </Link>
          <div className="space-y-6 sm:space-y-16 3xl:space-y-20">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between space-y-4 lg:space-y-0 sm:space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="flex items-center space-x-3 sm:space-x-4 3xl:space-x-6">
                    {
                      chain_data?.image &&
                      (
                        <Image
                          src={chain_data.image}
                          width={48}
                          height={48}
                          className="3xl:w-16 3xl:h-16 rounded-full"
                        />
                      )
                    }
                    <span className="tracking-tighter text-xl sm:text-5xl font-semibold">
                      <span className="mr-1">
                        {chainName(chain_data)}
                      </span>
                      <span className="whitespace-nowrap">
                        {split(name, 'normal', '-').join(' ')}
                      </span>
                    </span>
                  </div>
                </div>
                <Tooltip
                  placement="top"
                  content="Returns from 0.04% user swap fees"
                  className="z-50 bg-dark text-white text-xs"
                >
                  <div>
                    <span className="text-slate-400 dark:text-slate-200 text-base 3xl:text-2xl font-medium">
                      Reward APY
                    </span>
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-lg sm:text-3xl 3xl:text-4xl font-semibold">
                        {pool_data && !error ?
                          !isNaN(apy) ?
                            <DecimalsFormat
                              value={apy * 100}
                              maxDecimals={2}
                              suffix="%"
                              noTooltip={true}
                              className="uppercase 3xl:text-4xl"
                            /> :
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
                </Tooltip>
              </div>
              {
                error &&
                (
                  <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-100 dark:bg-opacity-50 rounded break-all tracking-tighter text-red-600 dark:text-red-400 text-base 3xl:text-xl font-medium py-1.5 px-4">
                    {error.message}
                  </div>
                )
              }
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
              <div className="order-2 lg:order-1 lg:col-span-2">
                <Info
                  pool={pool}
                  userPoolsData={userPools}
                  onSelect={p => setPool(p)}
                />
              </div>
              <Liquidity
                pool={pool}
                userPoolsData={userPools}
                onFinish={
                  () => {
                    setPoolsTrigger(moment().valueOf())
                    getBalances(chain)
                  }
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
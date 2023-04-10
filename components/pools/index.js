import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { utils } from 'ethers'

import Pools from './pools'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { split, toArray } from '../../lib/utils'

const VIEWS =
  [
    {
      id: 'pools',
      title: 'Pools',
    },
    {
      id: 'my_positions',
      title: 'My positions',
    },
  ]

export default () => {
  const {
    chains,
    pool_assets,
    _pools,
    user_pools,
    dev,
    wallet,
  } = useSelector(
    state => (
      {
        chains: state.chains,
        pool_assets: state.pool_assets,
        _pools: state.pools,
        user_pools: state.user_pools,
        dev: state.dev,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
  const {
    chains_data,
  } = { ...chains }
  const {
    pool_assets_data,
  } = { ...pool_assets }
  const {
    pools_data,
  } = { ..._pools }
  const {
    user_pools_data,
  } = { ...user_pools }
  const { sdk,
  } = { ...dev }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    address,
  } = { ...wallet_data }

  const [view, setView] = useState(_.head(VIEWS)?.id)
  const [pools, setPools] = useState(null)
  const [poolsTrigger, setPoolsTrigger] = useState(null)

  // user pools
  useEffect(
    () => {
      if (
        chains_data && user_pools_data &&
        (
          getChain(null, chains_data, true, false, false, undefined, true).length <= Object.keys(user_pools_data).length ||
          Object.values(user_pools_data).flatMap(d => d).filter(d => Number(d?.lpTokenBalance) > 0).length > 0
        )
      ) {
        setPools(Object.values(user_pools_data).flatMap(d => d))
      }
    },
    [chains_data, user_pools_data],
  )

  // user pools
  useEffect(
    () => {
      const getData = async () => {
        if (sdk && user_pools_data && ['my_positions'].includes(view)) {
          if (address) {
            let data

            for (const chain_data of chains_data) {
              try {
                const {
                  chain_id,
                  domain_id,
                } = { ...chain_data }

                const response = toArray(_.cloneDeep(await sdk.sdkPool.getUserPools(domain_id, address)))

                data =
                  toArray(
                    _.concat(
                      data,
                      response.map(p => {
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
                      }),
                    )
                  )
                  .filter(d => d.asset_data)
              } catch (error) {}
            }

            setPools(toArray(data || pools))
          }
          else {
            setPools([])
          }
        }
      }

      getData()
    },
    [sdk, address, view, poolsTrigger],
  )

  return (
    <div className="w-full mb-4">
      <div className="flex justify-center">
        <div className="w-full flex flex-col space-y-4 sm:space-y-8 my-4 sm:my-12 mx-1 sm:mx-4">
          <div className="grid sm:grid-cols-1 gap-4">
            <div className="flex flex-col space-y-6 sm:space-y-12">
              <h1 className="tracking-tighter text-xl sm:text-5xl 3xl:text-6xl font-semibold">
                Add liquidity to earn rewards.
              </h1>
              <div className="border-0 dark:border-slate-800 flex items-center">
                {VIEWS.map((v, i) => (
                  <div
                    key={i}
                    onClick={() => setView(v.id)}
                    className={`border-b-2 ${view === v.id ? 'border-slate-600 dark:border-white font-medium' : 'border-transparent text-slate-400 dark:text-slate-500 font-medium'} whitespace-nowrap cursor-pointer text-lg 3xl:text-2xl mr-2 p-2`}
                  >
                    {v.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Pools
            view={view}
            userPoolsData={pools}
          />
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { BigNumber, utils } from 'ethers'

import Total from './total'
import Pools from './pools'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, name, equals_ignore_case } from '../../lib/utils'

const VIEWS =
  [
    {
      id: 'my_positions',
      title: 'My positions',
    },
    {
      id: 'pools',
      title: 'Pools',
    },
  ]

export default () => {
  const {
    chains,
    pool_assets,
    _pools,
    dev,
    wallet,
  } = useSelector(state =>
    (
      {
        chains: state.chains,
        pool_assets: state.pool_assets,
        _pools: state.pools,
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
  const { sdk,
  } = { ...dev }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    address,
  } = { ...wallet_data }

  const [view, setView] =
    useState(
      _.last(VIEWS)?.id
    )
  const [pools, setPools] = useState(null)
  const [poolsTrigger, setPoolsTrigger] = useState(null)

  // get pools
  useEffect(() => {
    const getData = async () => {
      if (sdk) {
        if (address) {
          let data

          for (const chain_data of chains_data) {
            try {
              const {
                chain_id,
                domain_id,
              } = { ...chain_data }

              const response =
                await sdk.nxtpSdkPool
                  .getUserPools(
                    domain_id,
                    address,
                  )

              if (Array.isArray(response)) {
                data =
                  _.concat(
                    data,
                    response
                      .map(p => {
                        const {
                          info,
                          lpTokenBalance,
                          poolTokenBalances,
                        } = { ...p }
                        const {
                          symbol,
                          decimals,
                          balances,
                        } = { ...info }

                        const symbols =
                          (symbol || '')
                            .split('-')
                            .filter(s => s)

                        const asset_data = pool_assets_data
                          .find(a =>
                            symbols.findIndex(s =>
                              equals_ignore_case(
                                s,
                                a?.symbol,
                              )
                            ) > -1 ||
                            (a?.contracts || [])
                              .findIndex(c =>
                                c?.chain_id === chain_id &&
                                symbols.findIndex(s =>
                                  equals_ignore_case(
                                    s,
                                    c?.symbol,
                                  )
                                ) > -1
                              ) > -1
                          )

                        return {
                          ...p,
                          chain_data,
                          asset_data,
                          ...info,
                          symbols,
                          lpTokenBalance:
                            Number(
                              utils.formatUnits(
                                BigNumber.from(
                                  lpTokenBalance ||
                                  '0',
                                ),
                                _.last(decimals) ||
                                18,
                              )
                            ),
                          poolTokenBalances:
                            (poolTokenBalances || [])
                              .map((b, i) =>
                                Number(
                                  utils.formatUnits(
                                    BigNumber.from(
                                      b ||
                                      '0',
                                    ),
                                    decimals?.[i] ||
                                    18,
                                  )
                                )
                              ),
                          balances:
                            (balances || p?.balances || [])
                              .map((b, i) =>
                                typeof b === 'number' ?
                                  b :
                                  Number(
                                    utils.formatUnits(
                                      BigNumber.from(
                                        b ||
                                        '0',
                                      ),
                                      decimals?.[i] ||
                                      18,
                                    )
                                  )
                              ),
                        }
                      }),
                  )
                  .filter(d => d)
              }
            } catch (error) {}
          }

          setPools(
            data ||
            pools ||
            []
          )
        }
        else {
          setPools([])
        }
      }
    }

    getData()
  }, [sdk, address, poolsTrigger])

  return (
    <div className="mb-4">
      <div className="flex justify-center">
        <div className="w-full flex flex-col space-y-4 sm:space-y-6 my-4 sm:my-12 mx-1 sm:mx-4">
          <div className="grid sm:grid-cols-1 gap-4">
            <div className="flex flex-col space-y-6 sm:space-y-16">
              <h1 className="text-2xl sm:text-3xl font-bold">
                Add liquidity to earn
                <br />
                trading fees and rewards.
              </h1>
              <div className="border-b dark:border-slate-800 flex items-center space-x-2">
                {VIEWS
                  .map((v, i) => (
                    <div
                      key={i}
                      onClick={() => setView(v.id)}
                      className={`border-b-4 ${view === v.id ? 'border-slate-600 dark:border-white font-bold' : 'border-transparent text-slate-400 dark:text-slate-500 font-semibold'} cursor-pointer text-lg p-3`}
                    >
                      {v.title}
                    </div>
                  ))
                }
              </div>
            </div>
            {
              false &&
              view === 'pools' &&
              (
                <Total />
              )
            }
          </div>
          <Pools
            view={view}
            user_pools_data={pools}
          />
        </div>
      </div>
    </div>
  )
}
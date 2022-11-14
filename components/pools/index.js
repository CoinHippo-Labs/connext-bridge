import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { BigNumber, utils } from 'ethers'

import Total from './total'
import Pools from './pools'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, name, equals_ignore_case } from '../../lib/utils'

const VIEWS = [
  'all_pools',
  'my_pools',
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

  const [view, setView] = useState(_.head(VIEWS))
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
                          liquidity,
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
                                igNumber.from(
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
                          balances: (balances || [])
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
        <div className="w-full flex flex-col space-y-8 my-6 my-4 sm:my-6 mx-1 sm:mx-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-4">
              <h1 className="uppercase text-lg font-semibold">
                Add Liquidity
              </h1>
              <div className="flex items-center space-x-0.5">
                {VIEWS
                  .map((v, i) => (
                    <div
                      key={i}
                      onClick={() => setView(v)}
                      className={`${view === v ? 'bg-blue-500 dark:bg-blue-600 text-white font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-900 font-medium hover:font-semibold'} rounded-lg cursor-pointer uppercase py-1 px-2.5`}
                    >
                      {name(v)}
                    </div>
                  ))
                }
              </div>
            </div>
            {
              view === 'all_pools' &&
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
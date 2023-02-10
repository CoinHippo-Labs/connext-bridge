import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, Contract, constants, utils } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import { TiArrowLeft } from 'react-icons/ti'

import Info from './info'
import Liquidity from './liquidity'
import Image from '../image'
import DecimalsFormat from '../decimals-format'
import { chainName } from '../../lib/object/chain'
import { number_format, params_to_obj, equals_ignore_case, loader_color } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

const WRAPPED_PREFIX =
  process.env.NEXT_PUBLIC_WRAPPED_PREFIX ||
  'next'

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
  } = useSelector(state =>
    (
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
    page_visible,
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
  const [pools, setPools] = useState(null)
  const [poolsTrigger, setPoolsTrigger] = useState(null)

  // get pool from path
  useEffect(
    () => {
      let updated = false

      const params =
        params_to_obj(
          asPath?.indexOf('?') > -1 &&
          asPath.substring(
            asPath.indexOf('?') + 1,
          )
        )

      let path =
        !asPath ?
          '/' :
          asPath.toLowerCase()

      path =
        path.includes('?') ?
          path.substring(
            0,
            path.indexOf('?'),
          ) :
          path

      if (path.includes('on-')) {
        const paths =
          path
            .replace(
              '/pool/',
              '',
            )
            .split('-')

        const chain = paths[paths.indexOf('on') + 1]
        const asset =
          _.head(paths) !== 'on' ?
            _.head(paths) :
            null

        const chain_data = (chains_data || [])
          .find(c =>
            c?.id === chain
          )
    
        const asset_data = (pool_assets_data || [])
          .find(a =>
            a?.id === asset ||
            equals_ignore_case(
              a?.symbol,
              asset,
            )
          )

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
        setPoolsTrigger(
          moment()
            .valueOf()
        )
      }
    },
    [asPath, chains_data, pool_assets_data],
  )

  // set pool to path
  useEffect(
    () => {
      const params = {}

      if (pool) {
        const {
          chain,
          asset,
        } = { ...pool }

        if (
          (chains_data || [])
            .findIndex(c =>
              !c?.disabled &&
              !c?.no_pool &&
              c?.id === chain
            ) > -1
        ) {
          params.chain = chain

          if (
            asset &&
            (pool_assets_data || [])
              .findIndex(a =>
                a?.id === asset &&
                (a.contracts || [])
                  .findIndex(c =>
                    c?.chain_id ===
                    chains_data
                      .find(_c =>
                        _c?.id === chain
                      )?.chain_id
                  ) > -1
              ) > -1
          ) {
            params.asset = asset
          }
        }
      }

      if (
        !(
          params.chain &&
          params.asset
        ) &&
        pool_assets_data?.length > 0
      ) {
        const {
          id,
          contracts,
        } = {
          ...(
            _.head(pool_assets_data)
          ),
        }

        params.chain =
          params.chain ||
          (chains_data || [])
            .find(c =>
              c?.chain_id === _.head(contracts)?.chain_id
            )?.id

        params.asset =
          params.asset ||
          id
      }

      if (Object.keys(params).length > 0) {
        const {
          chain,
          asset,
        } = { ...params }

        delete params.chain
        delete params.asset

        router
          .push(
            `/pool/${
              chain ?
                `${
                  asset ?
                    `${asset.toUpperCase()}-` :
                    ''
                }on-${chain}` :
                ''
            }${
              Object.keys(params).length > 0 ?
                `?${new URLSearchParams(params).toString()}` :
                ''
            }`,
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
        chain,
      } = { ...pool }

      const chain_data = (chains_data || [])
        .find(c =>
          c?.chain_id === chain_id
        )

      const {
        id,
      } = { ...chain_data }

      if (
        asPath &&
        id
      ) {
        const params =
          params_to_obj(
            asPath.indexOf('?') > -1 &&
            asPath.substring(
              asPath.indexOf('?') + 1,
            )
          )

        if (
          !params?.chain &&
          !asPath.includes('on-') &&
          (chains_data || [])
            .findIndex(c =>
              !c?.disabled &&
              c?.id === id
            ) > -1
        ) {
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
        if (
          page_visible &&
          address
        ) {
          const {
            chain,
          } = { ...pool }

          getBalances(chain)
        }
      }

      getData()

      const interval =
        setInterval(
          () =>
            getData(),
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
        const chains =
          _.uniq(
            pools_data
              .map(p => p?.chain_data?.id)
              .filter(c => c)
          )

        chains
          .forEach(c =>
            getBalances(c)
          )
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
          const chain_data = (chains_data || [])
            .find(c =>
              c?.id === chain
            )

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

            const response =
              _.cloneDeep(
                await sdk.sdkPool
                  .getUserPools(
                    domain_id,
                    address,
                  )
              )

            console.log(
              '[UserPools]',
              {
                domain_id,
                address,
                response,
              },
            )

            if (Array.isArray(response)) {
              setPools(
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
                    } = { ...info }
                    let {
                      name,
                      symbol,
                    } = { ...info }

                    if (symbol?.includes(`${WRAPPED_PREFIX}${WRAPPED_PREFIX}`)) {
                      name =
                        (name || '')
                          .replace(
                            WRAPPED_PREFIX,
                            '',
                          )

                      symbol =
                        symbol
                          .split('-')
                          .map(s =>
                            s
                              .replace(
                                WRAPPED_PREFIX,
                                '',
                              )
                          )
                          .join('-')

                      info.name = name
                      info.symbol = symbol
                    }

                    if (symbol?.includes('-')) {
                      const symbols =
                        symbol
                          .split('-')

                      if (
                        equals_ignore_case(
                          _.head(symbols),
                          _.last(symbols),
                        ) &&
                        adopted?.symbol &&
                        local?.symbol
                      ) {
                        symbol =
                          [
                            adopted.symbol,
                            local.symbol,
                          ]
                          .join('-')

                        info.symbol = symbol
                      }
                    }

                    const symbols =
                      (symbol || '')
                        .split('-')
                        .filter(s => s)

                    if (adopted) {
                      const {
                        balance,
                        decimals,
                      } = { ...adopted }

                      adopted.balance =
                        utils.formatUnits(
                          BigNumber.from(
                            balance ||
                            '0'
                          ),
                          decimals ||
                          18,
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
                          BigNumber.from(
                            balance ||
                            '0'
                          ),
                          decimals ||
                          18,
                        )

                      info.local = local
                    }

                    const asset_data = (pool_assets_data || [])
                      .find(a =>
                        symbols
                          .findIndex(s =>
                            equals_ignore_case(
                              s,
                              a?.symbol,
                            )
                          ) > -1 ||
                        (a?.contracts || [])
                          .findIndex(c =>
                            c?.chain_id === chain_id &&
                            symbols
                              .findIndex(s =>
                                equals_ignore_case(
                                  s,
                                  c?.symbol,
                                )
                              ) > -1
                          ) > -1
                      )

                    const id = `${chain_data.id}_${asset_data?.id}`

                    return {
                      ...p,
                      id,
                      chain_data,
                      asset_data,
                      ...info,
                      symbols,
                      lpTokenBalance:
                        utils.formatUnits(
                          BigNumber.from(
                            lpTokenBalance ||
                            '0',
                          ),
                          18,
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
                                (
                                  adopted?.index === i ?
                                    adopted.decimals :
                                    local?.index === i ?
                                      local.decimals :
                                      18
                                ) ||
                                18,
                              )
                            )
                          ),
                    }
                  })
              )
            }
            else {
              setPools(
                pools ||
                []
              )
            }
          } catch (error) {
            console.log(
              '[getUserPools error]',
              {
                domain_id,
                address,
              },
              error,
            )
          }
        }
      }

      getData()
    },
    [sdk, address, poolsTrigger],
  )

  const getBalances = chain => {
    const getBalance = async (
      chain_id,
      contract_data,
    ) => {
      const {
        contract_address,
        next_asset,
        wrapable,
      } = { ...contract_data }

      const provider = rpcs?.[chain_id]

      if (
        address &&
        provider
      ) {
        const {
          symbol,
          image,
        } = {
          ...(
            assets_data
              .find(a =>
                (a?.contracts || [])
                  .findIndex(c =>
                    c?.chain_id === chain_id &&
                    equals_ignore_case(
                      c?.contract_address,
                      contract_address,
                    )
                  ) > -1
              )
          ),
        }

        const contracts =
          _.concat(
            wrapable &&
            {
              ...contract_data,
              contract_address: constants.AddressZero,
              symbol,
              image,
            },
            {
              ...contract_data,
            },
            next_asset &&
            {
              ...contract_data,
              ...next_asset,
            },
          )
          .filter(c => c?.contract_address)

        const balances = []

        for (const contract of contracts) {
          const {
            contract_address,
            decimals,
          } = { ...contract }

          let balance

          if (contract_address === constants.AddressZero) {
            balance =
              await provider
                .getBalance(
                  address,
                )
          }
          else {
            const contract =
              new Contract(
                contract_address,
                [
                  'function balanceOf(address owner) view returns (uint256)',
                ],
                provider,
              )

            balance =
              await contract
                .balanceOf(
                  address,
                )
          }

          if (
            balance ||
            !(
              (balances_data?.[`${chain_id}`] || [])
                .findIndex(c =>
                  equals_ignore_case(
                    c?.contract_address,
                    contract_address,
                  )
                ) > -1
            )
          ) {
            balances
              .push(
                {
                  ...contract,
                  amount:
                    balance &&
                    utils.formatUnits(
                      balance,
                      decimals ||
                      18,
                    ),
                }
              )
          }
        }

        if (balances.length > 0) {
          dispatch(
            {
              type: BALANCES_DATA,
              value: {
                [`${chain_id}`]: balances,
              },
            }
          )
        }
      }
    }

    if (page_visible) {
      const {
        chain_id,
      } = {
        ...(
          (chains_data || [])
            .find(c =>
              c?.id === chain
            )
        ),
      }

      const contracts_data =
        (pool_assets_data || [])
          .map(a => {
            const {
              contracts,
            } = { ...a }

            return {
              ...a,
              ...(
                (contracts || [])
                  .find(c =>
                    c?.chain_id === chain_id
                  )
              ),
            }
          })
          .filter(a => a?.contract_address)
          .map(a => {
            const {
              next_asset,
            } = { ...a };
            let {
              contract_address,
            } = {  ...a }

            contract_address = contract_address.toLowerCase()

            if (next_asset?.contract_address) {
              next_asset.contract_address = next_asset.contract_address.toLowerCase()
            }

            return {
              ...a,
              contract_address,
              next_asset,
            }
          })

      contracts_data
        .forEach(c =>
          getBalance(
            chain_id,
            c,
          )
        )
    }
  }

  const reset = async origin => {
    const reset_pool = origin !== 'address'

    if (reset_pool) {
      setPool(
        {
          ...pool,
        }
      )
    }

    setPoolsTrigger(
      moment()
        .valueOf()
    )

    const {
      chain,
    } = { ...pool }

    getBalances(chain)
  }

  const {
    chain,
    asset,
  } = { ...pool }

  const chain_data = (chains_data || [])
    .find(c =>
      c?.id === chain
    )

  const {
    explorer,
  } = { ...chain_data }
  const {
    url,
    contract_path,
  } = { ...explorer }

  const selected =
    !!(
      chain &&
      asset
    )

  const no_pool =
    selected &&
    (pool_assets_data || [])
      .findIndex(a =>
        a?.id === asset &&
        (a.contracts || [])
          .findIndex(a =>
            a?.chain_id === chain_data?.chain_id
          ) > -1
      ) < 0

  const pool_data = (pools_data || [])
    .find(p =>
      p?.chain_data?.id === chain &&
      p.asset_data?.id === asset
    )

  const {
    asset_data,
    contract_data,
    name,
    lpTokenAddress,
    apr,
    error,
  } = { ...pool_data }

  const pool_loading =
    selected &&
    !no_pool &&
    !error &&
    !pool_data

  return (
    <div className="mb-4">
      <div className="flex justify-center">
        <div className="w-full flex flex-col space-y-3.5 my-4 sm:my-12 mx-1 sm:mx-4">
          <Link
            href="/pools"
          >
          <a
            className="w-fit rounded border dark:border-slate-800 flex items-center text-slate-600 dark:text-slate-500 font-semibold space-x-1 py-0.5 px-2.5"
          >
            <TiArrowLeft
              size={18}
              className="-ml-0.5"
            />
            <span className="text-base">
              Back to pools
            </span>
          </a>
          </Link>
          <div className="space-y-6 sm:space-y-16">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between space-y-4 lg:space-y-0 sm:space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    {
                      chain_data?.image &&
                      (
                        <Image
                          src={chain_data.image}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      )
                    }
                    <span className="tracking-tighter text-xl sm:text-5xl font-semibold">
                      <span className="mr-1">
                        {chainName(chain_data)}
                      </span>
                      <span className="whitespace-nowrap">
                        {
                          (name || '')
                            .split('-')
                            .join(' ')
                        }
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
                    <span className="text-slate-400 dark:text-slate-200 text-base font-medium">
                      Reward APR
                    </span>
                    <div className="flex flex-col items-end space-y-1">
                      {
                        pool_data &&
                        (
                          [
                            // 'optimism',
                          ]
                          .includes(chain) ?
                            <div className="flex items-center space-x-2">
                              {
                                chain_data?.image &&
                                (
                                  <Image
                                    src={chain_data.image}
                                    width={16}
                                    height={16}
                                    className="rounded-full"
                                  />
                                )
                              }
                              <span className="uppercase text-xs font-medium">
                                {
                                  [
                                    // 'optimism',
                                  ]
                                  .includes(chain) ?
                                    chain
                                      .slice(
                                        0,
                                        2,
                                      ) :
                                    chain_data?.short_name
                                }
                              </span>
                            </div> :
                            <div className="h-0" />
                        )
                      }
                      <span className="text-lg sm:text-3xl font-semibold">
                        {
                          pool_data &&
                          !error ?
                            [
                              // 'optimism',
                            ]
                            .includes(chain) ?
                              !isNaN(apr) ?
                                <DecimalsFormat
                                  value={
                                    number_format(
                                      apr * 100,
                                      apr * 100 > 1 ?
                                        '0,0.00' :
                                        '0,0.000',
                                      true,
                                    )
                                  }
                                  max_decimals={
                                    apr * 100 > 100 ?
                                      0 :
                                      apr * 100 > 1 ?
                                        2 :
                                        6
                                  }
                                  suffix="%"
                                  className="uppercase"
                                /> :
                                'TBD' :
                              !isNaN(apr) ?
                                <DecimalsFormat
                                  value={
                                    number_format(
                                      apr * 100,
                                      apr * 100 > 1 ?
                                        '0,0.00' :
                                        '0,0.000',
                                      true,
                                    )
                                  }
                                  max_decimals={
                                    apr * 100 > 100 ?
                                      0 :
                                      apr * 100 > 1 ?
                                        2 :
                                        6
                                  }
                                  suffix="%"
                                  className="uppercase"
                                /> :
                                'TBD' :
                            selected &&
                            !no_pool &&
                            !error &&
                            (
                              pool_loading ?
                                <div className="mt-1">
                                  <TailSpin
                                    color={loader_color(theme)}
                                    width="24"
                                    height="24"
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
                  <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-100 dark:bg-opacity-50 rounded break-all tracking-tighter text-red-600 dark:text-red-400 text-base font-medium py-1.5 px-4">
                    {error.message}
                  </div>
                )
              }
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
              <div className="order-2 lg:order-1 lg:col-span-2">
                <Info
                  pool={pool}
                  user_pools_data={pools}
                  onSelect={p => setPool(p)}
                />
              </div>
              <Liquidity
                pool={pool}
                user_pools_data={pools}
                onFinish={() => {
                  setPoolsTrigger(
                    moment()
                      .valueOf()
                  )

                  getBalances(chain)
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
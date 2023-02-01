import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { create } from '@connext/sdk'
import { BigNumber, providers, utils } from 'ethers'
import Linkify from 'react-linkify'
import parse from 'html-react-parser'
import { MdClose } from 'react-icons/md'

import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import EnsProfile from '../ens-profile'
import Wallet from '../wallet'
import Chains from './chains'
import Theme from './theme'
import Copy from '../copy'
import { announcement as getAnnouncement, chains as getChains, assets as getAssets } from '../../lib/api/config'
import { assets_price } from '../../lib/api/assets'
import { ens as getEns } from '../../lib/api/ens'
import { ellipse, equals_ignore_case, sleep } from '../../lib/utils'
import { ANNOUNCEMENT_DATA, CHAINS_DATA, ASSETS_DATA, POOL_ASSETS_DATA, ENS_DATA, ASSET_BALANCES_DATA, POOLS_DATA, USER_POOLS_DATA, SDK, RPCS } from '../../reducers/types'

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
    ens,
    asset_balances,
    pools,
    rpc_providers,
    dev,
    wallet,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        pool_assets: state.pool_assets,
        ens: state.ens,
        asset_balances: state.asset_balances,
        pools: state.pools,
        rpc_providers: state.rpc_providers,
        dev: state.dev,
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
    ens_data,
  } = { ...ens }
  const {
    asset_balances_data,
  } = { ...asset_balances }
  const {
    pools_data,
  } = { ...pools }
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
    default_chain_id,
    chain_id,
    provider,
    web3_provider,
    address,
    signer,
  } = { ...wallet_data }

  const router = useRouter()
  const {
    pathname,
  } = { ...router }

  const [hiddenStatus, setHiddenStatus] = useState(false)
  const [currentAddress, setCurrentAddress] = useState(null)

  // annoncement
  useEffect(
    () => {
      const getData = async () => {
        dispatch(
          {
            type: ANNOUNCEMENT_DATA,
            value: await getAnnouncement(),
          }
        )
      }

      getData()

      const interval =
        setInterval(
          () =>
            getData(),
          1 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [],
  )

  // chains
  useEffect(
    () => {
      const getData = async () => {
        const response = await getChains()

        if (Array.isArray(response)) {
          dispatch(
            {
              type: CHAINS_DATA,
              value: response,
            }
          )
        }
      }

      getData()
    },
    [],
  )

  // assets
  useEffect(
    () => {
      const getData = async () => {
        const response = await getAssets()

        if (Array.isArray(response)) {
          dispatch(
            {
              type: ASSETS_DATA,
              value: response,
            }
          )

          dispatch(
            {
              type: POOL_ASSETS_DATA,
              value:
                response
                  .map(d => {
                    const {
                      contracts,
                    } = { ...d }

                    return {
                      ...d,
                      contracts:
                        (contracts || [])
                          .filter(c =>
                            c?.is_pool
                          ),
                    }
                  })
                  .filter(d =>
                    d.contracts.length > 0 &&
                    !d.disabled
                  ),
            }
          )
        }
      }

      getData()
    },
    [],
  )

  // price
  useEffect(
    () => {
      const getData = async is_interval => {
        if (
          chains_data &&
          assets_data
        ) {
          let updated_ids =
            is_interval ?
              [] :
              assets_data
                .filter(a =>
                  typeof a.price === 'number'
                )
                .map(a => a.id)

          if (updated_ids.length < assets_data.length) {
            let updated = false

            for (const chain_data of chains_data) {
              const {
                chain_id,
              } = { ...chain_data }

              if (chain_id) {
                const addresses =
                  assets_data
                    .filter(a =>
                      !updated_ids.includes(a?.id) &&
                      (a?.contracts || [])
                        .findIndex(c =>
                          c?.chain_id === chain_id &&
                          c.contract_address
                        ) > -1
                    )
                    .map(a =>
                      a.contracts
                        .find(c =>
                          c?.chain_id === chain_id
                        ).contract_address
                    )

                if (addresses.length > 0) {
                  const response =
                    await assets_price(
                      {
                        chain_id,
                        addresses,
                      },
                    )

                  if (Array.isArray(response)) {
                    response
                      .forEach(t => {
                        const asset_index =
                          assets_data
                            .findIndex(a =>
                              a?.id &&
                              (a.contracts || [])
                                .findIndex(c =>
                                  c?.chain_id === t?.chain_id &&
                                  equals_ignore_case(
                                    c.contract_address,
                                    t?.contract_address,
                                  )
                                ) > -1
                            )

                        if (asset_index > -1) {
                          const asset = assets_data[asset_index]

                          asset.price =
                            t?.price ||
                            asset.price ||
                            0

                          assets_data[asset_index] = asset

                          updated_ids =
                            _.uniq(
                              _.concat(
                                updated_ids,
                                asset.id,
                              )
                            )

                          updated = true
                        }
                      })
                  }
                }
              }
            }

            if (updated) {
              dispatch(
                {
                  type: ASSETS_DATA,
                  value: _.cloneDeep(assets_data),
                }
              )
            }
          }
        }
      }

      getData()

      const interval =
        setInterval(
          () =>
            getData(true),
          5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [chains_data, assets_data],
  )

  // rpcs
  useEffect(
    () => {
      const init = async => {
        if (chains_data) {
          const _rpcs = {}

          for (const chain_data of chains_data) {
            const {
              disabled,
              chain_id,
              provider_params,
            } = { ...chain_data }
            let {
              rpc_urls,
            } = { ...chain_data }

            if (!disabled) {
              const {
                rpcUrls,
              } = {
                ...(
                  _.head(provider_params)
                ),
              }
   
              rpc_urls =
                (
                  Array.isArray(rpc_urls) ?
                    rpc_urls :
                    (
                      rpcUrls ||
                      []
                    )
                )
                .filter(url => url)

              const provider =
                new providers.FallbackProvider(
                  rpc_urls
                    .map((url, i) => {
                      return {
                        provider:
                          new providers.StaticJsonRpcProvider(
                            url,
                            chain_id,
                          ),
                        priority: i + 1,
                        stallTimeout: 1000,
                      }
                    }),
                  rpc_urls.length / 3,
                )

              _rpcs[chain_id] = provider
            }
          }

          if (!rpcs) {
            dispatch(
              {
                type: RPCS,
                value: _rpcs,
              }
            )
          }
        }
      }

      init()
    },
    [chains_data],
  )

  // sdk
  useEffect(
    () => {
      const init = async () => {
        if (
          !sdk &&
          chains_data &&
          assets_data &&
          assets_data
            .findIndex(a =>
              typeof a.price !== 'number'
            ) < 0
        ) {
          const chains_config = {}

          for (const chain_data of chains_data) {
            const {
              chain_id,
              domain_id,
              provider_params,
              disabled,
            } = { ...chain_data }
            let {
              rpc_urls,
            } = { ...chain_data }

            if (!disabled) {
              const {
                rpcUrls,
              } = {
                ...(
                  _.head(provider_params)
                ),
              }
   
              rpc_urls =
                (
                  Array.isArray(rpc_urls) ?
                    rpc_urls :
                    (
                      rpcUrls ||
                      []
                    )
                )
                .filter(url => url)

              if (domain_id) {
                chains_config[domain_id] = {
                  providers: rpc_urls,
                  assets:
                    assets_data
                      .filter(a =>
                        (a?.contracts || [])
                          .findIndex(c =>
                            c?.chain_id === chain_id
                          ) > -1
                      )
                      .map(a => {
                        const {
                          contracts,
                        } = { ...a }
                        let {
                          name,
                          symbol,
                        } = { ...a }

                        const contract_data = contracts
                          .find(c =>
                            c?.chain_id === chain_id
                          )
                        const {
                          contract_address,
                        } = { ...contract_data }

                        symbol =
                          contract_data?.symbol ||
                          symbol

                        name =
                          name ||
                          symbol

                        return {
                          name,
                          symbol,
                          address: contract_address,
                        }
                      }),
                }
              }
            }
          }

          const sdkConfig = {
            chains: chains_config,
            logLevel: 'info',
            network: process.env.NEXT_PUBLIC_NETWORK,
            environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
          }

          console.log(
            '[SDK config]',
            sdkConfig,
          )

          dispatch(
            {
              type: SDK,
              value:
                await create(
                  sdkConfig,
                ),
            }
          )
        }
      }

      init()
    },
    [chains_data, assets_data, sdk],
  )

  // sdk
  useEffect(
    () => {
      const update = async () => {
        if (
          sdk &&
          address &&
          !equals_ignore_case(
            address,
            currentAddress,
          )
        ) {
          if (sdk.sdkBase) {
            await sdk.sdkBase
              .changeSignerAddress(
                address,
              )
          }

          if (sdk.sdkRouter) {
            await sdk.sdkRouter
              .changeSignerAddress(
                address,
              )
          }

          if (sdk.sdkPool) {
            await sdk.sdkPool
              .changeSignerAddress(
                address,
              )
          }

          setCurrentAddress(address)

          console.log(
            '[SDK change signer address]',
            address,
          )

          dispatch(
            {
              type: SDK,
              value: sdk,
            }
          )
        }
      }

      update()
    },
    [sdk, provider, web3_provider, address, signer, currentAddress],
  )

  // assets balances
  useEffect(
    () => {
      const getData = async () => {
        if (
          sdk &&
          chains_data &&
          (assets_data || [])
            .findIndex(a =>
              typeof a.price !== 'number'
            ) < 0
        ) {
          try {
            const response =
              await sdk.sdkUtils
                .getRoutersData()

            if (Array.isArray(response)) {
              const data =
                _.groupBy(
                  response
                    .map(l => {
                      const {
                        domain,
                        adopted,
                        local,
                        balance,
                      } = { ...l }

                      const chain_data = chains_data
                        .find(c =>
                          c?.domain_id === domain
                        )
                      const {
                        chain_id,
                      } = { ...chain_data }

                      const asset_data = assets_data
                        .find(a =>
                          (a?.contracts || [])
                            .findIndex(c =>
                              c?.chain_id === chain_id &&
                              [
                                adopted,
                                local,
                              ].findIndex(_a =>
                                equals_ignore_case(
                                  c?.contract_address,
                                  _a,
                                )
                              ) > -1
                            ) > -1
                        )

                      const amount =
                        BigInt(
                          balance ||
                          0
                        )
                        .toString()

                      return {
                        ...l,
                        chain_id,
                        chain_data,
                        contract_address: local,
                        asset_data,
                        amount,
                      }
                    }),
                  'chain_id',
                )

              dispatch(
                {
                  type: ASSET_BALANCES_DATA,
                  value: data,
                }
              )
            }
          } catch (error) {}
        }
      }

      getData()

      const interval =
        setInterval(
          () =>
            getData(),
          1 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [sdk, chains_data, assets_data],
  )

  // ens
  useEffect(
    () => {
      const getData = async () => {
        if (
          chains_data &&
          asset_balances_data &&
          chains_data
            .filter(c =>
              !c?.disabled
            )
            .length <=
          Object.keys(asset_balances_data).length
        ) {
          const addresses =
            _.uniq(
              Object.values(asset_balances_data)
                .flatMap(a => a)
                .map(a => a?.router_address)
                .filter(a =>
                  a &&
                  !ens_data?.[a]
                )
            )

          const ens_data = await getEns(addresses)

          if (ens_data) {
            dispatch(
              {
                type: ENS_DATA,
                value: ens_data,
              }
            )
          }
        }
      }

      getData()
    },
    [chains_data, asset_balances_data],
  )

  // pools
  useEffect(
    () => {
      const getPoolData = async (
        chain_data,
        asset_data,
      ) => {
        const {
          chain_id,
          domain_id,
        } = { ...chain_data }

        const {
          contracts,
        } = { ...asset_data }

        const contract_data = (contracts || [])
          .find(c =>
            c?.chain_id === chain_id
          )
        const {
          contract_address,
        } = { ...contract_data }

        if (contract_address) {
          let data

          const id = `${chain_data.id}_${asset_data.id}`

          try {
            console.log(
              '[getPool]',
              {
                domain_id,
                contract_address,
              },
            )

            const pool =
              await sdk.sdkPool
                .getPool(
                  domain_id,
                  contract_address,
                )

            console.log(
              '[pool]',
              {
                domain_id,
                contract_address,
                pool,
              },
            )

            const {
              lpTokenAddress,
              adopted,
              local,
            } = { ...pool }
            let {
              name,
              symbol,
            } = { ...pool }

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

              pool.name = name
              pool.symbol = symbol
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

                pool.symbol = symbol
              }
            }

            if (name?.startsWith(WRAPPED_PREFIX)) {
              name =
                name
                  .replace(
                    WRAPPED_PREFIX,
                    '',
                  )

              pool.name = name
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
                typeof balance === 'string' &&
                balance.includes('.') ?
                  balance :
                  utils.formatUnits(
                    BigNumber.from(
                      balance ||
                      '0'
                    ),
                    decimals ||
                    18,
                  )

              pool.adopted = adopted
            }

            if (local) {
              const {
                balance,
                decimals,
              } = { ...local }

              local.balance =
                typeof balance === 'string' &&
                balance.includes('.') ?
                  balance :
                  utils.formatUnits(
                    BigNumber.from(
                      balance ||
                      '0'
                    ),
                    decimals ||
                    18,
                  )

              pool.local = local
            }

            let supply

            if (lpTokenAddress) {
              await sleep(1.5 * 1000)

              console.log(
                '[getTokenSupply]',
                {
                  domain_id,
                  lpTokenAddress,
                },
              )

              try {
                supply =
                  await sdk.sdkPool
                    .getTokenSupply(
                      domain_id,
                      lpTokenAddress,
                    )

                supply =
                  utils.formatUnits(
                    BigNumber.from(
                      supply
                    ),
                    18,
                  )

                console.log(
                  '[LPTokenSupply]',
                  {
                    domain_id,
                    lpTokenAddress,
                    supply,
                  },
                )
              } catch (error) {
                console.log(
                  '[getTokenSupply error]',
                  {
                    domain_id,
                    lpTokenAddress,
                  },
                  error,
                )
              }
            }

            let stats

            if (
              pool &&
              (
                is_staging/* ||
                process.env.NEXT_PUBLIC_ENVIRONMENT === 'production'*/
              )
            ) {
              await sleep(1.5 * 1000)

              console.log(
                '[getYieldData]',
                {
                  domain_id,
                  contract_address,
                },
              )

              try {
                stats =
                  await sdk.sdkPool
                    .getYieldData(
                      domain_id,
                      contract_address,
                    )

                console.log(
                  '[yieldData]',
                  {
                    domain_id,
                    contract_address,
                    stats,
                  },
                )
              } catch (error) {
                console.log(
                  '[getYieldData error]',
                  {
                    domain_id,
                    contract_address,
                  },
                  error,
                )
              }
            }

            const {
              volumeFormatted,
            } = { ...stats }

            let rate = 1

            if (
              pool &&
              !rate
            ) {
              console.log(
                '[getVirtualPrice]',
                {
                  domain_id,
                  contract_address,
                },
              )

              try {
                rate =
                  await sdk.sdkPool
                    .getVirtualPrice(
                      domain_id,
                      contract_address,
                    )

                rate =
                  Number(
                    utils.formatUnits(
                      BigNumber.from(
                        rate ||
                        '0'
                      ),
                      18,
                    )
                  )

                console.log(
                  '[virtualPrice]',
                  {
                    domain_id,
                    contract_address,
                    rate,
                  },
                )
              } catch (error) {
                console.log(
                  '[getVirtualPrice error]',
                  {
                    domain_id,
                    contract_address,
                  },
                  error,
                )
              }
            }

            let tvl

            if (
              [
                'string',
                'number',
              ].includes(typeof supply) ||
              (
                adopted?.balance &&
                local?.balance
              )
            ) {
              const {
                price,
              } = {
                ...(
                  (assets_data || [])
                    .find(a =>
                      a?.id === asset_data.id
                    )
                ),
              }

              tvl =
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
            }

            if (
              equals_ignore_case(
                pool?.domainId,
                domain_id,
              )
            ) {
              data = {
                ...pool,
                ...stats,
                id,
                chain_id,
                chain_data,
                asset_data,
                contract_data,
                symbols,
                supply:
                  supply ||
                  pool?.supply,
                volume: volumeFormatted,
                rate,
                tvl,
              }

              if (
                [
                  // 'optimism',
                ]
                .includes(chain_data.id)
              ) {
                const totalTokens = 250000
                const totalBlocks = 657436
                const numPools = 2
                const symbol =
                  contract_data.symbol ||
                  asset_data.symbol

                try {
                  console.log(
                    '[getLiquidityMiningAprPerPool]',
                    {
                      totalTokens,
                      totalBlocks,
                      numPools,
                      symbol,
                      tvl,
                    },
                  )

                  const apr =
                    await sdk.sdkPool
                      .getLiquidityMiningAprPerPool(
                        totalTokens,
                        totalBlocks,
                        numPools,
                        symbol,
                        tvl,
                      )

                  console.log(
                    '[liquidityMiningAprPerPool]',
                    {
                      totalTokens,
                      totalBlocks,
                      numPools,
                      symbol,
                      tvl,
                      apr,
                    },
                  )

                  data = {
                    ...data,
                    apr,
                  }
                } catch (error) {
                  console.log(
                    '[getLiquidityMiningAprPerPool error]',
                    {
                      totalTokens,
                      totalBlocks,
                      numPools,
                      symbol,
                      tvl,
                    },
                    error,
                  )
                }
              }
            }
            else {
              data =
                (pools_data || [])
                  .find(p =>
                    equals_ignore_case(
                      p?.id,
                      id,
                    )
                  )
            }
          } catch (error) {
            console.log(
              '[getPool error]',
              {
                domain_id,
                contract_address,
              },
              error,
            )

            data =
              (pools_data || [])
                .find(p =>
                  equals_ignore_case(
                    p?.id,
                    id,
                  )
                ) ||
              {
                id: `${chain_data.id}_${asset_data.id}`,
                chain_id,
                chain_data,
                asset_data,
                contract_data,
                error,
              }
          }

          if (data) {
            dispatch(
              {
                type: POOLS_DATA,
                value: data,
              }
            )
          }
        }
      }

      const getChainData = async chain_data => {
        if (
          sdk &&
          chain_data
        ) {
          pool_assets_data
            .forEach(a =>
              getPoolData(
                chain_data,
                a,
              )
            )
        }
      }

      const getData = async () => {
        if (
          sdk &&
          chains_data &&
          pool_assets_data
        ) {
          chains_data
            .forEach(c =>
              getChainData(c)
            )
        }
      }

      getData()

      const interval =
        setInterval(
          () =>
            getData(),
          1 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [sdk, chains_data, pool_assets_data],
  )

  // user pools
  useEffect(
    () => {
      const getChainData = async chain_data => {
        const {
          id,
          chain_id,
          domain_id,
        } = { ...chain_data }

        if (id) {
          let data

          try {
            console.log(
              '[getUserPools]',
              {
                domain_id,
                address,
              },
            )

            const response =
              await sdk.sdkPool
                .getUserPools(
                  domain_id,
                  address,
                )

            console.log(
              '[userPools]',
              {
                domain_id,
                address,
                response,
              },
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

                      if (name?.startsWith(WRAPPED_PREFIX)) {
                        name =
                          name
                            .replace(
                              WRAPPED_PREFIX,
                              '',
                            )

                        info.name = name
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
                          typeof balance === 'string' &&
                          balance.includes('.') ?
                            balance :
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
                          typeof balance === 'string' &&
                          balance.includes('.') ?
                            balance :
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

                      const asset_data = pool_assets_data
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
                    }),
                )
                .filter(d => d)
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

          dispatch(
            {
              type: USER_POOLS_DATA,
              value: {
                [id]: data,
              },
            }
          )
        }
      }

      const getData = async () => {
        if (
          sdk &&
          chains_data &&
          pool_assets_data
        ) {
          if (address) {
            chains_data
              .forEach(c =>
                getChainData(c)
              )
          }
          else {
            dispatch(
              {
                type: USER_POOLS_DATA,
                value: {},
              }
            )
          }
        }
      }

      getData()

      const interval =
        setInterval(
          () =>
            getData(),
          1 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [sdk, chains_data, pool_assets_data, address],
  )

  const is_staging =
    process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' ||
    process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  return (
    <>
      <div className="navbar">
        <div className="navbar-inner w-full sm:h-20 flex xl:grid xl:grid-flow-row xl:grid-cols-3 items-center justify-between gap-4">
          <div className="flex items-center">
            <Logo />
            <DropdownNavigations
              address={
                web3_provider &&
                address
              }
            />
          </div>
          <div className="flex items-center justify-center">
            <Navigations
              address={
                web3_provider &&
                address
              }
            />
          </div>
          <div className="flex items-center justify-end">
            {
              web3_provider &&
              (
                <Chains
                  chain_id={chain_id}
                />
              )
            }
            {
              web3_provider &&
              address &&
              (
                <div className="hidden sm:flex lg:hidden xl:flex flex-col space-y-0.5 mx-2">
                  <EnsProfile
                    address={address}
                    fallback={
                      address &&
                      (
                        <Copy
                          value={address}
                          title={<span className="text-slate-400 dark:text-slate-200 text-sm">
                            <span className="xl:hidden">
                              {ellipse(
                                address,
                                6,
                              )}
                            </span>
                            <span className="hidden xl:block">
                              {ellipse(
                                address,
                                6,
                              )}
                            </span>
                          </span>}
                        />
                      )
                    }
                  />
                </div>
              )
            }
            <div className="mx-2">
              <Wallet
                mainController={true}
                connectChainId={default_chain_id}
              />
            </div>
            <Theme />
          </div>
        </div>
      </div>
      {
        !hiddenStatus &&
        process.env.NEXT_PUBLIC_STATUS_MESSAGE &&
        (
          <div className="w-full bg-slate-100 dark:bg-slate-800 dark:bg-opacity-50 overflow-x-auto flex items-center py-2 sm:py-3 px-2 sm:px-4">
            <div className="flex flex-wrap items-centertext-blue-500 dark:text-white text-2xs xl:text-sm font-medium space-x-1.5 xl:space-x-2 mx-auto">
              <span>
                <Linkify>
                  {parse(
                    process.env.NEXT_PUBLIC_STATUS_MESSAGE
                  )}
                </Linkify>
              </span>
              <button
                onClick={() => setHiddenStatus(true)}
                className="hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full mt-0.5 p-1 ml-auto"
              >
                <MdClose
                  size={12}
                />
              </button>
            </div>
          </div>
        )
      }
    </>
  )
}
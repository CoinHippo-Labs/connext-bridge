import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { create } from '@connext/sdk'
import { Contract, providers, constants, utils } from 'ethers'
import Linkify from 'react-linkify'
import parse from 'html-react-parser'
import { TbLogout } from 'react-icons/tb'

import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import EnsProfile from '../ens-profile'
import Wallet from '../wallet'
import Chains from './chains'
import Theme from './theme'
import Menus from './menus'
import Copy from '../copy'
import Image from '../image'
import { getChains, getAssets } from '../../lib/api/config'
import { assetsPrice } from '../../lib/api/assets'
import { ens as getEns } from '../../lib/api/ens'
import { daily_swap_tvl, daily_swap_volume } from '../../lib/api/metrics'
import { getChain } from '../../lib/object/chain'
import { getAsset, getChainContracts } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { getPool } from '../../lib/object/pool'
import { getBalance } from '../../lib/object/balance'
import { split, toArray, ellipse, equalsIgnoreCase, sleep } from '../../lib/utils'
import { STATUS_MESSAGE, CHAINS_DATA, GAS_TOKENS_PRICE_DATA, ASSETS_DATA, POOL_ASSETS_DATA, ENS_DATA, ROUTER_ASSET_BALANCES_DATA, POOLS_DATA, USER_POOLS_DATA, POOLS_DAILY_STATS_DATA, SDK, RPCS, BALANCES_DATA } from '../../reducers/types'

const is_staging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' || process.env.NEXT_PUBLIC_APP_URL?.includes('staging')

export default () => {
  const dispatch = useDispatch()
  const {
    preferences,
    chains,
    assets,
    pool_assets,
    gas_tokens_price,
    ens,
    router_asset_balances,
    pools,
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
        gas_tokens_price: state.gas_tokens_price,
        ens: state.ens,
        router_asset_balances: state.router_asset_balances,
        pools: state.pools,
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
    status_message,
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
    gas_tokens_price_data,
  } = { ...gas_tokens_price }
  const {
    ens_data,
  } = { ...ens }
  const {
    router_asset_balances_data,
  } = { ...router_asset_balances }
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
    browser_provider,
    signer,
    address,
  } = { ...wallet_data }
  const {
    balances_data,
    get_balances_data,
  } = { ...balances }

  const router = useRouter()
  const {
    pathname,
    asPath,
  } = { ...router }

  const [currentAddress, setCurrentAddress] = useState(null)

  // status
  useEffect(
    () => {
      const status_message = process.env.STATUS_MESSAGE || process.env.NEXT_PUBLIC_STATUS_MESSAGE

      if (status_message) {
        dispatch(
          {
            type: STATUS_MESSAGE,
            value: status_message,
          }
        )
      }
    },
    [process.env.STATUS_MESSAGE, process.env.NEXT_PUBLIC_STATUS_MESSAGE],
  )

  // chains
  useEffect(
    () => {
      const getData = async () => {
        dispatch(
          {
            type: CHAINS_DATA,
            value: toArray(await getChains()),
          }
        )
      }

      getData()
    },
    [],
  )

  // assets
  useEffect(
    () => {
      const getData = async () => {
        const response = toArray(await getAssets())

        dispatch(
          {
            type: ASSETS_DATA,
            value: response,
          }
        )

        dispatch(
          {
            type: POOL_ASSETS_DATA,
            value: getAsset(null, response, undefined, undefined, undefined, true, false, true, true),
          }
        )
      }

      getData()
    },
    [],
  )

  // assets price
  useEffect(
    () => {
      const getData = async is_interval => {
        if (page_visible && assets_data) {
          let updated_ids = assets_data.filter(a => !is_interval && typeof a.price === 'number').map(a => a.id)

          if (updated_ids.length < assets_data.length) {
            let updated = false

            const assets = assets_data.filter(a => !updated_ids.includes(a.id)).map(a => a.id)

            if (assets.length > 0) {
              const response = toArray(await assetsPrice({ assets }))

              response.forEach(d => {
                const index = assets_data.findIndex(a => equalsIgnoreCase(a.id, d?.asset_id))

                if (index > -1) {
                  const asset_data = assets_data[index]
                  asset_data.price = d?.price || asset_data.price || 0
                  assets_data[index] = asset_data

                  updated_ids = _.uniq(_.concat(updated_ids, asset_data.id))
                  updated = true
                }
              })
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

          const pool_assets_data = getAsset(null, assets_data, undefined, undefined, undefined, true, false, true, true)

          if (pool_assets_data.findIndex(d => !updated_ids.includes(d?.id)) < 0) {
            dispatch(
              {
                type: POOL_ASSETS_DATA,
                value: pool_assets_data,
              }
            )
          }
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(true),
          5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [page_visible, assets_data],
  )

  // gas tokens price
  useEffect(
    () => {
      const getData = async is_interval => {
        if (page_visible && chains_data) {
          const updated_ids = toArray(gas_tokens_price_data).filter(d => !is_interval && typeof d.price === 'number').map(d => d.asset_id)
          const gas_tokens = toArray(chains_data.map(c => _.head(c.provider_params)?.nativeCurrency?.symbol), 'lower')

          if (updated_ids.length < gas_tokens.length) {
            const assets = gas_tokens.filter(t => !updated_ids.includes(t))

            if (assets.length > 0) {
              const response = toArray(await assetsPrice({ assets }))

              let data = _.cloneDeep(gas_tokens_price_data)

              if (data) {
                response.forEach(d => {
                  const index = toArray(data).findIndex(_d => _d?.asset_id === d?.asset_id)

                  if (index > -1) {
                    data[index] = d
                  }
                  else {
                    data.push(d)
                  }
                })
              }
              else {
                data = response
              }

              dispatch(
                {
                  type: GAS_TOKENS_PRICE_DATA,
                  value: data,
                }
              )
            }
          }
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(true),
          5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [page_visible, chains_data, gas_tokens_price_data],
  )

  // rpcs
  useEffect(
    () => {
      const createRpcProvider = (
        url,
        chain_id,
      ) =>
        new providers.StaticJsonRpcProvider(url, chain_id ? Number(chain_id) : undefined)

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
              rpc_urls = /*rpc_urls || */toArray(_.head(provider_params)?.rpcUrls)

              _rpcs[chain_id] =
                rpc_urls.length > 1 ?
                  new providers.FallbackProvider(
                    rpc_urls.map((url, i) => {
                      return {
                        priority: i + 1,
                        provider: createRpcProvider(url, chain_id),
                        stallTimeout: 1000,
                      }
                    }),
                    rpc_urls.length / 3,
                  ) :
                  createRpcProvider(_.head(rpc_urls), chain_id)
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
        if (!sdk && chains_data && assets_data && assets_data.findIndex(a => typeof a.price !== 'number') < 0) {
          const chains = {}

          for (const chain_data of chains_data) {
            const {
              disabled,
              chain_id,
              domain_id,
              provider_params,
            } = { ...chain_data }
            let {
              rpc_urls,
            } = { ...chain_data }

            if (!disabled && domain_id) {
              rpc_urls = rpc_urls || toArray(_.head(provider_params)?.rpcUrls)

              chains[domain_id] = {
                providers: rpc_urls,
                assets:
                  getAsset(null, assets_data, chain_id, undefined, undefined, true, false, false, true)
                    .map(a => {
                      const {
                        contracts,
                      } = { ...a }
                      let {
                        name,
                        symbol,
                      } = { ...a }

                      const contract_data = getContract(chain_id, contracts)

                      const {
                        contract_address,
                      } = { ...contract_data }

                      symbol = contract_data?.symbol || symbol
                      name = name || symbol

                      return {
                        name,
                        symbol,
                        address: contract_address,
                      }
                    }),
              }
            }
          }

          const sdkConfig = {
            network: process.env.NEXT_PUBLIC_NETWORK,
            environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
            logLevel: 'info',
            chains,
          }

          console.log(
            '[SDK config]',
            sdkConfig,
          )

          dispatch(
            {
              type: SDK,
              value: await create(sdkConfig),
            }
          )
        }
      }

      init()
    },
    [chains_data, assets_data, sdk],
  )

  // sdk change signer
  useEffect(
    () => {
      const update = async () => {
        if (sdk && address && !equalsIgnoreCase(address, currentAddress)) {
          if (sdk.sdkBase) {
            await sdk.sdkBase.changeSignerAddress(address)
          }

          if (sdk.sdkRouter) {
            await sdk.sdkRouter.changeSignerAddress(address)
          }

          if (sdk.sdkPool) {
            await sdk.sdkPool.changeSignerAddress(address)
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
    [sdk, provider, browser_provider, signer, address, currentAddress],
  )

  // router asset balances
  useEffect(
    () => {
      const getData = async () => {
        if (page_visible && sdk && chains_data && assets_data && assets_data.findIndex(a => typeof a.price !== 'number') < 0) {
          try {
            const response = toArray(await sdk.sdkUtils.getRoutersData())

            const data =
              _.groupBy(
                response.map(d => {
                  const {
                    domain,
                    adopted,
                    local,
                    balance,
                  } = { ...d }

                  const chain_data = getChain(domain, chains_data)

                  const {
                    chain_id,
                  } = { ...chain_data }

                  const asset_data =
                    getAsset(null, assets_data, chain_id, undefined, undefined, false, false, false, true)
                      .find(a =>
                        getContract(adopted, toArray(a?.contracts), chain_id) ||
                        getContract(local, toArray(a?.contracts), chain_id)
                      )

                  return {
                    ...d,
                    chain_id,
                    chain_data,
                    asset_data,
                    contract_address: local,
                    amount: BigInt(balance || '0').toString(),
                  }
                }),
                'chain_id',
              )

            dispatch(
              {
                type: ROUTER_ASSET_BALANCES_DATA,
                value: data,
              }
            )
          } catch (error) {}
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(),
          1 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [page_visible, sdk, chains_data, assets_data],
  )

  // ens
  useEffect(
    () => {
      const getData = async () => {
        if (
          chains_data && router_asset_balances_data &&
          getChain(null, chains_data, true, false, false, undefined, true).length <= Object.keys(router_asset_balances_data).length
        ) {
          const addresses =
            _.uniq(
              Object.values(router_asset_balances_data)
                .flatMap(a => a)
                .map(a => a?.router_address)
                .filter(a => a && !ens_data?.[a])
            )

          const _ens_data = await getEns(addresses)

          if (_ens_data) {
            dispatch(
              {
                type: ENS_DATA,
                value: _ens_data,
              }
            )
          }
        }
      }

      getData()
    },
    [chains_data, router_asset_balances_data],
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

        const contract_data = getContract(chain_id, contracts)

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

            const pool = _.cloneDeep(await sdk.sdkPool.getPool(domain_id, contract_address))

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
              symbol,
            } = { ...pool }

            let supply, stats, tvl

            if (adopted) {
              const {
                balance,
                decimals,
              } = { ...adopted }

              adopted.balance = utils.formatUnits(BigInt(balance || '0'), decimals || 18)

              pool.adopted = adopted
            }

            if (local) {
              const {
                balance,
                decimals,
              } = { ...local }

              local.balance = utils.formatUnits(BigInt(balance || '0'), decimals || 18)

              pool.local = local
            }

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
                supply = await sdk.sdkPool.getTokenSupply(domain_id, lpTokenAddress)

                supply = utils.formatUnits(BigInt(supply || '0'), 18)

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

            if (pool && (is_staging || process.env.NEXT_PUBLIC_ENVIRONMENT === 'production')) {
              await sleep(1.5 * 1000)

              const number_of_days = 7

              console.log(
                '[getYieldData]',
                {
                  domain_id,
                  contract_address,
                  number_of_days,
                },
              )

              try {
                stats = _.cloneDeep(await sdk.sdkPool.getYieldData(domain_id, contract_address, number_of_days))

                console.log(
                  '[yieldData]',
                  {
                    domain_id,
                    contract_address,
                    number_of_days,
                    stats,
                  },
                )
              } catch (error) {
                console.log(
                  '[getYieldData error]',
                  {
                    domain_id,
                    contract_address,
                    number_of_days,
                  },
                  error,
                )
              }
            }

            let {
              price,
            } = { ...getAsset(asset_data.id, assets_data) }

            price = price || 0

            if (['string', 'number'].includes(typeof supply) || (adopted?.balance && local?.balance)) {
              tvl = Number(supply || _.sum(toArray(_.concat(adopted, local)).map(a => Number(a.balance)))) * price
            }

            if (equalsIgnoreCase(pool?.domainId, domain_id)) {
              const {
                liquidity,
                volumeFormatted,
                fees,
              } = { ...stats }

              data = {
                ...pool,
                ...stats,
                id,
                chain_id,
                chain_data,
                asset_data,
                contract_data,
                symbols: split(symbol, 'normal', '-'),
                supply: supply || pool?.supply,
                volume: volumeFormatted,
                tvl,
                rate: 1,
                liquidity_value: (liquidity ||  0) * price,
                volume_value: (volumeFormatted || 0) * price,
                fees_value: (fees || 0) * price,
              }
            }
            else {
              data = getPool(id, pools_data)
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
              getPool(id, pools_data) ||
              {
                id,
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

      const getChainData = async chain_data => pool_assets_data.forEach(a => getPoolData(chain_data, a))

      const getData = async () => {
        if (page_visible && sdk && chains_data && pool_assets_data && pool_assets_data.findIndex(a => typeof a?.price !== 'number') < 0 && !['/', '/[bridge]'].includes(pathname)) {
          chains_data.filter(c => !pathname?.includes('/[') || asPath?.includes(c.id)).forEach(c => getChainData(c))
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(),
          1 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [page_visible, sdk, chains_data, pool_assets_data, pathname],
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

            const response = _.cloneDeep(await sdk.sdkPool.getUserPools(domain_id, address))

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

                        adopted.balance = utils.formatUnits(BigInt(balance || '0'), decimals || 18)

                        info.adopted = adopted
                      }

                      if (local) {
                        const {
                          balance,
                          decimals,
                        } = { ...local }

                        local.balance = utils.formatUnits(BigInt(balance || '0'), decimals || 18)

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
                        poolTokenBalances: toArray(poolTokenBalances).map((b, i) => Number(utils.formatUnits(BigInt(b || '0'), adopted?.index === i ? adopted.decimals : local?.index === i ? local.decimals : 18))),
                      }
                    }),
                  )
                )
                .filter(d => d.asset_data)
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
        if (page_visible && sdk && chains_data && pool_assets_data && ['/pools'].includes(pathname)) {
          if (address) {
            chains_data.filter(c => !pathname.includes('/[') || asPath?.includes(c.id)).forEach(c => getChainData(c))
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
          () => getData(),
          1 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [page_visible, sdk, chains_data, pool_assets_data, address, pathname],
  )

  // pools daily stats
  useEffect(
    () => {
      const getData = async () => {
        const tvls = toArray(await daily_swap_tvl())
        const volumes = toArray(await daily_swap_volume())

        dispatch(
          {
            type: POOLS_DAILY_STATS_DATA,
            value: {
              tvls,
              volumes,
            },
          }
        )
      }

      getData()

      const interval =
        setInterval(
          () => getData(),
          5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [],
  )

  // balances
  useEffect(
    () => {
      const getMyBalance = async (
        chain_id,
        contract_data,
      ) => {
        const {
          contract_address,
          next_asset,
          wrapable,
        } = { ...contract_data }

        const provider = rpcs[chain_id]

        if (provider) {
          const contracts_data =
            toArray(
              _.concat(
                { ...contract_data },
                wrapable &&
                { ...contract_data, contract_address: constants.AddressZero },
                next_asset &&
                { ...contract_data, ...next_asset },
              )
            )
            .filter(c => c.contract_address)

          const balances = []

          for (const contract_data of contracts_data) {
            const {
              contract_address,
              decimals,
            } = { ...contract_data }

            let balance

            switch (contract_address) {
              case constants.AddressZero:
                balance = await provider.getBalance(address)
                break
              default:
                const contract = new Contract(contract_address, ['function balanceOf(address owner) view returns (uint256)'], provider)
                balance = await contract.balanceOf(address)
                break
            }

            if (balance || !getBalance(chain_id, contract_address, balances_data)) {
              balances.push(
                {
                  ...contract_data,
                  amount: balance && utils.formatUnits(balance, decimals || 18),
                }
              )
            }
          }

          if (balances.length > 0) {
            dispatch(
              {
                type: BALANCES_DATA,
                value: {
                  [chain_id]: balances,
                },
              }
            )
          }
        }
      }

      const getData = async is_interval => {
        if (page_visible && chains_data && assets_data && assets_data.findIndex(a => typeof a.price !== 'number') < 0 && rpcs && address) {
          const all_chains_data = getChain(null, chains_data, true, false, false, undefined, true)

          const data =
            get_balances_data && !is_interval && all_chains_data.findIndex(c => !balances_data?.[c.chain_id]) < 0 ?
              Array.isArray(get_balances_data) ? get_balances_data : [get_balances_data] :
              all_chains_data.map(c => { return { chain: c.id } })

          data.forEach(c => {
            const {
              chain,
              contract_data,
            } = { ...c }

            const {
              chain_id,
            } = { ...getChain(chain, chains_data) }

            if (contract_data) {
              getMyBalance(chain_id, contract_data)
            }
            else {
              getChainContracts(chain_id, assets_data).forEach(c => getMyBalance(chain_id, c))
            }
          })
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(true),
          1 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [page_visible, chains_data, assets_data, rpcs, address, get_balances_data],
  )

  let walletImageName
  let walletImageClassName = ''

  if (provider) {
    const wallet_name = provider.constructor?.name?.toLowerCase()

    if (wallet_name.includes('walletconnect')) {
      walletImageName = 'walletconnect.png'
      walletImageClassName = 'rounded-full'
    }
    else if (wallet_name.includes('portis')) {
      walletImageName = 'portis.png'
    }
    else if (['walletlink', 'coinbase'].findIndex(s => wallet_name.includes(s)) > -1) {
      walletImageName = 'coinbase.png'
      walletImageClassName = 'rounded-lg'
    }
    else if (provider.isMetaMask) {
      walletImageName = 'metamask.png'
      walletImageClassName = 'w-4 h-4'
    }
  }

  return (
    <>
      <div className="navbar 3xl:pt-6">
        <div className="navbar-inner w-full sm:h-20 flex xl:grid xl:grid-flow-row xl:grid-cols-3 items-center justify-between gap-4">
          <div className="flex items-center">
            <Logo />
            <DropdownNavigations />
          </div>
          <div className="flex items-center justify-center">
            <Navigations />
          </div>
          <div className="flex items-center justify-end">
            {
              browser_provider &&
              (
                <Chains
                  chain_id={chain_id}
                />
              )
            }
            {
              browser_provider && address &&
              (
                <div className={`hidden sm:flex lg:hidden xl:flex items-center border border-slate-200 dark:border-slate-800 rounded-sm cursor-pointer whitespace-nowrap tracking-tight text-slate-500 dark:text-slate-500 font-semibold space-x-1.5 mx-2 pr-1.5 ${walletImageName ? 'rounded-l-full pl-0' : 'pl-2'}`}>
                  {
                    walletImageName &&
                    (
                      <div className="bg-slate-100 dark:bg-slate-700 rounded-full p-1.5 m-0.5">
                        <Image
                          src={`/logos/wallets/${walletImageName}`}
                          width={20}
                          height={20}
                          className={`3xl:w-7 3xl:h-7 ${walletImageClassName}`}
                        />
                      </div>
                    )
                  }
                  <div className="py-1">
                    <EnsProfile
                      address={address}
                      copySize={18}
                      fallback={
                        <Copy
                          value={address}
                          title={
                            <span className="text-slate-500 dark:text-slate-500 text-sm 3xl:text-2xl">
                              <span className="xl:hidden">
                                {ellipse(address, 6)}
                              </span>
                              <span className="hidden xl:block">
                                {ellipse(address, 6)}
                              </span>
                            </span>
                          }
                        />
                      }
                    />
                  </div>
                </div>
              )
            }
            <div className="mx-0">
              <Wallet
                mainController={true}
                connectChainId={default_chain_id}
              >
                {!browser_provider ?
                  <div className="border border-slate-400 dark:border-slate-600 rounded whitespace-nowrap text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 font-bold mx-2 py-1.5 px-2.5">
                    Connect Wallet
                  </div> :
                  <div className="flex items-center justify-center py-1.5 px-2.5">
                    <TbLogout
                      size={18}
                      className="3xl:w-6 3xl:h-6 text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                    />
                  </div>
                }
              </Wallet>
            </div>
            <Theme />
            <Menus />
          </div>
        </div>
      </div>
      {
        status_message &&
        (
          <div className="w-full bg-slate-100 dark:bg-slate-800 dark:bg-opacity-50 overflow-x-auto flex items-center py-2 sm:py-3 px-2 sm:px-4 3xl:py-4 3xl:px-6">
            <div className="flex flex-wrap items-center text-blue-600 dark:text-blue-400 text-2xs xl:text-sm font-bold space-x-1.5 xl:space-x-2 mx-auto 3xl:text-2xl 3xl:space-x-3">
              <span className="status-message">
                <Linkify>
                  {parse(status_message)}
                </Linkify>
              </span>
            </div>
          </div>
        )
      }
    </>
  )
}
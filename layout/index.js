import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import PageVisibility from 'react-page-visibility'
import { create } from '@connext/sdk-core'
import { constants } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
import _ from 'lodash'
import moment from 'moment'

import Navbar from '../components/navbar'
import Footer from '../components/footer'
import Geoblock from '../components/geoblock'
import AgreeToTerms from '../components/agree-to-terms'
import meta from '../lib/meta'
import { getIP, isBlock } from '../lib/api/ip'
import { getTokensPrice } from '../lib/api/tokens'
import { getENS } from '../lib/api/ens'
import { getDailySwapTVL, getDailySwapVolume } from '../lib/api/metrics'
import { getProvider, getBalance } from '../lib/chain/evm'
import { NETWORK, ENVIRONMENT, IS_STAGING, NUM_STATS_DAYS, MIN_USER_DEPOSITED, getChainsData, getAssetsData } from '../lib/config'
import { getChainData, getAssetData, getChainContractsData, getContractData, getPoolData, getBalanceData } from '../lib/object'
import { formatUnits, isNumber } from '../lib/number'
import { split, toArray, equalsIgnoreCase, getPath, sleep } from '../lib/utils'
import { THEME, PAGE_VISIBLE, TERMS_AGREED, IP_DATA, CHAINS_DATA, ASSETS_DATA, POOL_ASSETS_DATA, GAS_TOKENS_PRICE_DATA, ENS_DATA, ROUTER_ASSET_BALANCES_DATA, POOLS_DATA, USER_POOLS_DATA, POOLS_DAILY_STATS_DATA, RPCS, SDK, BALANCES_DATA, LATEST_BUMPED_TRANSFERS_DATA } from '../reducers/types'

export default ({ children, agreeToTermsUseModal = false }) => {
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
    pools_daily_stats,
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
        pools_daily_stats: state.pools_daily_stats,
        rpc_providers: state.rpc_providers,
        dev: state.dev,
        wallet: state.wallet,
        balances: state.balances,
      }
    ),
    shallowEqual,
  )
  const { theme, page_visible, terms_agreed, ip_data } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { pool_assets_data } = { ...pool_assets }
  const { gas_tokens_price_data } = { ...gas_tokens_price }
  const { ens_data } = { ...ens }
  const { router_asset_balances_data } = { ...router_asset_balances }
  const { pools_data } = { ...pools }
  const { pools_daily_stats_data } = { ...pools_daily_stats }
  const { rpcs } = { ...rpc_providers }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { provider, ethereum_provider, signer, address } = { ...wallet_data }
  const { balances_data, get_balances_data } = { ...balances }

  const router = useRouter()
  const { pathname, asPath } = { ...router }

  const [currentAddress, setCurrentAddress] = useState(null)

  // preferences
  useEffect(
    () => {
      if (typeof window !== 'undefined') {
        const _theme = localStorage.getItem(THEME)
        if (_theme && _theme !== theme) {
          dispatch({ type: THEME, value: _theme })
        }
        const _terms_agreed = localStorage.getItem(TERMS_AGREED)
        if (_terms_agreed?.toString() !== terms_agreed?.toString()) {
          dispatch({ type: TERMS_AGREED, value: !isNaN(_terms_agreed?.toString()) ? Number(_terms_agreed) : false })
        }
        const _latest_bumped_transfers_data = localStorage.getItem(LATEST_BUMPED_TRANSFERS_DATA)
        if (_latest_bumped_transfers_data) {
          dispatch({ type: LATEST_BUMPED_TRANSFERS_DATA, value: _latest_bumped_transfers_data })
        }
      }
    },
    [theme],
  )

  // ip
  useEffect(
    () => {
      const getData = async () => {
        dispatch({ type: IP_DATA, value: { ...await getIP() } })
      }
      getData()
    },
    [],
  )

  // chains
  useEffect(
    () => {
      const getData = () => {
        dispatch({ type: CHAINS_DATA, value: getChainsData() })
      }
      getData()
    },
    [],
  )

  // assets
  useEffect(
    () => {
      const getData = async is_interval => {
        let assets = getAssetsData()
        const response = toArray(await getTokensPrice({ assets: assets.map(a => a.id) }))
        if (response.length > 0) {
          response.forEach(d => {
            const { asset_id, price } = { ...d }
            const index = assets.findIndex(_d => _d.id === asset_id)
            if (index > -1) {
              const asset_data = assets[index]
              asset_data.price = price || toArray(assets_data).find(_d => _d.id === asset_id)?.price || 0
              assets[index] = asset_data
            }
          })
        }
        else if (is_interval) {
          assets = assets_data
        }
        dispatch({ type: ASSETS_DATA, value: assets })
        dispatch({ type: POOL_ASSETS_DATA, value: getAssetData(undefined, assets, { not_disabled: true, only_pool_asset: true, return_all: true }) })
      }

      getData()
      const interval = setInterval(() => getData(true), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [],
  )

  // gas tokens
  useEffect(
    () => {
      const getData = async is_interval => {
        if (page_visible && chains_data) {
          const updated_ids = toArray(gas_tokens_price_data).filter(d => !is_interval && typeof d.price === 'number').map(d => d.asset_id)
          const symbols = toArray(chains_data.map(c => c.native_token?.symbol), 'lower')

          if (updated_ids.length < symbols.length) {
            const assets = symbols.filter(s => !updated_ids.includes(s))
            if (assets.length > 0) {
              const response = toArray(await getTokensPrice({ assets }))
              let data = _.cloneDeep(gas_tokens_price_data)
              if (data) {
                response.forEach(d => {
                  const { asset_id } = { ...d }
                  const index = data.findIndex(_d => _d.asset_id === asset_id)
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
              dispatch({ type: GAS_TOKENS_PRICE_DATA, value: data })
            }
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(true), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, chains_data, gas_tokens_price_data],
  )

  // rpcs
  useEffect(
    () => {
      const init = async => {
        if (chains_data) {
          const data = {}
          for (const chain_data of chains_data) {
            const { id, chain_id } = { ...chain_data }
            data[chain_id] = getProvider(id, chains_data)
          }
          if (!rpcs) {
            dispatch({ type: RPCS, value: data })
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
        if (!sdk && chains_data && assets_data) {
          const chains = {}
          for (const chain_data of chains_data) {
            const { chain_id, domain_id, private_rpcs, disabled } = { ...chain_data }
            let { rpcs } = { ...chain_data }
            rpcs = toArray(private_rpcs || rpcs)
            if (domain_id && !disabled) {
              chains[domain_id] = {
                providers: rpcs,
                assets: getAssetData(undefined, assets_data, { chain_id, not_disabled: true, return_all: true }).map(a => {
                  const { contracts } = { ...a }
                  let { name, symbol } = { ...a }
                  const contract_data = getContractData(chain_id, contracts)
                  const { contract_address } = { ...contract_data }
                  symbol = contract_data?.symbol || symbol
                  name = name || symbol
                  return { name, symbol, address: contract_address }
                }),
              }
            }
          }

          const sdkConfig = {
            network: NETWORK,
            environment: ENVIRONMENT,
            logLevel: 'info',
            chains,
          }
          console.log('[General]', '[SDK config]', sdkConfig)
          dispatch({ type: SDK, value: await create(sdkConfig) })
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
          console.log('[General]', '[SDK change signer address]', address)
          dispatch({ type: SDK, value: sdk })
        }
      }
      update()
    },
    [sdk, provider, ethereum_provider, signer, address, currentAddress],
  )

  // router asset balances
  useEffect(
    () => {
      const getData = async () => {
        if (page_visible && chains_data && assets_data && sdk) {
          try {
            const response = toArray(await sdk.sdkUtils.getRoutersData())
            const data = _.groupBy(
              response.map(d => {
                const { domain, adopted, local, balance } = { ...d }
                const chain_data = getChainData(domain, chains_data)
                const { chain_id } = { ...chain_data }
                const asset_data = getAssetData(undefined, assets_data, { chain_id, return_all: true }).find(a => [adopted, local].findIndex(c => getContractData(c, toArray(a.contracts), { chain_id })) > -1)
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
            dispatch({ type: ROUTER_ASSET_BALANCES_DATA, value: data })
          } catch (error) {}
        }
      }

      getData()
      const interval = setInterval(() => getData(), 3 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, chains_data, assets_data, sdk],
  )

  // ens
  useEffect(
    () => {
      const getData = async () => {
        if (chains_data && router_asset_balances_data && getChainData(undefined, chains_data, { not_disabled: true, return_all: true }).length <= Object.keys(router_asset_balances_data).length) {
          const data = await getENS(_.uniq(Object.values(router_asset_balances_data).flatMap(d => toArray(d)).map(d => d.router_address).filter(a => a && !ens_data?.[a])))
          if (data) {
            dispatch({ type: ENS_DATA, value: data })
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
      const getPool = async (chain_data, asset_data) => {
        const { chain_id, domain_id } = { ...chain_data }
        const { contracts } = { ...asset_data }
        const contract_data = getContractData(chain_id, contracts)
        const { contract_address } = { ...contract_data }

        if (contract_address) {
          const id = [chain_data.id, asset_data.id].join('_')

          let data
          try {
            console.log('[General]', '[getPool]', { domain_id, contract_address })
            const pool = _.cloneDeep(await sdk.sdkPool.getPool(domain_id, contract_address))
            console.log('[General]', '[pool]', { domain_id, contract_address, pool })
            const { lpTokenAddress, adopted, local, symbol } = { ...pool }

            let supply
            let tvl
            let stats

            if (adopted) {
              const { balance, decimals } = { ...adopted }
              adopted.balance = formatUnits(balance, decimals)
              pool.adopted = adopted
            }
            if (local) {
              const { balance, decimals } = { ...local }
              local.balance = formatUnits(balance, decimals)
              pool.local = local
            }

            if (lpTokenAddress) {
              await sleep(1.5 * 1000)
              console.log('[General]', '[getTokenSupply]', { domain_id, lpTokenAddress })
              try {
                supply = await sdk.sdkPool.getTokenSupply(domain_id, lpTokenAddress)
                supply = formatUnits(supply)
                console.log('[General]', '[LPTokenSupply]', { domain_id, lpTokenAddress, supply })
              } catch (error) {
                console.log('[General]', '[getTokenSupply error]', { domain_id, lpTokenAddress }, error)
              }
            }
            supply = supply || pool?.supply
            let { price } = { ...getAssetData(asset_data.id, assets_data) }
            price = price || 0
            if (isNumber(supply) || (adopted?.balance && local?.balance)) {
              tvl = Number(supply || _.sum(toArray(_.concat(adopted, local)).map(a => Number(a.balance)))) * price
            }

            if (pool && (IS_STAGING || ENVIRONMENT === 'production')) {
              await sleep(1.5 * 1000)
              const number_of_days = 7
              console.log('[General]', '[getYieldData]', { domain_id, contract_address, number_of_days })
              try {
                stats = _.cloneDeep(await sdk.sdkPool.getYieldData(domain_id, contract_address, number_of_days))
                console.log('[General]', '[yieldData]', { domain_id, contract_address, number_of_days, stats })
              } catch (error) {
                console.log('[General]', '[getYieldData error]', { domain_id, contract_address, number_of_days }, error)
              }
            }

            if (equalsIgnoreCase(pool?.domainId, domain_id)) {
              const { liquidity, volumeFormatted, fees } = { ...stats }
              data = {
                ...pool,
                ...stats,
                id,
                chain_id,
                chain_data,
                asset_data,
                contract_data,
                symbols: split(symbol, 'normal', '-'),
                supply,
                tvl,
                volume: volumeFormatted,
                rate: 1,
                liquidity_value: (liquidity || 0) * price,
                volume_value: (volumeFormatted || 0) * price,
                fees_value: (fees || 0) * price,
              }
            }
            else {
              data = getPoolData(id, pools_data)
            }
          } catch (error) {
            console.log('[General]', '[getPool error]', { domain_id, contract_address }, error)
            data = getPoolData(id, pools_data) || { id, chain_id, chain_data, asset_data, contract_data, error }
          }
          if (data) {
            dispatch({ type: POOLS_DATA, value: data })
          }
        }
      }

      const getChainData = async chain_data => pool_assets_data.forEach(a => getPool(chain_data, a))

      const getData = async () => {
        if (page_visible && chains_data && pool_assets_data && sdk && pathname && !['/', '/[bridge]'].includes(pathname)) {
          chains_data.filter(c => !pathname.includes('/[') || asPath?.includes(c.id)).forEach(c => getChainData(c))
        }
      }

      getData()
      const interval = setInterval(() => getData(), 1.5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, chains_data, pool_assets_data, sdk, pathname],
  )

  // user pools
  useEffect(
    () => {
      const getChainData = async chain_data => {
        const { id, chain_id, domain_id } = { ...chain_data }

        if (id) {
          let data
          try {
            console.log('[General]', '[getUserPools]', { domain_id, address })
            const response = _.cloneDeep(await sdk.sdkPool.getUserPools(domain_id, address))
            console.log('[General]', '[userPools]', { domain_id, address, response })

            if (Array.isArray(response)) {
              data = toArray(
                _.concat(
                  data,
                  response.map(d => {
                    const { info, lpTokenBalance, poolTokenBalances } = { ...d }
                    const { adopted, local, symbol } = { ...info }

                    if (adopted) {
                      const { balance, decimals } = { ...adopted }
                      adopted.balance = formatUnits(balance, decimals)
                      info.adopted = adopted
                    }
                    if (local) {
                      const { balance, decimals } = { ...local }
                      local.balance = formatUnits(balance, decimals)
                      info.local = local
                    }

                    const symbols = split(symbol, 'normal', '-')
                    const asset_data = getAssetData(undefined, pool_assets_data, { chain_id, symbols })
                    return {
                      ...d,
                      id: [id, asset_data?.id].join('_'),
                      chain_data,
                      asset_data,
                      ...info,
                      symbols,
                      lpTokenBalance: formatUnits(lpTokenBalance),
                      poolTokenBalances: toArray(poolTokenBalances).map((b, i) => formatUnits(b, (adopted?.index === i ? adopted : local)?.decimals)),
                    }
                  }),
                )
              ).filter(d => d.asset_data && Number(d.lpTokenBalance) > MIN_USER_DEPOSITED)
            }
          } catch (error) {
            console.log('[General]', '[getUserPools error]', { domain_id, address }, error)
          }
          dispatch({ type: USER_POOLS_DATA, value: { [id]: data } })
        }
      }

      const getData = async () => {
        if (page_visible && chains_data && pool_assets_data && sdk && ['/pools'].includes(pathname)) {
          if (address) {
            chains_data.filter(c => !pathname.includes('/[') || asPath?.includes(c.id)).forEach(c => getChainData(c))
          }
          else {
            dispatch({ type: USER_POOLS_DATA, value: {} })
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(), 1.5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, chains_data, pool_assets_data, sdk, address, pathname],
  )

  // pools daily stats
  useEffect(
    () => {
      const getData = async is_interval => {
        if (['/pool/[pool]'].includes(pathname) && (is_interval || !pools_daily_stats_data)) {
          const day = `gt.${moment().subtract(NUM_STATS_DAYS, 'days').startOf('day').format('YYYY-MM-DD')}`
          dispatch({ type: POOLS_DAILY_STATS_DATA, value: { tvls: toArray(await getDailySwapTVL({ day })), volumes: toArray(await getDailySwapVolume({ swap_day: day })) } })
        }
      }

      getData()
      const interval = setInterval(() => getData(true), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [pathname],
  )

  // balances
  useEffect(
    () => {
      const getMyBalance = async (chain_id, contract_data) => {
        const { contract_address, next_asset, wrappable } = { ...contract_data }
        const provider = rpcs[chain_id]
        if (provider) {
          const contracts_data = toArray(
            _.concat(
              { ...contract_data },
              wrappable && { ...contract_data, contract_address: ZeroAddress },
              next_asset && { ...contract_data, ...next_asset },
            )
          ).filter(c => c.contract_address)

          const balances = []
          for (const contract_data of contracts_data) {
            const { contract_address, decimals } = { ...contract_data }
            try {
              const balance = await getBalance(address, contract_data, chain_id, chains_data)
              if (isNumber(balance) || !isNumber(getBalanceData(chain_id, contract_address, balances_data))) {
                balances.push({ ...contract_data, amount: formatUnits(balance, decimals) })
              }
            } catch (error) {}
          }

          if (balances.length > 0) {
            dispatch({ type: BALANCES_DATA, value: { [chain_id]: balances } })
          }
        }
      }

      const getData = async is_interval => {
        if (page_visible && chains_data && assets_data && rpcs && address) {
          const path = getPath(asPath)
          let chain_ids
          switch (pathname) {
            case '/[bridge]':
              try {
                const paths = split(path.replace('/', ''), 'normal', '-')
                const sourceChain = paths[paths.indexOf('from') + 1]
                const destinationChain = paths[paths.indexOf('to') + 1]
                if (sourceChain || destinationChain) {
                  chain_ids = toArray([sourceChain, destinationChain])
                }
              } catch (error) {}
              break
            case '/pool/[pool]':
              try {
                const paths = split(path.replace('/pool/', ''), 'normal', '-')
                const chain = paths[paths.indexOf('on') + 1]
                if (chain) {
                  chain_ids = toArray(chain)
                }
              } catch (error) {}
              break
            case '/swap/[swap]':
              try {
                const paths = split(path.replace('/swap/', ''), 'normal', '-')
                const chain = paths[paths.indexOf('on') + 1]
                if (chain) {
                  chain_ids = toArray(chain)
                }
              } catch (error) {}
              break
            default:
              break
          }

          if (chain_ids || get_balances_data) {
            const all_chains_data = getChainData(undefined, chains_data, { return_all: true }).filter(c => !chain_ids || chain_ids.includes(c.id))
            const data = get_balances_data && !is_interval && all_chains_data.findIndex(c => !balances_data?.[c.chain_id]) < 0 ? toArray(get_balances_data) : all_chains_data.map(c => { return { chain: c.id } })
            data.forEach(c => {
              const { chain, contract_data } = { ...c }
              const { chain_id } = { ...getChainData(chain, chains_data) }
              if (contract_data) {
                getMyBalance(chain_id, contract_data)
              }
              else {
                toArray(getChainContractsData(chain_id, assets_data)).forEach(c => getMyBalance(chain_id, c))
              }
            })
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(true), 1 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, chains_data, assets_data, rpcs, address, get_balances_data],
  )

  const { title, description, image, url } = { ...meta(asPath, undefined, chains_data, assets_data) }

  return (
    <>
      <Head>
        <title>
          {title}
        </title>
        <meta
          name="og:site_name"
          property="og:site_name"
          content={title}
        />
        <meta
          name="og:title"
          property="og:title"
          content={title}
        />
        <meta
          itemProp="name"
          content={title}
        />
        <meta
          itemProp="headline"
          content={title}
        />
        <meta
          itemProp="publisher"
          content={title}
        />
        <meta
          name="twitter:title"
          content={title}
        />

        <meta
          name="description"
          content={description}
        />
        <meta
          name="og:description"
          property="og:description"
          content={description}
        />
        <meta
          itemProp="description"
          content={description}
        />
        <meta
          name="twitter:description"
          content={description}
        />

        <meta
          name="og:image"
          property="og:image"
          content={image}
        />
        <meta
          itemProp="thumbnailUrl"
          content={image}
        />
        <meta
          itemProp="image"
          content={image}
        />
        <meta
          name="twitter:image"
          content={image}
        />
        <link
          rel="image_src"
          href={image}
        />

        <meta
          name="og:url"
          property="og:url"
          content={url}
        />
        <meta
          itemProp="url"
          content={url}
        />
        <meta
          name="twitter:url"
          content={url}
        />
        <link
          rel="canonical"
          href={url}
        />
      </Head>
      <PageVisibility onChange={v => dispatch({ type: PAGE_VISIBLE, value: v })}>
        <div
          data-layout="layout"
          data-background={theme}
          data-navbar={theme}
          className={`min-h-screen antialiased disable-scrollbars text-sm ${theme}`}
        >
          <div className="wrapper">
            <div className="main w-full bg-white dark:bg-black" style={{ backgroundColor: theme === 'light' ? '#ececec' : '#1a1919' }}>
              <Navbar />
              <div className="w-full">
                {isBlock(ip_data) ?
                  <div className="flex items-center" style={{ minHeight: 'calc(100vh - 220px)' }}>
                    <Geoblock />
                  </div> :
                  agreeToTermsUseModal ?
                    <>
                      <AgreeToTerms useModal={agreeToTermsUseModal} />
                      {children}
                    </> :
                    terms_agreed ?
                      children :
                      <div className="flex items-center" style={{ minHeight: 'calc(100vh - 220px)' }}>
                        <AgreeToTerms useModal={agreeToTermsUseModal} />
                      </div>
                }
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </PageVisibility>
    </>
  )
}
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { create } from '@connext/nxtp-sdk'
import { getCanonicalHash } from '@connext/nxtp-utils'
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
import { assets as getAssetsPrice } from '../../lib/api/assets'
import { ens as getEns } from '../../lib/api/ens'
import { ellipse, equals_ignore_case } from '../../lib/utils'
import { ANNOUNCEMENT_DATA, CHAINS_DATA, ASSETS_DATA, POOL_ASSETS_DATA, ENS_DATA, ASSET_BALANCES_DATA, POOLS_DATA, SDK, RPCS } from '../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const {
    preferences,
    chains,
    assets,
    pool_assets,
    ens,
    asset_balances,
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
    asPath,
  } = { ...router }

  const [hiddenStatus, setHiddenStatus] = useState(false)
  const [currentAddress, setCurrentAddress] = useState(null)

  // annoucement
  useEffect(() => {
    const getData = async () => {
      dispatch({
        type: ANNOUNCEMENT_DATA,
        value: await getAnnouncement(),
      })
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      1 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [])

  // chains
  useEffect(() => {
    const getData = async () => {
      const response = await getChains()

      if (Array.isArray(response)) {
        dispatch({
          type: CHAINS_DATA,
          value: response,
        })
      }
    }

    getData()
  }, [])

  // assets
  useEffect(() => {
    const getData = async () => {
      const response = await getAssets()

      if (Array.isArray(response)) {
        dispatch({
          type: ASSETS_DATA,
          value: response,
        })

        dispatch({
          type: POOL_ASSETS_DATA,
          value: response
            .map(d => {
              const {
                contracts,
              } = { ...d }

              return {
                ...d,
                contracts: contracts?.filter(c => c?.is_pool),
              }
            })
            .filter(d => d.contracts?.length > 0),
        })
      }
    }

    getData()
  }, [])

  // price
  useEffect(() => {
    const getData = async is_interval => {
      if (
        chains_data &&
        assets_data
      ) {
        let updated_ids = is_interval ? [] :
          assets_data
            .filter(a => typeof a.price === 'number')
            .map(a => a.id)

        if (updated_ids.length < assets_data.length) {
          let updated = false

          for (const chain_data of chains_data) {
            const {
              chain_id,
            } = { ...chain_data }

            if (chain_id) {
              const addresses = assets_data
                .filter(a =>
                  !updated_ids.includes(a?.id) &&
                  a?.contracts?.findIndex(c =>
                    c?.chain_id === chain_id &&
                    c.contract_address
                  ) > -1
                )
                .map(a => a.contracts.find(c => c?.chain_id === chain_id).contract_address)

              if (addresses.length > 0) {
                const response = await getAssetsPrice(
                  {
                    chain_id,
                    addresses,
                  },
                )

                if (Array.isArray(response)) {
                  response.forEach(t => {
                    const asset_index = assets_data.findIndex(a =>
                      a?.id &&
                      a.contracts?.findIndex(c =>
                        c?.chain_id === t?.chain_id &&
                        equals_ignore_case(c.contract_address, t?.contract_address)
                      ) > -1
                    )

                    if (asset_index > -1) {
                      const asset = assets_data[asset_index]
                      asset.price = t?.price ||
                        asset.price ||
                        0

                      assets_data[asset_index] = asset

                      updated_ids = _.uniq(
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
            dispatch({
              type: ASSETS_DATA,
              value: _.cloneDeep(assets_data),
            })
          }
        }
      }
    }

    getData()

    return () => clearInterval(
      setInterval(() =>
        getData(true),
        5 * 60 * 1000,
      )
    )
  }, [chains_data, assets_data])

  // rpcs
  useEffect(() => {
    const init = async => {
      if (chains_data) {
        const _rpcs = {}

        for (const chain_data of chains_data) {
          const {
            disabled,
            chain_id,
            provider_params,
          } = { ...chain_data }

          if (!disabled) {
            const {
              rpcUrls,
            } = { ..._.head(provider_params) }
 
            const rpc_urls = (rpcUrls || [])
              .filter(url => url)

            const provider = rpc_urls.length === 1 ?
              new providers.JsonRpcProvider(rpc_urls[0]) :
              new providers.FallbackProvider(
                rpc_urls.map((url, i) => {
                  return {
                    provider: new providers.JsonRpcProvider(url),
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
          dispatch({
            type: RPCS,
            value: _rpcs,
          })
        }
      }
    }

    init()
  }, [chains_data])

  // sdk
  useEffect(() => {
    const init = async () => {
      if (
        chains_data &&
        assets_data?.findIndex(a => typeof a.price !== 'number') < 0
      ) {
        const chains_config = {}

        for (const chain_data of chains_data) {
          const {
            chain_id,
            domain_id,
            provider_params,
            disabled,
          } = { ...chain_data }

          if (!disabled) {
            const {
              rpcUrls,
            } = { ..._.head(provider_params) }
 
            const rpc_urls = (rpcUrls || [])
              .filter(url => url)

            if (domain_id) {
              chains_config[domain_id] = {
                providers: rpc_urls,
                assets: assets_data
                  .filter(a => a?.contracts?.findIndex(c => c?.chain_id === chain_id) > -1)
                  .map(a => {
                    const {
                      contracts,
                    } = { ...a }
                    let {
                      name,
                      symbol,
                    } = { ...a }

                    const contract_data = contracts.find(c => c?.chain_id === chain_id)
                    const {
                      contract_address,
                    } = { ...contract_data }

                    symbol = contract_data?.symbol ||
                      symbol

                    name = name ||
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
          // signerAddress: address,
          logLevel: 'info',
          network: process.env.NEXT_PUBLIC_NETWORK,
          environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
        }

        console.log(
          '[SDK config]',
          sdkConfig,
        )

        dispatch({
          type: SDK,
          value: await create(
            sdkConfig,
          ),
        })
      }
    }

    init()
  }, [chains_data, assets_data])

  // sdk
  useEffect(() => {
    const update = async () => {
      if (
        sdk &&
        address &&
        !equals_ignore_case(address, currentAddress)
      ) {
        if (sdk.nxtpSdkBase) {
          await sdk.nxtpSdkBase.changeSignerAddress(
            address,
          )
        }

        if (sdk.nxtpSdkRouter) {
          await sdk.nxtpSdkRouter.changeSignerAddress(
            address,
          )
        }

        setCurrentAddress(address)

        console.log(
          '[Signer address]',
          address,
        )

        dispatch({
          type: SDK,
          value: sdk,
        })
      }
    }

    update()
  }, [sdk, provider, web3_provider, address, signer, currentAddress])

  // assets balances
  useEffect(() => {
    const getData = async () => {
      if (
        sdk &&
        chains_data &&
        assets_data?.findIndex(a => typeof a.price !== 'number') < 0
      ) {
        try {
          const response = await sdk.nxtpSdkUtils.getRoutersData()

          if (response) {
            const data = _.groupBy(
              response
                .map(l => {
                  const {
                    domain,
                    local,
                    balance,
                  } = { ...l }

                  const chain_data = chains_data.find(c => c?.domain_id === domain)
                  const {
                    chain_id,
                  } = { ...chain_data }

                  const asset_data = assets_data.find(a =>
                    a?.contracts?.findIndex(c =>
                      c?.chain_id === chain_id &&
                      equals_ignore_case(c?.contract_address, local)
                    ) > -1
                  )

                  const amount = BigInt(balance || 0).toString()

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

            dispatch({
              type: ASSET_BALANCES_DATA,
              value: data,
            })
          }
        } catch (error) {}
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      1 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [sdk, chains_data, assets_data])

  // pools
  useEffect(() => {
    const getChainData = async chain_data => {
      if (
        sdk &&
        chain_data
      ) {
        const {
          chain_id,
          domain_id,
        } = { ...chain_data }

        const data = []

        for (const asset_data of pool_assets_data) {
          const {
            contracts,
          } = { ...asset_data }

          const contract_data = contracts?.find(c => c?.chain_id === chain_id)
          const {
            contract_address,
          } = { ...contract_data }

          if (contract_address) {
            try {
              console.log(
                '[getPool]',
                {
                  domain_id,
                  contract_address,
                },
              )

              const pool = await sdk.nxtpSdkPool.getPool(
                domain_id,
                contract_address,
              )

              console.log(
                '[Pool]',
                {
                  domain_id,
                  contract_address,
                  pool,
                },
              )

              const {
                symbol,
                decimals,
              } = { ...pool }

              const symbols = (symbol || '')
                .split('-')
                .filter(s => s)

              if (pool) {
                console.log(
                  '[getPoolStats]',
                  {
                    domain_id,
                    contract_address,
                  },
                )
              }

              const stats = pool &&
                await sdk.nxtpSdkPool.getPoolStats(
                  domain_id,
                  contract_address,
                )

              if (pool) {
                console.log(
                  '[PoolStats]',
                  {
                    domain_id,
                    contract_address,
                    stats,
                  },
                )
              }

              const canonicals = pool &&
                await sdk.nxtpSdkPool.getCanonicalToken(
                  domain_id,
                  contract_address,
                )

              const canonicalDomain = _.head(canonicals),
                canonicalId = _.last(canonicals)

              if (pool) {
                console.log(
                  '[getVirtualPrice]',
                  {
                    domain_id,
                    contract_address,
                  },
                )
              }

              const rate = pool &&
                await sdk.nxtpSdkPool.getVirtualPrice(
                  domain_id,
                  contract_address,
                )

              if (pool) {
                console.log(
                  '[VirtualPrice]',
                  {
                    domain_id,
                    contract_address,
                    rate,
                  },
                )
              }

              data.push({
                ...pool,
                ...stats,
                id: `${chain_data.id}_${asset_data.id}`,
                chain_id,
                chain_data,
                asset_data,
                contract_data,
                symbols,
                rate: Number(
                  utils.formatUnits(
                    BigNumber.from(rate || '0'),
                    _.last(decimals) || 18,
                  )
                ),
              })
            } catch (error) {
              console.log(
                '[ERROR getPool]',
                {
                  domain_id,
                  contract_address,
                },
                error,
              )

              data.push({
                id: `${chain_data.id}_${asset_data.id}`,
                chain_id,
                chain_data,
                asset_data,
                contract_data,
                error,
              })
            }
          }
        }

        if (data.length > 0) {
          dispatch({
            type: POOLS_DATA,
            value: data,
          })
        }
      }
    }

    const getData = async () => {
      if (
        sdk &&
        chains_data &&
        pool_assets_data
      ) {
        chains_data.forEach(c =>
          getChainData(c)
        )
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      1 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [asPath, sdk, chains_data, pool_assets_data])

  // ens
  useEffect(() => {
    const getData = async () => {
      if (
        chains_data &&
        asset_balances_data &&
        chains_data.filter(c => !c?.disabled).length <= Object.keys(asset_balances_data).length
      ) {
        const addresses = _.uniq(
          Object.values(asset_balances_data)
            .flatMap(a => a)
            .map(a => a?.router_address)
            .filter(a => a && !ens_data?.[a])
        )

        const ens_data = await getEns(addresses)

        if (ens_data) {
          dispatch({
            type: ENS_DATA,
            value: ens_data,
          })
        }
      }
    }

    getData()
  }, [chains_data, asset_balances_data])

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
              address &&
              (
                <div className="hidden sm:flex flex-col space-y-0.5 mx-2">
                  <EnsProfile
                    address={address}
                    fallback={address &&
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
                                8,
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
            {web3_provider && (
              <Chains
                chain_id={chain_id}
              />
            )}
            <Theme />
          </div>
        </div>
      </div>
      {
        !hiddenStatus &&
        process.env.NEXT_PUBLIC_STATUS_MESSAGE &&
        (
          <div className="w-full bg-slate-100 dark:bg-slate-900 overflow-x-auto flex items-center py-2 sm:py-3 px-2 sm:px-4">
            <span className="flex flex-wrap items-center font-mono text-blue-500 dark:text-white text-2xs xl:text-sm space-x-1.5 xl:space-x-2 mx-auto">
              <Linkify>
                {parse(process.env.NEXT_PUBLIC_STATUS_MESSAGE)}
              </Linkify>
              <button
                onClick={() => setHiddenStatus(true)}
                className="hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full mt-0.5 p-1"
              >
                <MdClose
                  size={12}
                />
              </button>
            </span>
          </div>
        )
      }
    </>
  )
}
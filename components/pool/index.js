import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, Contract, constants, utils } from 'ethers'
import { RiArrowLeftCircleFill } from 'react-icons/ri'

import Info from './info'
import Liquidity from './liquidity'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import { params_to_obj, equals_ignore_case } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const {
    chains,
    pool_assets,
    _pools,
    rpc_providers,
    dev,
    wallet,
    balances,
  } = useSelector(state =>
    (
      {
        chains: state.chains,
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
    chains_data,
  } = { ...chains }
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
  useEffect(() => {
    let updated = false

    const params = params_to_obj(
      asPath?.indexOf('?') > -1 &&
      asPath.substring(
        asPath.indexOf('?') + 1,
      )
    )

    let path = !asPath ?
      '/' :
      asPath.toLowerCase()
    path = path.includes('?') ?
      path.substring(
        0,
        path.indexOf('?'),
      ) :
      path

    if (
      path.includes('on-')
    ) {
      const paths = path
        .replace(
          '/pool/',
          '',
        )
        .split('-')

      const chain = paths[paths.indexOf('on') + 1]
      const asset = _.head(paths) !== 'on' ?
        _.head(paths) :
        null

      const chain_data = chains_data?.find(c =>
        c?.id === chain
      )
      const asset_data = pool_assets_data?.find(a =>
        a?.id === asset ||
        equals_ignore_case(a?.symbol, asset)
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
  }, [asPath, chains_data, pool_assets_data])

  // set pool to path
  useEffect(() => {
    const params = {}

    if (pool) {
      const {
        chain,
        asset,
      } = { ...pool }

      if (
        chains_data?.findIndex(c =>
          !c?.disabled &&
          c?.id === chain
        ) > -1
      ) {
        params.chain = chain

        if (
          asset &&
          pool_assets_data?.findIndex(a =>
            a?.id === asset &&
            a.contracts?.findIndex(c =>
              c?.chain_id === chains_data.find(_c =>
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
      } = { ..._.head(pool_assets_data) }

      params.chain =
        params.chain ||
        chains_data?.find(c =>
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

      router.push(
        `/pool/${chain ?
          `${asset ?
            `${asset.toUpperCase()}-` :
            ''
          }on-${chain}` :
          ''
        }${Object.keys(params).length > 0 ?
          `?${new URLSearchParams(params).toString()}` :
          ''
        }`,
        undefined,
        {
          shallow: true,
        },
      )
    }
  }, [address, pool])

  // update balances
  useEffect(() => {
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
      const params = params_to_obj(
        asPath.indexOf('?') > -1 &&
        asPath.substring(asPath.indexOf('?') + 1)
      )

      if (
        !params?.chain &&
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
  }, [asPath, chain_id, chains_data])

  // update balances
  useEffect(() => {
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
  }, [address])

  // update balances
  useEffect(() => {
    const getData = () => {
      if (address) {
        const {
          chain,
        } = { ...pool }

        getBalances(chain)
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      0.25 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [rpcs])

  // update balances
  useEffect(() => {
    if (pools_data) {
      const chains = _.uniq(
        pools_data
          .map(p => p?.chain_data?.id)
          .filter(c => c)
      )

      chains.forEach(c =>
        getBalances(c)
      )
    }
  }, [pools_data])

  // get pools
  useEffect(() => {
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
        try {
          const chain_data = chains_data?.find(c =>
            c?.id === chain
          )
          const {
            chain_id,
            domain_id,
          } = { ...chain_data }

          const response = await sdk.nxtpSdkPool.getUserPools(
            domain_id,
            address,
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
                    symbol,
                    decimals,
                    balances,
                    liquidity,
                  } = { ...info }

                  const symbols = (symbol || '')
                    .split('-')
                    .filter(s => s)
                  const asset_data = pool_assets_data?.find(a =>
                    symbols.findIndex(s =>
                      equals_ignore_case(s, a?.symbol)
                    ) > -1 ||
                    a?.contracts?.findIndex(c =>
                      c?.chain_id === chain_id &&
                      symbols.findIndex(s =>
                        equals_ignore_case(s, c?.symbol)
                      ) > -1
                    ) > -1
                  )

                  return {
                    ...p,
                    chain_data,
                    asset_data,
                    ...info,
                    symbols,
                    lpTokenBalance: Number(
                      utils.formatUnits(
                        BigNumber.from(lpTokenBalance || '0'),
                        _.last(decimals) || 18,
                      )
                    ),
                    poolTokenBalances: (poolTokenBalances || [])
                      .map((b, i) =>
                        Number(
                          utils.formatUnits(
                            BigNumber.from(b || '0'),
                            decimals?.[i] || 18,
                          )
                        )
                      ),
                    balances: (balances || [])
                      .map((b, i) =>
                        Number(
                          utils.formatUnits(
                            BigNumber.from(b || '0'),
                            decimals?.[i] || 18,
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
        } catch (error) {}
      }
    }

    getData()
  }, [sdk, address, poolsTrigger])

  const getBalances = chain => {
    const getBalance = async (
      chain_id,
      contract_data,
    ) => {
      const {
        contract_address,
        decimals,
      } = { ...contract_data }

      const provider = rpcs?.[chain_id]

      let balance

      if (
        address &&
        provider &&
        contract_address
      ) {
        if (contract_address === constants.AddressZero) {
          balance = await provider.getBalance(
            address,
          )
        }
        else {
          const contract = new Contract(
            contract_address,
            [
              'function balanceOf(address owner) view returns (uint256)',
            ],
            provider,
          )

          balance = await contract.balanceOf(
            address,
          )
        }
      }

      if (
        balance ||
        !(
          balances_data?.[`${chain_id}`]?.findIndex(c =>
            equals_ignore_case(c?.contract_address, contract_address)
          ) > -1
        )
      ) {
        dispatch(
          {
            type: BALANCES_DATA,
            value: {
              [`${chain_id}`]: [{
                ...contract_data,
                amount: balance &&
                  Number(
                    utils.formatUnits(
                      balance,
                      decimals ||
                      18,
                    )
                  ),
              }],
            },
          }
        )
      }
    }

    const {
      chain_id,
      domain_id,
    } = {
      ...chains_data?.find(c =>
        c?.id === chain
      ),
    }

    const contracts_data = _.uniqBy(
      _.concat(
        (pool_assets_data || [])
          .map(a => {
            const {
              contracts,
            } = { ...a }

            return {
              ...a,
              ...contracts?.find(c =>
                c?.chain_id === chain_id
              ),
            }
          }),
        (pools_data || [])
          .filter(p =>
            equals_ignore_case(p?.domainId, domain_id)
          )
          .flatMap(p => {
            const {
              tokens,
              symbols,
              decimals,
            } = { ...p }

            return (tokens || [])
              .map((t, i) => {
                return {
                  chain_id,
                  contract_address: t,
                  decimals: decimals?.[i],
                  symbol: symbols?.[i],
                }
              })
          }),
      )
      .filter(a => a?.contract_address)
      .map(a => {
        let {
          contract_address,
        } = {  ...a }

        contract_address = contract_address.toLowerCase()

        return {
          ...a,
          contract_address,
        }
      }),
      'contract_address',
    )

    contracts_data.forEach(c =>
      getBalance(
        chain_id,
        c,
      )
    )
  }

  const reset = async origin => {
    const reset_pool = origin !== 'address'

    if (reset_pool) {
      setPool({
        ...pool,
      })
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

  const chain_data = chains_data?.find(c =>
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
    pool_assets_data?.findIndex(a =>
      a?.id === asset &&
      a.contracts?.findIndex(a =>
        a?.chain_id === chain_data?.chain_id
      ) > -1
    ) < 0

  const pool_data = pools_data?.find(p =>
    p?.chain_data?.id === chain &&
    p.asset_data?.id === asset
  )
  const {
    name,
    lpTokenAddress,
    liquidity,
    volume,
    fees,
    apy,
    symbol,
    symbols,
    error,
  } = { ...pool_data }

  return (
    <div className="mb-4">
      <div className="flex justify-center">
        <div className="w-full flex flex-col space-y-1 my-6 my-4 sm:my-6 mx-1 sm:mx-4">
          <div className="flex items-center space-x-3">
            {/*<Link
              href="/pools"
              className="text-blue-400 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white"
            >
              <RiArrowLeftCircleFill
                size={36}
              />
            </Link>*/}
            <h1 className="uppercase tracking-widest text-2xl font-medium">
              Manage Pool
            </h1>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="grid sm:flex sm:items-center sm:justify-between sm:space-x-2 gap-2">
                <div className="order-2 sm:order-1 flex items-center space-x-4 sm:space-x-6">
                  <SelectAsset
                    value={asset}
                    onSelect={a => {
                      setPool(
                        {
                          ...pool,
                          asset: a,
                        }
                      )
                    }}
                    chain={chain}
                    origin=""
                    is_pool={true}
                  />
                  <div className="uppercase text-xs sm:text-sm font-medium">
                    on
                  </div>
                  <SelectChain
                    value={chain}
                    onSelect={c => {
                      setPool(
                        {
                          ...pool,
                          chain: c,
                        }
                      )
                    }}
                    origin=""
                  />
                </div>
                {
                  no_pool &&
                  (
                    <div className="order-2 tracking-wider text-slate-400 dark:text-slate-400 text-base font-normal py-1.5 px-4">
                      Pool doesn't exist
                    </div>
                  )
                }
                {
                  name &&
                  url &&
                  (
                    <a
                      href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="order-1 sm:order-2 w-fit underline text-base font-semibold py-1.5 px-4"
                    >
                      {name}
                    </a>
                  )
                }
              </div>
              {
                error &&
                (
                  <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-100 dark:bg-opacity-50 rounded-lg tracking-wider text-red-600 dark:text-red-400 text-base font-normal py-1.5 px-4">
                    {error.message}
                  </div>
                )
              }
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
              <Liquidity
                pool={pool}
                user_pools_data={pools}
                onFinish={() =>
                  setPoolsTrigger(
                    moment()
                      .valueOf()
                  )
                }
              />
              <div className="lg:col-span-2">
                <Info
                  pool={pool}
                  user_pools_data={pools}
                  onSelect={p => setPool(p)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'
import { TiArrowLeft } from 'react-icons/ti'

import Info from './info'
import Liquidity from './liquidity'
import Spinner from '../spinner'
import NumberDisplay from '../number'
import Image from '../image'
import { MIN_USER_DEPOSITED } from '../../lib/config'
import { chainName, getChainData, getAssetData } from '../../lib/object'
import { split, toArray, getPath, getQueryParams } from '../../lib/utils'
import { formatUnits, isNumber } from '../../lib/number'
import { BALANCES_DATA, GET_BALANCES_DATA } from '../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const { chains, pool_assets, pools, rpc_providers, dev, wallet } = useSelector(state => ({ chains: state.chains, pool_assets: state.pool_assets, pools: state.pools, rpc_providers: state.rpc_providers, dev: state.dev, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { pool_assets_data } = { ...pool_assets }
  const { pools_data } = { ...pools }
  const { rpcs } = { ...rpc_providers }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }
  const wallet_chain_id = wallet_data?.chain_id

  const router = useRouter()
  const { asPath } = { ...router }

  const [pool, setPool] = useState({})
  const [userPools, setUserPools] = useState(null)
  const [poolsTrigger, setPoolsTrigger] = useState(null)

  // get pool from path
  useEffect(
    () => {
      if (pool_assets_data) {
        let updated = false
        const path = getPath(asPath)
        if (path.includes('on-')) {
          const paths = split(path.replace('/pool/', ''), 'normal', '-')
          const chain = paths[paths.indexOf('on') + 1]
          const asset = _.head(paths) !== 'on' ? _.head(paths) : null
          const chain_data = getChainData(chain, chains_data)
          const asset_data = getAssetData(asset, pool_assets_data)

          if (chain_data) {
            updated = pool.chain !== chain
            pool.chain = chain
          }
          if (asset_data) {
            updated = pool.asset !== asset
            pool.asset = asset
          }
        }

        if (updated) {
          setPool(pool)
          if (pool.chain && pool.asset) {
            setPoolsTrigger(moment().valueOf())
          }
        }
      }
    },
    [chains_data, pool_assets_data, asPath],
  )

  // set pool to path
  useEffect(
    () => {
      const params = { ...getQueryParams(asPath) }
      if (pool) {
        const { chain, asset } = { ...pool }
        const chain_data = getChainData(chain, chains_data, { must_have_pools: true })
        const { chain_id } = { ...chain_data }
        if (chain_data) {
          params.chain = chain
          if (asset && getAssetData(asset, pool_assets_data, { chain_id })) {
            params.asset = asset
          }
        }
        else if (!chain) {
          params.chain = getChainData(wallet_chain_id, chains_data, { must_have_pools: true })?.id || getChainData(undefined, chains_data, { must_have_pools: true, get_head: true })?.id
        }
        if (params.chain && !params.asset && !asset) {
          const { chain_id } = { ...getChainData(params.chain, chains_data) }
          params.asset = getAssetData(undefined, pool_assets_data, { chain_id, get_head: true })?.id
        }
      }

      if (!(params.chain && params.asset) && toArray(pool_assets_data).length > 0) {
        const { chain_id } = { ...getChainData(params.chain, chains_data, { must_have_pools: true, get_head: true }) }
        const { id, contracts } = { ...getAssetData(params.asset, pool_assets_data, { chain_id, get_head: true }) }
        params.chain = params.chain || getChainData(_.head(contracts)?.chain_id, chains_data)?.id
        params.asset = params.asset || id
      }

      if (Object.keys(params).length > 0) {
        const { chain, asset } = { ...params }
        delete params.chain
        delete params.asset
        if (chain && asset) {
          router.push(`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`, undefined, { shallow: true })
        }
      }
    },
    [pool_assets_data, address, pool],
  )

  // update balances
  useEffect(
    () => {
      const { id } = { ...getChainData(wallet_chain_id, chains_data) }
      const path = getPath(asPath)
      if (id && !path.includes('on-')) {
        const { chain } = { ...getQueryParams(asPath) }
        if (!chain && getChainData(id, chains_data)) {
          setPool({ ...pool, chain: id })
        }
        getBalances(id)
      }
    },
    [chains_data, wallet_chain_id, asPath],
  )

  // update balances
  useEffect(
    () => {
      dispatch({ type: BALANCES_DATA, value: null })
      if (address) {
        const { chain } = { ...pool }
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
          const { chain } = { ...pool }
          getBalances(chain)
        }
      }

      getData()
      const interval = setInterval(() => getData(), 0.25 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [rpcs],
  )

  // update balances
  useEffect(
    () => {
      if (pools_data) {
        _.uniq(toArray(pools_data.map(d => d.chain_data?.id))).forEach(c => getBalances(c))
      }
    },
    [pools_data],
  )

  // get pools
  useEffect(
    () => {
      const getData = async () => {
        const { chain, asset } = { ...pool }
        if (sdk && address && chain && asset && poolsTrigger) {
          const chain_data = getChainData(chain, chains_data)
          const { id, chain_id, domain_id } = { ...chain_data }
          try {
            console.log('[/pool]', '[getUserPools]', { domain_id, address })
            const response = _.cloneDeep(await sdk.sdkPool.getUserPools(domain_id, address))
            console.log('[/pool]', '[UserPools]', { domain_id, address, response })

            if (Array.isArray(response)) {
              setUserPools(
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
                }).filter(d => d.asset_data && Number(d.lpTokenBalance) > MIN_USER_DEPOSITED)
              )
            }
            else {
              setUserPools(toArray(userPools))
            }
          } catch (error) {
            console.log('[/pool]', '[getUserPools error]', { domain_id, address }, error)
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
      setPool({ ...pool })
    }
    setPoolsTrigger(moment().valueOf())
    const { chain } = { ...pool }
    getBalances(chain)
  }

  const getBalances = chain => dispatch({ type: GET_BALANCES_DATA, value: { chain } })

  const { chain, asset } = { ...pool }
  const chain_data = getChainData(chain, chains_data)
  const { image } = { ...chain_data }

  const selected = !!(chain && asset)
  const no_pool = selected && !getAssetData(asset, pool_assets_data, { chain_id: chain_data?.chain_id })
  const pool_data = toArray(pools_data).find(d => d.chain_data?.id === chain && d.asset_data?.id === asset)
  const { name, apy, error } = { ...pool_data }
  const { message } = { ...error }
  const pool_loading = selected && !no_pool && !error && !pool_data

  return (
    <div className="children max-w-6.5xl 3xl:max-w-screen-2xl flex justify-center mx-auto">
      <div className="w-full space-y-3.5 3xl:space-y-6 mt-4 sm:mt-12 mx-auto">
        <Link href="/pools">
          <div className="w-fit rounded border dark:border-slate-800 flex items-center text-slate-600 dark:text-slate-500 space-x-1 3xl:space-x-2 py-0.5 px-2.5">
            <TiArrowLeft size={18} className="3xl:w-6 3xl:h-6 -ml-0.5" />
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
                  {image && (
                    <Image
                      src={image}
                      width={48}
                      height={48}
                      className="3xl:w-16 3xl:h-16 rounded-full"
                    />
                  )}
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
              <Tooltip content="Returns from 0.04% user swap fees">
                <div>
                  <span className="text-slate-400 dark:text-slate-200 text-base 3xl:text-2xl font-medium">
                    Reward APY
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="whitespace-nowrap text-lg sm:text-3xl 3xl:text-4xl font-semibold">
                      {pool_data && !error ?
                        isNumber(apy) ?
                          <NumberDisplay
                            value={apy * 100}
                            maxDecimals={2}
                            suffix="%"
                            noTooltip={true}
                            className="whitespace-nowrap font-semibold"
                          /> :
                          'TBD' :
                        pool_loading && <Spinner />
                      }
                    </span>
                  </div>
                </div>
              </Tooltip>
            </div>
            {message && (
              <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-100 dark:bg-opacity-50 rounded break-all tracking-tighter text-red-600 dark:text-red-400 text-base 3xl:text-xl font-medium py-1.5 px-4">
                {message}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            <div className="order-2 lg:order-1 lg:col-span-2">
              <Info pool={pool} userPools={userPools} />
            </div>
            <Liquidity
              pool={pool}
              userPools={userPools}
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
  )
}
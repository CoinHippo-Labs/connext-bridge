import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Pools from './pools'
import { MIN_USER_DEPOSITED } from '../../lib/config'
import { getChainData, getAssetData } from '../../lib/object'
import { formatUnits } from '../../lib/number'
import { split, toArray } from '../../lib/utils'

const VIEWS = [
  { id: 'pools', title: 'Pools' },
  { id: 'my_positions', title: 'My positions' },
]

export default () => {
  const { chains, pool_assets, user_pools, dev, wallet } = useSelector(state => ({ chains: state.chains, pool_assets: state.pool_assets, user_pools: state.user_pools, dev: state.dev, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { pool_assets_data } = { ...pool_assets }
  const { user_pools_data } = { ...user_pools }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }

  const [view, setView] = useState(_.head(VIEWS)?.id)
  const [userPools, setUserPools] = useState(null)

  // user pools
  useEffect(
    () => {
      if (chains_data && user_pools_data && (getChainData(undefined, chains_data, { return_all: true }).length <= Object.keys(user_pools_data).length || Object.values(user_pools_data).flatMap(d => toArray(d)).filter(d => Number(d.lpTokenBalance) > 0).length > 0)) {
        setUserPools(Object.values(user_pools_data).flatMap(d => toArray(d)))
      }
    },
    [chains_data, user_pools_data],
  )

  // user pools
  useEffect(
    () => {
      const getData = async () => {
        if (user_pools_data && sdk && view === 'my_positions') {
          if (address) {
            let data
            for (const chain_data of chains_data) {
              const { id, chain_id, domain_id } = { ...chain_data }
              try {
                console.log('[getUserPools]', { domain_id, address })
                const response = _.cloneDeep(await sdk.sdkPool.getUserPools(domain_id, address))
                console.log('[userPools]', { domain_id, address, response })

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
                          id: [id, assets_data?.id].join('_'),
                          chain_data,
                          asset_data,
                          ...info,
                          symbols,
                          lpTokenBalance: formatUnits(lpTokenBalance),
                          poolTokenBalances: toArray(poolTokenBalances).map((b, i) => formatUnits(b, (adopted?.index === i ? adopted : local)?.decimals)),
                        }
                      }),
                    )
                  ).filter(d => d.asset_data && d.lpTokenBalance > MIN_USER_DEPOSITED)
                }
              } catch (error) {
                console.log('[getUserPools error]', { domain_id, address }, error)
              }
            }
            if (data) {
              setUserPools(data)
            }
          }
          else {
            setUserPools([])
          }
        }
      }
      getData()
    },
    [sdk, address, view],
  )

  return (
    <div className="children max-w-6.5xl 3xl:max-w-screen-2xl flex justify-center mx-auto">
      <div className="w-full space-y-4 sm:space-y-8 mt-4 sm:mt-12 mx-auto">
        <div className="flex flex-col space-y-6 sm:space-y-12 px-3">
          <h1 className="tracking-tighter text-xl sm:text-5xl 3xl:text-6xl font-semibold">
            Add liquidity to earn rewards.
          </h1>
          <div className="flex items-center">
            {VIEWS.map((d, i) => {
              const { id, title } = { ...d }
              return (
                <div
                  key={i}
                  onClick={() => setView(id)}
                  className={`cursor-pointer border-b-2 ${view === id ? 'border-slate-600 dark:border-white' : 'border-transparent text-slate-400 dark:text-slate-500'} whitespace-nowrap text-lg 3xl:text-2xl font-medium mr-2 p-2`}
                >
                  {title}
                </div>
              )
            })}
          </div>
        </div>
        <div className="px-3">
          <Pools view={view} userPools={userPools} />
        </div>
      </div>
    </div>
  )
}
import { useSelector, shallowEqual } from 'react-redux'
import { TailSpin, RotatingSquare } from 'react-loader-spinner'

import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, loader_color } from '../../lib/utils'

export default ({
  pool,
  user_pools_data,
  disabled = false,
  onSelect,
}) => {
  const { preferences, chains, pool_assets, pools } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, pool_assets: state.pool_assets, pools: state.pools }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { pool_assets_data } = { ...pool_assets }
  const { pools_data } = { ...pools }

  const {
    chain,
    asset,
  } = { ...pool }
  const chain_data = chains_data?.find(c => c?.id === chain)
  const {
    chain_id,
  } = { ...chain_data }

  const selected = !!(chain && asset)
  const no_pool = selected && pool_assets_data?.findIndex(a => a?.id === asset && a.contracts?.findIndex(a => a?.chain_id === chain_id) > -1) < 0
  const pool_data = pools_data?.find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)
  const {
    name,
    lpTokenAddress,
    liquidity,
    volume,
    fees,
    apy,
    symbol,
    symbols,
  } = { ...pool_data }
  const pool_loading = selected && !no_pool && !pool_data

  const user_pool_data = pool_data && user_pools_data?.find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)
  const {
    lpTokenBalance,
    balances,
  } = { ...user_pool_data }
  const share = lpTokenBalance * 100 / (Number(liquidity) || 1)
  const position_loading = selected && !no_pool && (!user_pools_data || pool_loading)

  return (
    <div className="sm:min-h-full border border-blue-400 dark:border-blue-800 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-600 p-6">
      {pools_data ?
        <div className="flex flex-col space-y-8 lg:space-y-20 my-auto">
          <div className="grid sm:flex sm:items-center sm:justify-between sm:space-x-2 gap-2">
            <div className="order-2 sm:order-1 flex items-center space-x-4 sm:space-x-6">
              <SelectAsset
                disabled={disabled}
                value={asset}
                onSelect={a => {
                  if (onSelect) {
                    onSelect({
                      ...pool,
                      asset: a,
                    })
                  }
                }}
                chain={chain}
                origin=""
                is_pool={true}
              />
              <div className="uppercase text-xs sm:text-sm font-semibold">
                on
              </div>
              <SelectChain
                disabled={disabled}
                value={chain}
                onSelect={c => {
                  if (onSelect) {
                    onSelect({
                      ...pool,
                      chain: c,
                    })
                  }
                }}
                origin=""
              />
            </div>
            {no_pool && (
              <span className="order-2 text-slate-400 dark:text-slate-600 text-base font-medium italic">
                No pool support
              </span>
            )}
            {name && chain_data?.explorer?.url && (
              <a
                href={`${chain_data.explorer.url}${chain_data.explorer.contract_path?.replace('{address}', lpTokenAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="order-1 sm:order-2 text-base font-bold"
              >
                {name}
              </a>
            )}
          </div>
          <div className="grid grid-flow-row grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col space-y-0.5">
              <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
                Liquidity
              </span>
              <span className="text-lg font-bold">
                {pool_data ?
                  <>
                    {number_format(liquidity, '0,0.000000')}
                  </> :
                  selected && !no_pool && (
                    pool_loading ?
                      <div className="mt-1">
                        <TailSpin color={loader_color(theme)} width="24" height="24" />
                      </div> :
                      '-'
                  )
                }
              </span>
            </div>
            <div className="flex flex-col space-y-0.5">
              <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
                Volume (24h)
              </span>
              <span className="text-lg font-bold">
                {pool_data ?
                  <>
                    {currency_symbol}
                    {number_format(volume, '0,0.000000')}
                  </> :
                  selected && !no_pool && (
                    pool_loading ?
                      <div className="mt-1">
                        <TailSpin color={loader_color(theme)} width="24" height="24" />
                      </div> :
                      '-'
                  )
                }
              </span>
            </div>
            <div className="flex flex-col space-y-0.5">
              <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
                Fees (24h)
              </span>
              <span className="text-lg font-bold">
                {pool_data ?
                  <>
                    {currency_symbol}
                    {number_format(fees, '0,0.000000')}
                  </> :
                  selected && !no_pool && (
                    pool_loading ?
                      <div className="mt-1">
                        <TailSpin color={loader_color(theme)} width="24" height="24" />
                      </div> :
                      '-'
                  )
                }
              </span>
            </div>
            <div className="flex flex-col space-y-0.5">
              <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
                APY
              </span>
              <span className="text-lg font-bold">
                {pool_data ?
                  <div className="grid sm:grid-cols-2 gap-1 mt-1">
                    {Object.entries({ ...apy }).filter(([k, v]) => !isNaN(v)).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center text-sm space-x-1"
                      >
                        <span className="capitalize">
                          {k}
                        </span>
                        <span>
                          {number_format(v, '0,0.000000')}
                          %
                        </span>
                      </div>
                    ))}
                  </div> :
                  selected && !no_pool && (
                    pool_loading ?
                      <div className="mt-1">
                        <TailSpin color={loader_color(theme)} width="24" height="24" />
                      </div> :
                      '-'
                  )
                }
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-xl font-semibold">
              Your Position
            </div>
            <div className="grid grid-flow-row grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col space-y-0.5">
                <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
                  Pool Share
                </span>
                <span className="text-lg font-bold">
                  {!isNaN(share) || (pool_data && user_pools_data) ?
                    <>
                      {number_format(share || 0, '0,0.000000')}
                      %
                    </> :
                    selected && !no_pool && (
                      position_loading ?
                        <div className="mt-0.5">
                          <RotatingSquare color={loader_color(theme)} width="24" height="24" />
                        </div> :
                        '-'
                    )
                  }
                </span>
              </div>
              <div className="flex flex-col space-y-0.5">
                <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
                  Pool Tokens
                </span>
                <span className="text-lg font-bold">
                  {!isNaN(lpTokenBalance) || (pool_data && user_pools_data) ?
                    <>
                      {number_format(lpTokenBalance || 0, '0,0.000000')}
                    </> :
                    selected && !no_pool && (
                      position_loading ?
                        <div className="mt-0.5">
                          <RotatingSquare color={loader_color(theme)} width="24" height="24" />
                        </div> :
                        '-'
                    )
                  }
                </span>
              </div>
              {symbols && (
                <>
                  {symbols[0] && (
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
                        {symbols[0]}
                      </span>
                      <span className="text-lg font-bold">
                        {!isNaN(balances?.[0]) || (pool_data && user_pools_data) ?
                          <>
                            {number_format(balances?.[0] || 0, '0,0.000000')}
                          </> :
                          selected && !no_pool && (
                            position_loading ?
                              <div className="mt-0.5">
                                <RotatingSquare color={loader_color(theme)} width="24" height="24" />
                              </div> :
                              '-'
                          )
                        }
                      </span>
                    </div>
                  )}
                  {symbols[1] && (
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
                        {symbols[1]}
                      </span>
                      <span className="text-lg font-bold">
                        {!isNaN(balances?.[1]) || (pool_data && user_pools_data) ?
                          <>
                            {number_format(balances?.[1] || 0, '0,0.000000')}
                          </> :
                          selected && !no_pool && (
                            position_loading ?
                              <div className="mt-0.5">
                                <RotatingSquare color={loader_color(theme)} width="24" height="24" />
                              </div> :
                              '-'
                          )
                        }
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div> :
        <TailSpin color={loader_color(theme)} width="36" height="36" />
      }
    </div>
  )
}
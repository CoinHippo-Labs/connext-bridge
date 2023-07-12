import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { constants } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
import _ from 'lodash'

import NumberDisplay from '../../number'
import Image from '../../image'
import { WRAPPED_PREFIX } from '../../../lib/config'
import { getChainData, getContractData, getBalanceData } from '../../../lib/object'
import { isNumber } from '../../../lib/number'
import { split, toArray, equalsIgnoreCase } from '../../../lib/utils'

export default (
  {
    chain,
    asset,
    address,
    inputSearch,
    onSelect,
    isBridge = false,
    isPool = false,
    showNextAssets = true,
    showNativeAssets = true,
    showOnlyWrappable = false,
    isDestination = false,
    sourceChain,
  },
) => {
  const { chains, assets, pool_assets, pools, balances } = useSelector(state => ({ chains: state.chains, assets: state.assets, pool_assets: state.pool_assets, pools: state.pools, balances: state.balances }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { pool_assets_data } = { ...pool_assets }
  const { pools_data } = { ...pools }
  const { balances_data } = { ...balances }

  const [filterAsset, setFilterAsset] = useState(null)

  const _assets_data = (isPool ?
    toArray(
      _.concat(
        toArray(pool_assets_data).flatMap(d => {
          const { contracts } = { ...d }
          return toArray(contracts).map(c => {
            const { chain_id } = { ...c }
            const chain_data = getChainData(chain_id, chains_data)
            return { ...d, ...c, chain_data, asset_data: d }
          })
        }),
        toArray(pools_data).map(d => {
          const { domainId, asset_data, contract_data, adopted, local } = { ...d }
          const chain_data = getChainData(domainId, chains_data)
          const { chain_id } = { ...chain_data }
          const { contracts } = { ...asset_data }
          const { contract_address, image } = { ...contract_data }

          const _contracts = _.cloneDeep(contracts).map(c => {
            if (getContractData(contract_address, contracts)) {
              const pool_token = adopted?.address && !equalsIgnoreCase(adopted.address, contract_address) ? adopted : local?.address && !equalsIgnoreCase(local.address, contract_address) ? local : null
              if (pool_token) {
                const { address, symbol, decimals } = { ...pool_token }
                const image_paths = split(image, 'normal', '/', false)
                const image_name = _.last(image_paths)
                return {
                  contract_address: address,
                  chain_id,
                  decimals,
                  symbol,
                  image: image ?
                    !symbol ?
                      image :
                      symbol.startsWith(WRAPPED_PREFIX) ?
                        !image_name.startsWith(WRAPPED_PREFIX) ?
                          image_paths.map((s, i) => i === image_paths.length - 1 ? `${WRAPPED_PREFIX}${s}` : s).join('/') :
                          image :
                        !image_name.startsWith(WRAPPED_PREFIX) ?
                          image :
                          image_paths.map((s, i) => i === image_paths.length - 1 ? s.substring(WRAPPED_PREFIX.length) : s).join('/') :
                    undefined,
                  chain_data,
                }
              }
            }
            return c
          })

          return { ...asset_data, contracts: _contracts, chain_data }
        }),
      )
    ) :
    toArray(assets_data).filter(d => !isBridge || !isDestination || (!toArray(d.exclude_destination_chains).includes(chain) && !toArray(d.exclude_source_chains).includes(sourceChain))).flatMap(d => {
      const { contracts } = { ...d }
      return toArray(contracts).filter(c => !isBridge || (c.is_bridge !== false && !getChainData(c.chain_id, chains_data)?.disabled_bridge)).map(c => {
        const { chain_id } = { ...c }
        const chain_data = getChainData(chain_id, chains_data)
        return { ...d, ...c, chain_data, asset_data: d }
      })
    })
  ).filter(d => !d.disabled && (!isDestination || (d.id === asset && d.chain_data?.id !== sourceChain)))
  const assets_data_sorted = _.orderBy(
    toArray(_assets_data).filter(d => (!inputSearch || d) && (!filterAsset || d.id === filterAsset)).flatMap(d => {
      const { chain_data, asset_data } = { ...d }
      d = asset_data ? { ...d, ...asset_data } : d
      const { symbol, image, contracts, price } = { ...d }
      const { chain_id } = { ...chain_data }
      const contract_data = getContractData(chain_id, contracts)
      const { name, next_asset, wrappable } = { ...contract_data }

      const contracts_data = toArray(
        _.concat(
          wrappable && isBridge && (showNativeAssets || showOnlyWrappable) && {
            ...contract_data,
            contract_address: ZeroAddress,
            symbol: symbol === 'DAI' ? `X${symbol}` : symbol,
            name: d.name,
            image: image?.replace('/dai.', '/xdai.'),
          },
          (!showOnlyWrappable || wrappable) && {
            ...contract_data,
            name: equalsIgnoreCase(contract_data?.symbol, `W${symbol}`) ? `Wrapped ${d.name}` : name || d.name,
          },
          next_asset && isBridge && showNextAssets && {
            ...contract_data,
            ...next_asset,
            name: `Next ${d.name}`,
            is_next_asset: true,
          },
        )
      )

      return (
        contracts_data.map(c => {
          const { contract_address, is_next_asset } = { ...c }
          const _contracts = _.cloneDeep(contracts).map(_c => getContractData(chain_id, contracts) ? c : _c)
          const { amount } = { ...getBalanceData(chain_id, contract_address, balances_data) }
          return {
            ...d,
            ...c,
            is_next_asset,
            contracts: _contracts,
            scores: toArray(
              _.concat(
                ['id', 'symbol', 'name'].map(f =>
                  split(d[f], 'lower', ' ').join(' ').startsWith(inputSearch.toLowerCase()) ?
                    inputSearch.length > 1 ?
                      inputSearch.length / d[f].length :
                      inputSearch.length > 0 ? .1 : .5 :
                    -1
                ),
                c && (
                  inputSearch.startsWith('0x') && contract_address ?
                    equalsIgnoreCase(contract_address, inputSearch) ? 1 : 0 :
                    ['symbol', 'name'].map(f =>
                      split(c[f], 'lower', ' ').join(' ').startsWith(inputSearch.toLowerCase()) ?
                        inputSearch.length > 1 ?
                          inputSearch.length / c[f].length :
                          inputSearch.length > 0 ? .1 : .5 :
                        -1
                    )
                ),
              )
            ),
            value: (isNumber(amount) ? amount : -1) * price,
          }
        })
      )
    })
    .map(d => {
      const { is_next_asset, group, scores } = { ...d }
      return {
        ...d,
        group: group || (is_next_asset ? 'NextAssets' : ''),
        max_score: _.max(scores),
      }
    })
    .filter(d => d.max_score > 1 / 10),
    ['value', 'group', 'max_score'], ['desc', 'asc', 'desc'],
  )

  return (
    <div>
      <div className="flex flex-wrap items-center mt-1 mb-2">
        {_.uniqBy(_assets_data, 'id').map((d, i) => {
          const { id, symbol, image } = { ...d }
          return (
            <div
              key={i}
              onClick={() => setFilterAsset(id)}
              className="hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded cursor-pointer flex items-center hover:font-semibold space-x-1 mb-1.5 mr-1.5 py-1 px-1.5"
            >
              {image && (
                <Image
                  src={image}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              )}
              <span className={`whitespace-nowrap ${id === filterAsset ? 'font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                {symbol}
              </span>
            </div>
          )
        })}
      </div>
      <div className="max-h-96 overflow-y-scroll">
        {assets_data_sorted.map((d, i) => {
          const { id, name, contracts, disabled, chain_data, value } = { ...d }
          const { chain_id } = { ...chain_data }
          const contract_data = getContractData(chain_id, contracts)
          const { contract_address } = { ...contract_data }
          let { symbol, image } = { ...contract_data }
          symbol = symbol || d.symbol || name
          image = image || d.image

          const selected = chain_data?.id === chain && id === asset && address && equalsIgnoreCase(contract_address, address)
          const item = (
            <div className="flex items-center space-x-2">
              {image && (
                <div className="flex items-end">
                  <Image
                    src={image}
                    width={32}
                    height={32}
                    className="rounded-full opacity-80"
                  />
                  {chain_data?.image && (
                    <Image
                      src={chain_data.image}
                      width={18}
                      height={18}
                      className="rounded-full z-10 -ml-2.5"
                    />
                  )}
                </div>
              )}
              <div className="flex items-center space-x-2">
                <span className={`whitespace-nowrap text-base ${selected ? 'font-bold' : 'font-medium'}`}>
                  {name}
                </span>
                <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-base font-medium">
                  {symbol}
                </span>
              </div>
            </div>
          )
          let { amount } = { ...getBalanceData(chain_id, contract_address, balances_data) }
          amount = isNumber(amount) ? amount : null
          const balance = balances_data?.[chain_id] && (
            <div className={`${chain_id && !amount ? 'text-slate-400 dark:text-slate-500' : ''} ${selected ? 'font-semibold' : 'font-medium'} ml-auto`}>
              {isNumber(amount) ?
                <div className="flex flex-col items-end">
                  <NumberDisplay value={amount} className="whitespace-nowrap" />
                  {value > 0 && (
                    <NumberDisplay
                      value={value}
                      prefix="$"
                      className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs font-medium"
                    />
                  )}
                </div> :
                'n/a'
              }
            </div>
          )
          const className = `dropdown-item ${disabled || !contract_data ? 'cursor-not-allowed text-slate-400 dark:text-slate-600' : selected ? 'bg-slate-100 dark:bg-slate-800 cursor-pointer' : 'hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'} rounded flex items-center justify-between space-x-2 my-1 p-2`

          return (
            <div key={i}>
              {disabled || !contract_data ?
                <div title={contract_data ? 'Disabled' : 'Not Support'} className={className}>
                  {item}
                  {balance}
                </div> :
                <div onClick={() => onSelect(chain_data?.id, id, contract_address)} className={className}>
                  {item}
                  {balance}
                </div>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}
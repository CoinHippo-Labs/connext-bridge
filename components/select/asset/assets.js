import { useSelector, shallowEqual } from 'react-redux'
import { constants } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
import _ from 'lodash'

import NumberDisplay from '../../number'
import Image from '../../image'
import { WRAPPED_PREFIX } from '../../../lib/config'
import { getChainData, getContractData, getBalanceData } from '../../../lib/object'
import { isNumber } from '../../../lib/number'
import { split, toArray, getTitle, equalsIgnoreCase } from '../../../lib/utils'

export default (
  {
    value,
    inputSearch,
    onSelect,
    chain,
    destinationChain,
    isBridge = false,
    isPool = false,
    showNextAssets = false,
    showNativeAssets = false,
    showOnlyWrappable = false,
    data,
  },
) => {
  const { chains, assets, pool_assets, pools, balances } = useSelector(state => ({ chains: state.chains, assets: state.assets, pool_assets: state.pool_assets, pools: state.pools, balances: state.balances }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { pool_assets_data } = { ...pool_assets }
  const { pools_data } = { ...pools }
  const { balances_data } = { ...balances }

  const chain_data = getChainData(chain, chains_data)
  const { chain_id, domain_id } = { ...chain_data }

  const _assets_data = (isPool ?
    toArray(
      _.concat(
        pool_assets_data,
        data && toArray(pools_data).filter(d => equalsIgnoreCase(d.domainId, domain_id)).map(d => {
          const { asset_data, contract_data, adopted, local } = { ...d }
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
                }
              }
            }
            return c
          })

          return { ...asset_data, contracts: _contracts }
        }),
      )
    ) :
    toArray(assets_data).filter(d => !isBridge || (
      toArray(d.contracts).findIndex(c => c.chain_id === chain_id && c.is_bridge !== false) > -1 &&
      (!destinationChain || (!toArray(d.exclude_destination_chains).includes(destinationChain) && !toArray(d.exclude_source_chains).includes(chain)))
    ))
  ).filter(d => !d.disabled)
  const assets_data_sorted = _.orderBy(
    toArray(_assets_data).filter(d => !inputSearch || d).flatMap(d => {
      const { symbol, image, contracts } = { ...d }
      const contract_data = getContractData(chain_id, contracts)
      const { contract_address, xERC20, next_asset, wrappable } = { ...contract_data }

      const contracts_data = toArray(
        _.concat(
          wrappable && isBridge && (showNativeAssets || showOnlyWrappable) && {
            ...contract_data,
            contract_address: ZeroAddress,
            symbol: symbol === 'DAI' ? `X${symbol}` : symbol,
            image: image?.replace('/dai.', '/xdai.'),
          },
          (!showOnlyWrappable || wrappable) && { ...contract_data },
          xERC20 && { ...contract_data, contract_address: xERC20 },
          next_asset && isBridge && showNextAssets && {
            ...contract_data,
            ...next_asset,
            is_next_asset: true,
          },
        )
      )

      return (
        contracts_data.map(c => {
          const { contract_address, is_next_asset } = { ...c }
          const _contracts = _.cloneDeep(contracts).map(_c => getContractData(chain_id, contracts) ? c : _c)
          return {
            ...d,
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
          }
        })
      )
    })
    .map(d => {
      const { is_next_asset, is_xERC20, is_alchemix, group, scores } = { ...d }
      return {
        ...d,
        group: group || (is_next_asset ? 'next_assets' : is_xERC20 ? 'xerc20' : is_alchemix ? 'alchemix' : ''),
        max_score: _.max(scores),
      }
    })
    .map(d => {
      const { group } = { ...d }
      let group_index = !group ? -1 : null
      switch (group) {
        case 'next_assets':
          group_index = 0
          break
        case 'xerc20':
          group_index = 1
          break
        case 'alchemix':
          group_index = 2
          break
        case 'other_tokens':
          group_index = 100
          break
        default:
          group_index = typeof group_index === 'number' ? group_index : 99
          break
      }
      return { ...d, group_index }
    })
    .filter(d => d.max_score > 1 / 10),
    ['group_index', 'group', 'max_score'], ['asc', 'asc', 'desc'],
  )
  const preset_assets_data = _.uniqBy(toArray(_assets_data).filter(d => d.preset), 'id')

  return (
    <div>
      {preset_assets_data.length > 0 && !showOnlyWrappable && (
        <div className="flex flex-wrap items-center mt-1 mb-4">
          {preset_assets_data.map((d, i) => {
            const { id, symbol, name, image, contracts } = { ...d }
            return (
              <div
                key={i}
                onClick={
                  () => {
                    const contract_data = getContractData(chain_id, contracts, { chain_id, return_all: true }).find(d => d.wrappable || d.contract_address)
                    const { wrappable } = { ...contract_data }
                    let { contract_address, symbol } = { ...contract_data }
                    contract_address = wrappable ? ZeroAddress : contract_address
                    symbol = wrappable ? d.symbol : symbol
                    onSelect(id, isBridge ? symbol : contract_address)
                  }
                }
                className="hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded cursor-pointer flex items-center hover:font-semibold space-x-1 mr-1.5 py-1 px-1.5"
              >
                {image && (
                  <Image
                    src={image}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                )}
                <span className={`whitespace-nowrap ${id === value ? 'font-bold' : ''}`}>
                  {symbol || name}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <div className="max-h-96 overflow-y-scroll">
        {toArray(
          assets_data_sorted.map((d, i) => {
            const { id, name, contracts, group, disabled } = { ...d }
            const contract_data = getContractData(chain_id, contracts)
            const { contract_address, xERC20 } = { ...contract_data }
            let { symbol, image } = { ...contract_data }
            symbol = symbol || d.symbol || name
            image = image || d.image

            const selected = data?.contract_address ? equalsIgnoreCase(contract_address, data.contract_address) : id === value
            const header = group && !equalsIgnoreCase(group, assets_data_sorted[i - 1]?.group) && (
              <div className={`text-slate-400 dark:text-slate-500 text-xs mt-${i === 0 ? 0.5 : 3} mb-2 ml-2`}>
                {getTitle(group)}
              </div>
            )
            const item = (
              <div className="flex items-center space-x-2">
                {image && (
                  <Image
                    src={image}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <span className={`whitespace-nowrap text-base ${selected ? 'font-bold' : 'font-medium'}`}>
                  {symbol}
                </span>
                {xERC20 && equalsIgnoreCase(contract_address, xERC20) && (
                  <span className="whitespace-nowrap text-base font-medium">
                    (xERC20)
                  </span>
                )}
              </div>
            )
            let { amount } = { ...getBalanceData(chain_id, contract_address, balances_data) }
            amount = isNumber(amount) ? amount : null
            const balance = balances_data?.[chain_id] && (
              <div className={`${chain_id && !amount ? 'text-slate-400 dark:text-slate-500' : ''} ${selected ? 'font-semibold' : 'font-medium'} ml-auto`}>
                {isNumber(amount) ?
                  <NumberDisplay value={amount} className="whitespace-nowrap" /> :
                  'n/a'
                }
              </div>
            )
            const className = `dropdown-item ${disabled || !contract_data ? 'cursor-not-allowed text-slate-400 dark:text-slate-600' : selected ? 'bg-slate-100 dark:bg-slate-800 cursor-pointer' : 'hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'} rounded flex items-center justify-between space-x-2 my-1 p-2`

            return (!equalsIgnoreCase(contract_address, xERC20) || Number(amount) > 0) && (
              <div key={i}>
                {header}
                {disabled || !contract_data ?
                  <div title={contract_data ? 'Disabled' : 'Not Support'} className={className}>
                    {item}
                    {balance}
                  </div> :
                  <div onClick={() => onSelect(id, isBridge ? xERC20 && equalsIgnoreCase(contract_address, xERC20) ? `x${symbol}` : symbol : contract_address)} className={className}>
                    {item}
                    {balance}
                  </div>
                }
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
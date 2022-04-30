import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { constants } from 'ethers'
import { Img } from 'react-image'
import { TiArrowRight } from 'react-icons/ti'

import Copy from '../../copy'

import { numberFormat } from '../../../lib/utils'

export default function Assets({ asset_id, inputSearch, handleDropdownClick, from_chain_id, chain_id, from, to, side }) {
  const { chains, assets, routers_status, routers_assets, balances } = useSelector(state => ({ chains: state.chains, assets: state.assets, routers_status: state.routers_status, routers_assets: state.routers_assets, balances: state.balances }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { routers_status_data } = { ...routers_status }
  const { routers_assets_data } = { ...routers_assets }
  const { balances_data } = { ...balances }

  const chain = chains_data?.find(c => c?.chain_id === chain_id)

  const maxTransfers = routers_assets_data && _.orderBy(
    Object.values(_.groupBy(routers_assets_data.flatMap(ra => ra?.asset_balances?.filter(ab => ab?.chain?.chain_id === chain?.chain_id) || []), 'assetId')).map(a => {
      let assets_from_chains

      if (a && routers_status_data) {
        assets_from_chains = Object.fromEntries(chains_data?.filter(c => !c.disabled).map(c => {
          const assets = a.filter(_a => routers_status_data?.findIndex(r => r?.routerAddress?.toLowerCase() === _a?.router?.id?.toLowerCase() && r?.supportedChains?.includes(c?.chain_id) && r?.supportedChains?.includes(chain?.chain_id) && r?.supportedChains?.includes(from_chain_id)) > -1)
          return [c.chain_id, _.maxBy(assets, 'amount')]
        }).filter(([key, value]) => key !== chain?.chain_id && value))
      }

      return {
        ..._.maxBy(a, 'amount_value'),
        total_amount: _.sumBy(a, 'amount'),
        total_amount_value: _.sumBy(a, 'amount_value'),
        ...assets_from_chains?.[from_chain_id],
        assets_from_chains,
      }
    }), ['value'], ['desc']
  )

  const _assets = _.orderBy(assets_data?.filter(item => !item.menu_hidden).filter(item => !inputSearch || item).map(item => {
    return { ...item, scores: ['symbol', 'id'].map(field => item[field] && item[field].toLowerCase().includes(inputSearch.toLowerCase()) ? inputSearch.length > 1 ? (inputSearch.length / item[field].length) : .5 : -1) }
  }).map(item => { return { ...item, max_score: _.max(item.scores) } }).filter(item => item.max_score > 1 / 10) || [], ['max_score'], ['desc'])

  return (
    <div className="max-h-96 overflow-y-scroll">
      {_assets?.map((item, i) => {
        const contract = item.contracts?.find(c => c?.chain_id === chain_id)
        let maxTransfer = maxTransfers?.find(t => t?.chain?.chain_id === chain_id && t?.contract_address === contract?.contract_address)
        if (!maxTransfer?.assets_from_chains?.[from_chain_id]) {
          maxTransfer = null
        }
        const balance = balances_data?.[chain_id]?.find(c => c?.contract_address === contract?.contract_address)

        return item.disabled ?
          <div
            key={i}
            title="Disabled"
            className="dropdown-item rounded-lg cursor-not-allowed flex items-center justify-start space-x-2 p-2"
          >
            <Img
              src={contract?.image || item.image}
              alt=""
              className="w-8 h-8 rounded-full"
            />
            <span className="whitespace-nowrap text-gray-400 dark:text-gray-600 text-base">{contract?.symbol || item.symbol}</span>
          </div>
          :
          <div
            key={i}
            onClick={e => {
              if (!e.target.className?.baseVal?.includes('copy') && (typeof e.target.className !== 'string' || !e.target.className?.includes('explorer'))) {
                handleDropdownClick(item.id)
              }
            }}
            className={`dropdown-item ${item.id === asset_id ? 'bg-gray-100 dark:bg-black' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} rounded-lg cursor-pointer flex items-center justify-start space-x-2 p-2`}
          >
            <Img
              src={contract?.image || item.image}
              alt=""
              className="w-8 h-8 rounded-full"
            />
            <span className={`whitespace-nowrap ${side === 'from' && chain_id && !Number(balance?.amount) ? 'text-gray-400 dark:text-gray-600' : ''} text-base ${item.id === asset_id ? 'font-semibold' : 'font-normal'}`}>{contract?.symbol || item.symbol}</span>
            {contract?.contract_address && (
              <span className="min-w-max flex items-center space-x-1">
                {/*<Copy
                  size={16}
                  text={contract.contract_address}
                  className="copy"
                />*/}
                {chain?.explorer?.url && (
                  <a
                    href={`${chain.explorer.url}${chain.explorer[`contract${contract.contract_address === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', contract.contract_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-white"
                  >
                    {chain.explorer.icon ?
                      <Img
                        src={chain.explorer.icon}
                        alt=""
                        className="explorer w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                      />
                      :
                      <TiArrowRight size={16} className="explorer transform -rotate-45" />
                    }
                  </a>
                )}
              </span>
            )}
            <div className="w-full ml-auto">
              {side === 'from' ?
                balance ?
                  <div className={`flex items-center justify-end font-mono ${chain_id && !Number(balance?.amount) ? 'text-gray-400 dark:text-gray-600' : ''} ${item.id === asset_id ? 'font-semibold' : 'font-normal'} space-x-1`}>
                    <span>{numberFormat(balance.amount, balance.amount > 10000 ? '0,0' : balance.amount > 1000 ? '0,0.00' : '0,0.000000', true)}</span>
                    <span>{contract?.symbol || balance.symbol}</span>
                  </div>
                  :
                  balances_data?.[chain_id] && (
                    <div className="font-mono text-gray-400 dark:text-gray-600 text-right">n/a</div>
                  )
                :
                contract && maxTransfer ?
                  <div className={`font-mono ${item.id === asset_id ? 'font-semibold' : 'font-normal'} text-right`}>{numberFormat(maxTransfer.amount, maxTransfer.amount > 10000 ? '0,0' : maxTransfer.amount > 1000 ? '0,0.00' : '0,0.000000', true)}</div>
                  :
                  chain && _assets.length > 0 && (
                    <div className="font-mono text-gray-400 dark:text-gray-600 text-right">n/a</div>
                  )
              }
              {(item.id === from || item.id === to) && (
                <div className="text-gray-400 dark:text-gray-500 text-right">
                  {_.uniq([item.id === from ? 'From' : 'To', item.id === to ? 'To' : 'From']).join(' & ')}
                </div>
              )}
            </div>
          </div>
      })}
    </div>
  )
}
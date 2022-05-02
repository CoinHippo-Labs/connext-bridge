import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { NxtpSdk } from '@connext/nxtp-sdk'
import { Bignumber, Wallet, providers, utils } from 'ethers'
import { Grid } from 'react-loader-spinner'
import Linkify from 'react-linkify'
import parse from 'html-react-parser'
import { MdClose } from 'react-icons/md'

import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import EnsProfile from '../ens-profile'
import Wallet as WalletComponent from '../wallet'
import Chains from './chains'
import Theme from './theme'
import Copy from '../copy'
import { announcement as getAnnouncement, chains as getChains, assets as getAssets } from '../../lib/api/config'
import { tokens as getTokens } from '../../lib/api/tokens'
import { ens as getEns } from '../../lib/api/ens'
import { coin } from '../../lib/api/coingecko'
import { assetBalances } from '../../lib/api/subgraph'
import { ellipse, loader_color } from '../../lib/utils'
import { ANNOUNCEMENT_DATA, CHAINS_DATA, ASSETS_DATA, ENS_DATA, CHAINS_STATUS_DATA, ROUTERS_STATUS_DATA, ASSET_BALANCES_DATA, ROUTERS_ASSETS_DATA, SDK, RPCS } from '../../reducers/types'

export default function Navbar() {
  const dispatch = useDispatch()
  const { preferences, chains, assets, ens, chains_status, asset_balances, dev, rpc_providers, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, ens: state.ens, chains_status: state.chains_status, asset_balances: state.asset_balances, dev: state.dev, rpc_providers: state.rpc_providers, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { ens_data } = { ...ens }
  const { chains_status_data } = { ...chains_status }
  const { asset_balances_data } = { ...asset_balances }
  const { sdk } = { ...dev }
  const { rpcs } = { ...rpc_providers }
  const { wallet_data } = { ...wallet }
  const { default_chain_id, chain_id, web3_provider, address, signer } = { ...wallet_data }

  const [hiddenStatus, setHiddenStatus] = useState(false)

  // annoucement
  useEffect(() => {
    const getData = async () => {
      const response = await getAnnouncement()
      dispatch({
        type: ANNOUNCEMENT_DATA,
        value: response,
      })
    }
    getData()
    const interval = setInterval(() => getData(), 1 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  // chains
  useEffect(() => {
    const getData = async () => {
      const response = await getChains()
      if (response) {
        dispatch({
          type: CHAINS_DATA,
          value: response.evm,
        })
      }
    }
    getData()
  }, [])

  // assets
  useEffect(() => {
    const getData = async () => {
      const response = await getAssets()
      if (response) {
        dispatch({
          type: ASSETS_DATA,
          value: response,
        })
      }
    }
    getData()
  }, [])

  // price
  useEffect(() => {
    const getData = async is_interval => {
      if (chains_data && assets_data) {
        let updated_ids = is_interval ? [] : assets_data.filter(a => a?.price).map(a => a.id)
        if (updated_ids.length < assets_data.length) {
          let updated = false
          for (let i = 0; i < chains_data.length; i++) {
            const { chain_id } = { ...chains_data[i] }
            if (chain_id) {
              const addresses = assets_data.filter(a => !updated_ids.includes(a?.id) && a?.contracts?.findIndex(c => c?.chain_id === chain_id && c.contract_address) > -1).map(a => a.contracts.find(c => c?.chain_id === chain_id).contract_address)
              if (addresses.length > 0) {
                const response = await getTokens({ chain_id, addresses })
                response?.forEach(t => {
                  const asset_index = assets_data.findIndex(a => a?.id && a.contracts?.findIndex(c => c?.chain_id === t?.chain_id && c.contract_address?.toLowerCase() === t?.contract_address?.toLowerCase()) > -1)
                  if (asset_index > -1) {
                    const asset = assets_data[asset_index]
                    asset.price = t?.price || asset.price
                    assets_data[asset_index] = asset
                    updated_ids = _.uniq(_.concat(updated_ids, asset.id))
                    updated = true
                  }
                })
              }
            }
          }
          if (updated) {
            dispatch({
              type: ASSETS_DATA,
              value: assets_data,
            })
          }
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(true), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [chains_data, assets_data])

  // sdk & rpcs
  useEffect(() => {
    const init = async () => {
      if (chains_data) {
        const chains_config = ['testnet'].includes(process.env.NEXT_PUBLIC_ENVIRONMENT) ?
          { 1: { providers: ['https://rpc.ankr.com/eth'] } } : {}
        const rpcs_config = {}
        for (let i = 0; i < chains_data.length; i++) {
          const chain_data = chains_data[i]
          const chain_id = chain_data?.chain_id
          chains_config[chain_id] = {
            providers: chain_data?.provider_params?.[0]?.rpcUrls?.filter(url => url) || [],
          }
          rpcs_config[chain_id] = new providers.FallbackProvider(chains_config[chain_id].map(url => new providers.JsonRpcProvider(url)))
        }

        dispatch({
          type: SDK,
          value: await NxtpSdk.create({
            chains: chains_config,
            signerAddress: address || Wallet.createRandom().address,
            logLevel: 'info',
            network: process.env.NEXT_PUBLIC_ENVIRONMENT,
          }),
        })
        if (!rpcs) {
          dispatch({
            type: RPCS,
            value: rpcs_config,
          })
        }
      }
    }
    init()
  }, [chains_data, chain_id, address])

  // chains status
  useEffect(() => {
    const getChainStatus = async chain_data => {
      if (chain_data) {
        const response = await sdk.getSubgraphSyncStatus(chain_data.chain_id)
        dispatch({
          type: CHAINS_STATUS_DATA,
          value: response?.latestBlock > -1 && {
            chain: chain_data,
            ...response,
          },
        })
      }
    }
    const getData = async () => {
      if (sdk && chains_data) {
        chains_data.filter(c => !c?.disabled).forEach(c => getChainStatus(c))
      }
    }
    setTimeout(() => getData(), 3 * 1000)
    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [sdk])

  // routers status
  useEffect(() => {
    const getData = async () => {
      if (sdk) {
        const response = await sdk.getRouterStatus(process.env.NEXT_PUBLIC_APP_NAME)
        if (response) {
          dispatch({
            type: ROUTERS_STATUS_DATA,
            value: response.filter(r => r?.supportedChains?.findIndex(id => chains_data?.findIndex(c => c?.chain_id === id) > -1) > -1),
          })
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [sdk])

  // assets balances
  useEffect(() => {
    const getAssetBalances = async chain_data => {
      if (chain_data && !chain_data.disabled) {
        const { chain_id } = chain_data
        const response = await assetBalances(sdk, chain_id)
        const data = response?.data?.map(a => { return { ...a, chain_data } })
        dispatch({
          type: ASSET_BALANCES_DATA,
          value: { [`${chain_id}`]: data },
        })
      }
    }
    const getData = async () => {
      if (sdk && chains_data &&
        assets_data && assets_data.findIndex(a => !a.price) < 0
      ) {
        chains_data.forEach(c => getAssetBalances(c))
      }
    }
    getData()
    const interval = setInterval(() => getData(), 1 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [sdk, chains_data, assets_data])

  // ens
  useEffect(() => {
    const getData = async () => {
      if (chains_data && asset_balances_data && chains_data.filter(c => !c?.disabled).length <= Object.keys(asset_balances_data).length) {
        const addresses = _.uniq(Object.values(asset_balances_data).flatMap(a => a || []).map(a => a?.router?.id).filter(a => a && !ens_data?.[a]))
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

  // routers assets
  useEffect(() => {
    if (assets_data && asset_balances_data) {
      const routers_assets = Object.entries(_.groupBy(Object.values(asset_balances_data).flatMap(a => a || []), 'router.id')).map(([k, v]) => {
        return {
          router_id: k,
          asset_balances: v?.map(a => {
            let asset_data = assets_data.find(_a => _a?.contracts?.findIndex(c => c?.chain_id === a?.chain_data?.chain_id && c?.contract_address?.toLowerCase() === a?.contract_address?.toLowerCase()) > -1)
            asset_data = asset_data && { ...asset_data, ...asset_data.contracts.find(c => c?.chain_id === asset_data.chain_data?.chain_id) }
            if (asset_data) {
              delete asset_data.contracts
            }
            return {
              ...a,
              asset_data,
            }
          }).map(a => {
            return {
              ...a,
              amount: utils.formatUnits(BigNumber.from(a?.amount || '0'), a?.asset_data?.contract_decimals || 0).toNumber(),
            }
          }).map(a => {
            const price = a?.asset_data?.price
            return {
              ...a,
              amount_value: a.amount * (price || 0),
            }
          }),
        }
      })
      dispatch({
        type: ROUTERS_ASSETS_DATA,
        value: routers,
      })
    }
  }, [assets_data, asset_balances_data])

  return (
    <>
      <div className="navbar">
        <div className="navbar-inner w-full sm:h-20 flex items-center justify-between">
          <div className="flex items-center">
            <Logo />
            <DropdownNavigations address={web3_provider && address} />
          </div>
          <Navigations address={web3_provider && address} />
          <div className="flex items-center">
            {web3_provider && address && (
              <div className="flex flex-col space-y-0.5">
                <EnsProfile address={address} />
                <Copy
                  value={address}
                  title={<span
                    title={address}
                    className="text-sm xl:text-base"
                  >
                    <span className="xl:hidden">
                      {ellipse(address, 12)}
                    </span>
                    <span className="hidden xl:block">
                      {ellipse(address, 16)}
                    </span>
                  </span>}
                  size={18}
                />
              </div>
            )}
            <div className="mx-2">
              <Wallet
                mainController={true}
                connectChainId={default_chain_id}
              />
            </div>
            {web3_provider && (
              <Chains />
            )}
            <Theme />
          </div>
        </div>
      </div>
      {((!chains_status_data && address) || (!hiddenStatus && process.env.NEXT_PUBLIC_STATUS_TITLE)) && (
        <div className="w-full bg-slate-100 dark:bg-slate-900 overflow-x-auto flex items-center py-2 sm:py-3 px-2 sm:px-4">
          <span className="flex flex-wrap items-center font-mono text-blue-500 dark:text-white text-2xs xl:text-sm space-x-1.5 xl:space-x-2 mx-auto">
            {!chains_status_data && address ?
              <>
                <Grid color={loader_color(theme)} width="16" height="16" />
                <span>Checking Subgraph Status</span>
              </>
              :
              <>
                <Linkify>{parse(process.env.NEXT_PUBLIC_STATUS_TITLE)}</Linkify>
                <button
                  onClick={() => setHiddenStatus(true)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full mt-0.5 p-1"
                >
                  <MdClose size={12} />
                </button>
              </>
            }
          </span>
        </div>
      )}
    </>
  )
}
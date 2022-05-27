import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { create } from '@connext/nxtp-sdk'
import { Bignumber, providers, utils } from 'ethers'
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
import { tokens as getTokens } from '../../lib/api/tokens'
import { ens as getEns } from '../../lib/api/ens'
import { ellipse, equals_ignore_case } from '../../lib/utils'
import { ANNOUNCEMENT_DATA, CHAINS_DATA, ASSETS_DATA, ENS_DATA, ASSET_BALANCES_DATA, SDK, RPCS } from '../../reducers/types'

export default function Navbar() {
  const dispatch = useDispatch()
  const { preferences, chains, assets, ens, asset_balances, rpc_providers, dev, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, ens: state.ens, asset_balances: state.asset_balances, rpc_providers: state.rpc_providers, dev: state.dev, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { ens_data } = { ...ens }
  const { asset_balances_data } = { ...asset_balances }
  const { rpcs } = { ...rpc_providers }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { default_chain_id, chain_id, provider, web3_provider, address, signer } = { ...wallet_data }

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
                  const asset_index = assets_data.findIndex(a => a?.id && a.contracts?.findIndex(c => c?.chain_id === t?.chain_id && equals_ignore_case(c.contract_address, t?.contract_address)) > -1)
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
              value: _.cloneDeep(assets_data),
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

  // rpcs
  useEffect(() => {
    const init = async => {
      if (chains_data) {
        const _rpcs = {}
        for (let i = 0; i < chains_data.length; i++) {
          const chain_data = chains_data[i]
          if (!chain_data?.disabled) {
            const chain_id = chain_data?.chain_id
            const rpc_urls = chain_data?.provider_params?.[0]?.rpcUrls?.filter(url => url) || []
            _rpcs[chain_id] = new providers.FallbackProvider(rpc_urls.map(url => new providers.JsonRpcProvider(url)))
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
      if (chains_data && assets_data?.findIndex(a => !a.price) < 0) {
        const chains_config = {}
        for (let i = 0; i < chains_data.length; i++) {
          const chain_data = chains_data[i]
          if (!chain_data?.disabled) {
            const chain_id = chain_data?.chain_id
            const domain_id = chain_data?.domain_id
            const rpc_urls = chain_data?.provider_params?.[0]?.rpcUrls?.filter(url => url) || []
            if (domain_id) {
              chains_config[domain_id] = {
                providers: rpc_urls,
                assets: assets_data.filter(a => a?.contracts?.findIndex(c => c?.chain_id === chain_id) > -1).map(a => {
                  const contract = a.contracts.find(c => c?.chain_id === chain_id)
                  const name = contract.symbol || a.symbol || a.name
                  const address = contract.contract_address
                  return { name, address }
                }),
              }
            }
          }
        }
        dispatch({
          type: SDK,
          value: await create({
            chains: chains_config,
            signerAddress: address,
            logLevel: 'info',
            network: process.env.NEXT_PUBLIC_NETWORK,
            environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
          }),
        })
      }
    }
    init()
  }, [chains_data, assets_data])

  // sdk
  useEffect(() => {
    const update = async () => {
      if (sdk && address) {
        if (sdk.nxtpSdkBase) {
          await sdk.nxtpSdkBase.changeSignerAddress(address)
        }
        if (sdk.nxtpSdkRouter) {
          await sdk.nxtpSdkRouter.changeSignerAddress(address)
        }
        dispatch({
          type: SDK,
          value: sdk,
        })
      }
    }
    update()
  }, [provider, web3_provider, address, signer])

  // assets balances
  useEffect(() => {
    const getData = async () => {
      if (sdk && chains_data &&
        assets_data && assets_data.findIndex(a => !a.price) < 0
      ) {
        const response = await sdk.nxtpSdkUtils.getRoutersData()
        if (response || !is_interval) {
          const data = _.groupBy(response?.map(l => {
            const chain_data = chains_data?.find(c => c?.domain_id?.toString() === l?.domain)
            const asset_data = assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === chain_data?.chain_id && equals_ignore_case(c?.contract_address, l?.adopted)) > -1)
            return {
              ...l,
              chain_id: chain_data?.chain_id,
              chain_data,
              contract_address: l?.adopted,
              asset_data,
              amount: BigInt(Number(l?.balance) || 0).toString(),
            }
          }) || [], 'chain_id')
          dispatch({
            type: ASSET_BALANCES_DATA,
            value: data,
          })
        }
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
        const addresses = _.uniq(Object.values(asset_balances_data).flatMap(a => a || []).map(a => a?.router_address).filter(a => a && !ens_data?.[a]))
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
            <DropdownNavigations address={web3_provider && address} />
          </div>
          <div className="flex items-center justify-center">
            <Navigations address={web3_provider && address} />
          </div>
          <div className="flex items-center justify-end">
            {web3_provider && address && (
              <div className="hidden sm:flex flex-col space-y-0.5 mx-2">
                <EnsProfile
                  address={address}
                  fallback={address && (
                    <Copy
                      value={address}
                      title={<span className="text-slate-400 dark:text-slate-200 text-sm">
                        <span className="xl:hidden">
                          {ellipse(address, 6)}
                        </span>
                        <span className="hidden xl:block">
                          {ellipse(address, 8)}
                        </span>
                      </span>}
                      size={18}
                    />
                  )}
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
              <Chains chain_id={chain_id} />
            )}
            <Theme />
          </div>
        </div>
      </div>
      {!hiddenStatus && process.env.NEXT_PUBLIC_STATUS_TITLE && (
        <div className="w-full bg-slate-100 dark:bg-slate-900 overflow-x-auto flex items-center py-2 sm:py-3 px-2 sm:px-4">
          <span className="flex flex-wrap items-center font-mono text-blue-500 dark:text-white text-2xs xl:text-sm space-x-1.5 xl:space-x-2 mx-auto">
            <Linkify>{parse(process.env.NEXT_PUBLIC_STATUS_TITLE)}</Linkify>
            <button
              onClick={() => setHiddenStatus(true)}
              className="hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full mt-0.5 p-1"
            >
              <MdClose size={12} />
            </button>
          </span>
        </div>
      )}
    </>
  )
}
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { NxtpSdk } from '@connext/nxtp-sdk'
import { providers, Wallet as EthersWallet } from 'ethers'
import BigNumber from 'bignumber.js'
import { Img } from 'react-image'
import { Grid } from 'react-loader-spinner'
import Linkify from 'react-linkify'
import parse from 'html-react-parser'
import { FiMenu, FiMoon, FiSun } from 'react-icons/fi'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'

import Logo from './logo'
import DropdownNavigation from './navigation/dropdown'
import Navigation from './navigation'
import Network from './network'
import Wallet from '../wallet'
import Copy from '../copy'

import { chains as getChains, assets, announcement } from '../../lib/api/bridge_config'
import { tokens as getTokens } from '../../lib/api/tokens'
import { domains, getENS } from '../../lib/api/ens'
import { assetBalances } from '../../lib/api/subgraph'
import { ellipseAddress } from '../../lib/utils'

import { THEME, ANNOUNCEMENT_DATA, CHAINS_DATA, ASSETS_DATA, TOKENS_DATA, ENS_DATA, CHAINS_STATUS_DATA, ROUTERS_STATUS_DATA, ASSET_BALANCES_DATA, ROUTERS_ASSETS_DATA, SDK_DATA, RPCS_DATA } from '../../reducers/types'

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function Navbar() {
  const dispatch = useDispatch()
  const { preferences, chains, tokens, ens, chains_status, asset_balances, sdk, rpcs, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, tokens: state.tokens, ens: state.ens, chains_status: state.chains_status, asset_balances: state.asset_balances, sdk: state.sdk, rpcs: state.rpcs, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { tokens_data } = { ...tokens }
  const { ens_data } = { ...ens }
  const { chains_status_data } = { ...chains_status }
  const { asset_balances_data } = { ...asset_balances }
  const { sdk_data } = { ...sdk }
  const { rpcs_data } = { ...rpcs }
  const { wallet_data } = { ...wallet }
  const { web3_provider, signer, chain_id, address, default_chain_id } = { ...wallet_data }

  const [hiddenStatus, setHiddenStatus] = useState(false)

  // annoucement
  useEffect(() => {
    const getData = async () => {
      const response = await announcement()

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

      dispatch({
        type: CHAINS_DATA,
        value: response || [],
      })
    }

    getData()
  }, [])

  // assets
  useEffect(() => {
    const getData = async () => {
      const response = await assets()

      dispatch({
        type: ASSETS_DATA,
        value: response || [],
      })
    }

    getData()
  }, [])

  // sdk & rpcs
  useEffect(async () => {
    if (chains_data) {
      const chainConfig = ['testnet'].includes(process.env.NEXT_PUBLIC_NETWORK) ?
        { 1: { providers: ['https://rpc.ankr.com/eth', 'https://cloudflare-eth.com'] } }
        :
        {}

      const rpcs = {}

      for (let i = 0; i < chains_data.length; i++) {
        const chain = chains_data[i]

        chainConfig[chain?.chain_id] = {
          providers: chain?.provider_params?.[0]?.rpcUrls?.filter(rpc => rpc && !rpc.startsWith('wss://') && !rpc.startsWith('ws://')) || [],
        }

        // if ([42161].includes(chain?.chain_id)) {
        //   chainConfig[chain?.chain_id].gelatoOracle = false;
        // }

        rpcs[chain?.chain_id] = new providers.FallbackProvider(chain?.provider_params?.[0]?.rpcUrls?.filter(rpc => rpc && !rpc.startsWith('wss://') && !rpc.startsWith('ws://')).map(rpc => new providers.JsonRpcProvider(rpc)) || [])
      }

      dispatch({
        type: SDK_DATA,
        value: await NxtpSdk.create({ chainConfig, signer: signer || EthersWallet.createRandom(), skipPolling: false }),
      })

      if (!rpcs_data) {
        dispatch({
          type: RPCS_DATA,
          value: rpcs,
        })
      }
    }
  }, [chains_data, chain_id, address])

  // chains-status
  useEffect(() => {
    const getChainStatus = async chain => {
      if (sdk_data && chain) {
        const response = await sdk_data.getSubgraphSyncStatus(chain.chain_id)

        dispatch({
          type: CHAINS_STATUS_DATA,
          value: response?.latestBlock > -1 && {
            ...chain,
            ...response,
          },
        })
      }
    }

    const getData = async () => {
      if (sdk_data && chains_data) {
        chains_data.filter(c => !c?.disabled).forEach(c => getChainStatus(c))
      }
    }

    setTimeout(() => getData(), 3 * 1000)

    const interval = setInterval(() => getData(), 3 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [sdk_data])

  // routers-status
  useEffect(() => {
    const getData = async () => {
      if (sdk_data) {
        const response = await sdk_data.getRouterStatus(process.env.NEXT_PUBLIC_APP_NAME)

        if (response) {
          dispatch({
            type: ROUTERS_STATUS_DATA,
            value: response?.filter(r => r?.supportedChains?.findIndex(id => id && chains_data?.findIndex(c => c?.chain_id === id) > -1) > -1),
          })
        }
      }
    }

    getData()

    const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [sdk_data])

  // assets-balances & tokens
  useEffect(() => {
    const getAssetBalances = async chain => {
      if (chain && !chain.disabled) {
        const response = await assetBalances(sdk_data, chain.chain_id)
        const data = response?.data?.map(a => { return { ...a, chain } })

        dispatch({
          type: ASSET_BALANCES_DATA,
          value: { [`${chain.chain_id}`]: data },
        })

        const contractAddresses = _.uniq(data?.map(a => a?.contract_address).filter(a => a && !(tokens_data?.findIndex(t => t?.chain_id === chain.chain_id && t?.contract_address === a) > -1)) || [])
        let tokenContracts

        if (contractAddresses.length > 0) {
          const responseTokens = await getTokens({ chain_id: chain.chain_id, addresses: contractAddresses.join(',') })
          tokenContracts = responseTokens?.data?.map(t => { return { ...t, id: `${chain.chain_id}_${t.contract_address}` } })
        }

        dispatch({
          type: TOKENS_DATA,
          value: tokenContracts || [],
        })
      }
    }

    const getData = async () => {
      if (sdk_data && chains_data) {
        chains_data.forEach(c => getAssetBalances(c))
      }
    }

    getData()

    const interval = setInterval(() => getData(), 1 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [chains_data, sdk_data])

  // ens
  useEffect(async () => {
    if (chains_data && asset_balances_data && chains_data.length <= Object.keys(asset_balances_data).length) {
      const evmAddresses = _.uniq(Object.values(asset_balances_data).flatMap(ab => ab)?.map(a => a?.router?.id).filter(id => id && !ens_data?.[id]) || [])
      if (evmAddresses.length > 0) {
        let ensData
        const addressChunk = _.chunk(evmAddresses, 25)

        for (let i = 0; i < addressChunk.length; i++) {
          const domainsResponse = await domains({ where: `{ resolvedAddress_in: [${addressChunk[i].map(id => `"${id?.toLowerCase()}"`).join(',')}] }` })
          ensData = _.concat(ensData || [], domainsResponse?.data || [])
        }

        if (ensData?.length > 0) {
          const ensResponses = {}
          for (let i = 0; i < evmAddresses.length; i++) {
            const evmAddress = evmAddresses[i]?.toLowerCase()
            const resolvedAddresses = ensData.filter(d => d?.resolvedAddress?.id?.toLowerCase() === evmAddress)
            if (resolvedAddresses.length > 1) {
              ensResponses[evmAddress] = await getENS(evmAddress)
            }
            else if (resolvedAddresses.length < 1) {
              ensData.push({ resolvedAddress: { id: evmAddress } })
            }
          }

          dispatch({
            type: ENS_DATA,
            value: Object.fromEntries(ensData.filter(d => !ensResponses?.[d?.resolvedAddress?.id?.toLowerCase()]?.reverseRecord || d?.name === ensResponses?.[d?.resolvedAddress?.id?.toLowerCase()].reverseRecord).map(d => [d?.resolvedAddress?.id?.toLowerCase(), { ...d }])),
          })
        }
      }
    }
  }, [chains_data, asset_balances_data])

  // routers-assets
  useEffect(() => {
    if (asset_balances_data && tokens_data) {
      const routers = Object.entries(_.groupBy(Object.values(asset_balances_data || {}).flatMap(abs => abs), 'router.id')).map(([key, value]) => {
        return {
          router_id: key,
          asset_balances: value?.map(ab => {
            return {
              ...ab,
              asset: tokens_data.find(t => t?.chain_id === ab?.chain?.chain_id && t?.contract_address === ab?.contract_address),
            }
          }).map(ab => {
            const decimals = ab?.asset?.contract_decimals

            return {
              ...ab,
              amount: typeof decimals === 'number' && BigNumber(!isNaN(ab.amount) ? ab.amount : 0).shiftedBy(-decimals).toNumber(),
            }
          }).map(ab => {
            const price = ab?.asset?.price

            return {
              ...ab,
              amount_value: typeof price === 'number' && typeof ab.amount === 'number' && (price * ab.amount),
            }
          }),
        }
      })

      dispatch({
        type: ROUTERS_ASSETS_DATA,
        value: routers,
      })
    }
  }, [asset_balances_data, tokens_data])

  return (
    <>
      <div className="navbar border-b">
        <div className="navbar-inner w-full flex xl:grid xl:grid-flow-row xl:grid-cols-9 items-center">
          <div className={`xl:col-span-${web3_provider && address ? 3 : 3}`}>
            <Logo />
          </div>
          <div className={`xl:col-span-${web3_provider && address ? 3 : 3} flex justify-center`}>
            <DropdownNavigation />
            <Navigation />
          </div>
          <div className="xl:col-span-3 flex items-center ml-auto">
            {web3_provider && address && (
              <>
                <a
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center uppercase text-blue-400 dark:text-blue-300 text-xs xl:text-sm font-medium mx-0 xl:mx-2"
                >
                  <span>Transactions</span>
                  <TiArrowRight size={20} className="transform -rotate-45 mt-0.5 sm:mt-0" />
                </a>
                <div className="hidden sm:block mx-2">
                  <Copy
                    size={16}
                    text={address}
                    copyTitle={<div className="flex items-center">
                      {ens_data?.[address?.toLowerCase()]?.name && (
                        <Img
                          src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data[address?.toLowerCase()].name}`}
                          alt=""
                          className="w-6 h-6 rounded-full mr-2"
                        />
                      )}
                      <span className="text-gray-900 dark:text-white text-xs xl:text-sm font-semibold">
                        {ellipseAddress(ens_data?.[address?.toLowerCase()]?.name, 10) || ellipseAddress(address?.toLowerCase(), 6)}
                      </span>
                    </div>}
                  />
                </div>
              </>
            )}
            <div className="mx-2">
              <Wallet
                chainIdToConnect={default_chain_id}
                main={true}
              />
            </div>
            {web3_provider && (<Network chain_id={chain_id} />)}
            <button
              onClick={() => {
                dispatch({
                  type: THEME,
                  value: theme === 'light' ? 'dark' : 'light',
                })
              }}
              className="w-10 sm:w-12 h-16 btn-transparent flex items-center justify-center"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {theme === 'light' ? (
                  <FiMoon size={16} />
                ) : (
                  <FiSun size={16} />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
      {((!chains_status_data && address) || (!hiddenStatus && process.env.NEXT_PUBLIC_STATUS_TITLE)) && (
        <div className="w-full h-8 xl:h-10 bg-gray-100 dark:bg-gray-900 overflow-x-auto flex items-center py-2 px-2 sm:px-4">
          <span className="flex flex-wrap items-center font-mono text-blue-600 dark:text-blue-400 text-2xs xl:text-sm space-x-1.5 xl:space-x-2 mx-auto">
            {!chains_status_data && address ?
              <>
                <Grid color={theme === 'dark' ? '#60A5FA' : '#2563EB'} width="16" height="16" />
                <span>Checking Subgraph Status</span>
              </>
              :
              <>
                <Linkify>{parse(process.env.NEXT_PUBLIC_STATUS_TITLE)}</Linkify>
                <button
                  onClick={() => setHiddenStatus(true)}
                  className="hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full mt-0.5 p-1"
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
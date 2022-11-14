import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import Web3Modal from 'web3modal'
import WalletConnect from '@walletconnect/web3-provider'
import Portis from '@portis/web3'
import Coinbase from '@coinbase/wallet-sdk'
import { providers, utils } from 'ethers'

import { equals_ignore_case } from '../../lib/utils'
import blocked_addresses from '../../config/blocked_addresses.json'
import { WALLET_DATA, WALLET_RESET } from '../../reducers/types'

const providerOptions = {
  walletconnect: {
    package: WalletConnect,
    options: {
      rpc: {
        1: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        56: 'https://rpc.ankr.com/bsc',
        137: 'https://rpc.ankr.com/polygon',
        43114: 'https://rpc.ankr.com/avalanche',
        10: 'https://rpc.ankr.com/optimism',
        42161: 'https://rpc.ankr.com/arbitrum',
        42170: 'https://nova.arbitrum.io/rpc',
        250: 'https://rpc.ankr.com/fantom',
        100: 'https://rpc.ankr.com/gnosis',
        1284: 'https://rpc.ankr.com/moonbeam',
        1285: 'https://rpc.api.moonriver.moonbeam.network',
        122: 'https://rpc.fuse.io',
        192837465: 'https://mainnet.gather.network',
        2001: 'https://rpc.c1.milkomeda.com:8545',
        25: 'https://evm.cronos.org',
        9001: 'https://eth.bd.evmos.org:8545',
        288: 'https://mainnet.boba.network',
        1666600000: 'https://rpc.ankr.com/harmony',
        5: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        97: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        80001: 'https://polygon-mumbai.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        43113: 'https://api.avax-test.network/ext/bc/C/rpc',
        420: 'https://goerli.optimism.io',
        421611: 'https://rinkeby.arbitrum.io/rpc',
        4002: 'https://rpc.testnet.fantom.network',
        1287: 'https://rpc.api.moonbase.moonbeam.network',
        2221: 'https://evm.evm-alpha.kava.io',
      },
    },
  },
  portis:
    process.env.NEXT_PUBLIC_PORTIS_ID &&
    {
      package: Portis,
      options: {
        id: process.env.NEXT_PUBLIC_PORTIS_ID,
      },
    },
  walletlink:
    process.env.NEXT_PUBLIC_INFURA_ID &&
    {
      package: Coinbase,
      options: {
        infuraId: process.env.NEXT_PUBLIC_INFURA_ID,
        appName: 'Coinbase Wallet',
        appLogoUrl: '/logos/wallets/coinbase.svg',
      },
    },
  tally: {
    package: null,
  },
}

const getNetwork = chain_id => {
  return {
    1: 'mainnet',
    10: 'optimism',
    25: 'cronos',
    56: 'binance',
    100: 'xdai',
    137: 'matic',
    250: 'fantom',
    1284: 'moonbeam',
    1285: 'moonriver',
    42161: 'arbitrum',
    43114: 'avalanche-mainnet',
    1666600000: 'harmony-shard1',
    1313161554: 'aurora',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    42: 'kovan',
    69: 'optimism-kovan',
    97: 'binance-testnet',
    338: 'cronos-testnet',
    43113: 'avalanche-fuji-testnet',
    80001: 'mumbai',
    421611: 'arbitrum-rinkeby',
  }[chain_id]
}

let web3Modal

export default ({
  mainController = false,
  hidden = false,
  disabled = false, 
  connectChainId,
  onSwitch,
  children,
  className = '',
}) => {
  const dispatch = useDispatch()
  const {
    preferences,
    chains,
    wallet,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    chain_id,
    provider,
    web3_provider,
  } = { ...wallet_data }

  const [defaultChainId, setDefaultChainId] = useState(null)

  useEffect(() => {
    if (
      connectChainId &&
      connectChainId !== defaultChainId
    ) {
      setDefaultChainId(connectChainId)
    }
  }, [connectChainId])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (web3_provider) {
        dispatch(
          {
            type: WALLET_DATA,
            value: {
              default_chain_id: defaultChainId,
            },
          }
        )
      }

      /*if (window.clover) {
        providerOptions['custom-clover'] = {
          package: async () => {
            let provider = null

            if (typeof window.clover !== 'undefined') {
              provider = window.clover

              try {
                await provider
                  .request(
                    {
                      method: 'eth_requestAccounts',
                    },
                  )
              } catch (error) {
                throw new Error('User Rejected')
              }
            }
            else if (typeof window.ethereum !== 'undefined') {
              provider = window.ethereum

              try {
                await provider
                  .request(
                    {
                      method: 'eth_requestAccounts',
                    },
                  )
              } catch (error) {
                throw new Error('User Rejected')
              }
            }
            else if (window.web3) {
              provider = window.web3.currentProvider
            }
            else if (window.celo) {
              provider = window.celo
            }
            else {
              throw new Error('No Web3 Provider found')
            }

            return provider
          },
          connector: async (
            ProviderPackage,
            options,
          ) => {
            const provider = new ProviderPackage(
              options,
            )

            try {
              await provider.enable()
            } catch (error) {}

            return provider
          },
          display: {
            name: 'Clover',
            logo: '/logos/wallets/clover.png',
          },
        }
      }*/

      web3Modal = new Web3Modal(
        {
          network:
            getNetwork(defaultChainId) ||
            (process.env.NETWORK === 'testnet' ?
              'goerli' :
              'mainnet'
            ),
          cacheProvider: true,
          providerOptions,
        }
      )
    }
  }, [defaultChainId])

  useEffect(() => {
    if (web3Modal?.cachedProvider) {
      connect()
    }
  }, [web3Modal])

  useEffect(() => {
    const update = async () => {
      if (web3Modal) {
        await web3Modal.updateTheme(theme)
      }
    }

    update()
  }, [theme])

  const connect = useCallback(
    async () => {
      const provider = await web3Modal.connect()
      const web3Provider = new providers.Web3Provider(provider)
      const network = await web3Provider.getNetwork()
      const signer = web3Provider.getSigner()
      const address = await signer.getAddress()

      if (
        blocked_addresses
          .findIndex(a =>
            equals_ignore_case(
              a,
              address,
            )
          ) > -1
      ) {
        dispatch(
          {
            type: WALLET_RESET,
          }
        )
      }
      else {
        const {
          chainId,
        } = { ...network }

        dispatch(
          {
            type: WALLET_DATA,
            value: {
              chain_id: chainId,
              provider,
              web3_provider: web3Provider,
              address,
              signer,
            },
          }
        )
      }
    },
    [web3Modal],
  )

  const disconnect = useCallback(
    async (
      e,
      is_reestablish,
    ) => {
      if (
        web3Modal &&
        !is_reestablish
      ) {
        await web3Modal.clearCachedProvider()
      }

      if (
        provider?.disconnect &&
        typeof provider.disconnect === 'function'
      ) {
        await provider.disconnect()
      }

      dispatch(
        {
          type: WALLET_RESET,
        }
      )
    },
    [web3Modal, provider],
  )

  const switchChain = async () => {
    if (
      connectChainId &&
      connectChainId !== chain_id &&
      provider
    ) {
      try {
        await provider
          .request(
            {
              method: 'wallet_switchEthereumChain',
              params: [
                {
                  chainId: utils.hexValue(connectChainId),
                },
              ],
            },
          )
      } catch (error) {
        const {
          code,
        } = { ...error }

        if (code === 4902) {
          try {
            const {
              provider_params,
            } = {
              ...(
                (chains_data || [])
                  .find(c =>
                    c.chain_id === connectChainId
                  )
              ),
            }

            await provider
              .request(
                {
                  method: 'wallet_addEthereumChain',
                  params: provider_params,
                },
              )
          } catch (error) {}
        }
      }
    }
  }

  useEffect(() => {
    if (provider?.on) {
      const handleChainChanged = chainId => {
        if (!chainId) {
          disconnect()
        }
        else {
          connect()
        }
      }

      const handleAccountsChanged = accounts => {
        if (!_.head(accounts)) {
          disconnect()
        }
        else {
          dispatch(
            {
              type: WALLET_DATA,
              value: {
                address: _.head(accounts),
              },
            }
          )
        }
      }

      const handleDisconnect = e => {
        const {
          code,
        } = { ...e }

        disconnect(
          e,
          code === 1013,
        )

        if (code === 1013) {
          connect()
        }
      }

      provider
        .on(
          'chainChanged',
          handleChainChanged,
        )
      provider
        .on(
          'accountsChanged',
          handleAccountsChanged,
        )
      provider
        .on(
          'disconnect',
          handleDisconnect,
        )

      return () => {
        if (provider.removeListener) {
          provider
            .removeListener(
              'chainChanged',
              handleChainChanged,
            )
          provider
            .removeListener(
              'accountsChanged',
              handleAccountsChanged,
            )
          provider
            .removeListener(
              'disconnect',
              handleDisconnect,
            )
        }
      }
    }
  }, [provider, disconnect])

  return !hidden && (
    <>
      {web3_provider ?
        !mainController &&
        connectChainId &&
        connectChainId !== chain_id ?
          <button
            disabled={disabled}
            onClick={() => {
              switchChain()

              if (onSwitch) {
                onSwitch()
              }
            }}
            className={className}
          >
            {
              children ||
              (
                <div className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap py-1 px-2">
                  Switch Network
                </div>
              )
            }
          </button> :
          <button
            disabled={disabled}
            onClick={disconnect}
            className={className}
          >
            {
              children ||
              (
                <div className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 rounded-lg whitespace-nowrap text-white py-1 px-2">
                  Disconnect
                </div>
              )
            }
          </button> :
        <button
          disabled={disabled}
          onClick={connect}
          className={className}
        >
          {
            children ||
            (
              <div className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg whitespace-nowrap text-white py-1 px-2">
                Connect
              </div>
            )
          }
        </button>
      }
    </>
  )
}
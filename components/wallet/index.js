import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { providers, utils } from 'ethers'
import { Img } from 'react-image'
import { IoWalletOutline } from 'react-icons/io5'

import { WALLET_DATA, WALLET_RESET } from '../../reducers/types'

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      rpc: {
        1: `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_ID}`,
        56: 'https://bsc-dataseed.binance.org',
        137: 'https://rpc-mainnet.maticvigil.com',
        42161: 'https://arb1.arbitrum.io/rpc',
        10: 'https://mainnet.optimism.io',
        43114: 'https://api.avax.network/ext/bc/C/rpc',
        250: 'https://rpc.ftm.tools',
        100: 'https://rpc.xdaichain.com',
        1285: 'https://rpc.moonriver.moonbeam.network',
        122: 'https://rpc.fuse.io',
        3: `https://ropsten.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_ID}`,
        4: `https://rinkey.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_ID}`,
        5: `https://goerli.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_ID}`,
        42: `https://kovan.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_ID}`,
        97: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        80001: 'https://rpc-mumbai.maticvigil.com',
        421611: 'https://rinkeby.arbitrum.io/rpc',
        69: 'https://kovan.optimism.io',
        43113: 'https://api.avax-test.network/ext/bc/C/rpc',
        4002: 'https://rpc.testnet.fantom.network',
        1287: 'https://rpc.api.moonbase.moonbeam.network',
      },
    },
  },
}

const chainIdToNetwork = chain_id => {
  return {
    1: 'mainnet',
    56: 'binance',
    137: 'matic',
    42161: 'arbitrum',
    10: 'optimism',
    // 43114: 'avax',
    // 250: 'fantom',
    100: 'xdai',
    // 1285: 'moonriver',
    // 122: 'fuse',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    42: 'kovan',
    80001: 'mumbai',
    421611: 'arbitrum-rinkeby',
  }[chain_id]
}

let web3Modal

export default function Wallet({ chainIdToConnect, main, hidden, disabled = false, buttonConnectTitle, buttonConnectClassName, buttonDisconnectTitle, buttonDisconnectClassName, onChangeNetwork }) {
  const dispatch = useDispatch()
  const { chains, wallet, preferences } = useSelector(state => ({ chains: state.chains, wallet: state.wallet, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { wallet_data } = { ...wallet }
  const { provider, web3_provider, chain_id } = { ...wallet_data }
  const { theme } = { ...preferences }

  const [defaultChainId, setDefaultChainId] = useState(null)

  useEffect(() => {
    if (chainIdToConnect && chainIdToConnect !== defaultChainId) {
      setDefaultChainId(chainIdToConnect)
    }
  }, [chainIdToConnect])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (web3_provider) {
        dispatch({
          type: WALLET_DATA,
          value: { default_chain_id: defaultChainId },
        })
      }

      web3Modal = new Web3Modal({
        network: chainIdToNetwork(defaultChainId) || 'mainnet',
        cacheProvider: true,
        providerOptions,
      })
    }
  }, [defaultChainId])

  useEffect(() => {
    if (web3Modal?.cachedProvider) {
      connect()
    }
  }, [web3Modal])

  useEffect(async () => {
    if (web3Modal) {
      await web3Modal.updateTheme(theme)
    }
  }, [theme])

  const connect = useCallback(async () => {
    const provider = await web3Modal.connect()
    const web3Provider = new providers.Web3Provider(provider)

    const signer = web3Provider.getSigner()
    const network = await web3Provider.getNetwork()
    const address = await signer.getAddress()

    dispatch({
      type: WALLET_DATA,
      value: {
        provider,
        web3_provider: web3Provider,
        signer,
        chain_id: network.chainId,
        address,
      },
    })
  }, [web3Modal])

  const disconnect = useCallback(async (e, is_reestablish) => {
    if (web3Modal && !is_reestablish) {
      await web3Modal.clearCachedProvider()
    }

    if (provider?.disconnect && typeof provider.disconnect === 'function') {
      await provider.disconnect()
    }

    dispatch({
      type: WALLET_RESET,
    })
  }, [web3Modal, provider])

  const switchNetwork = async () => {
    if (chainIdToConnect && chainIdToConnect !== chain_id && provider) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: utils.hexValue(chainIdToConnect) }],
        })
      } catch (error) {
        if (error.code === 4902) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: chains_data?.find(_chain => _chain.chain_id === chainIdToConnect)?.provider_params,
            })
          } catch (error) {
            console.log(error)
          }
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
          // dispatch({
          //   type: WALLET_DATA,
          //   value: {
          //     chain_id: Number(chainId),
          //   },
          // })
          connect()
        }
      }

      const handleAccountsChanged = accounts => {
        if (!accounts[0]) {
          disconnect()
        }
        else {
          dispatch({
            type: WALLET_DATA,
            value: {
              address: accounts[0],
            },
          })
        }
      }

      const handleDisconnect = e => {
        disconnect(e, e.code === 1013)

        if (e.code === 1013) {
          connect()
        }
      }

      provider.on('chainChanged', handleChainChanged)
      provider.on('accountsChanged', handleAccountsChanged)
      provider.on('disconnect', handleDisconnect)

      return () => {
        if (provider.removeListener) {
          provider.removeListener('chainChanged', handleChainChanged)
          provider.removeListener('accountsChanged', handleAccountsChanged)
          provider.removeListener('disconnect', handleDisconnect)
        }
      }
    }
  }, [provider, disconnect])

  return !hidden && (
    <>
      {web3_provider ?
        !main && chainIdToConnect ?
          <button
            disabled={disabled}
            onClick={() => {
              switchNetwork()

              if (onChangeNetwork) {
                onChangeNetwork()
              }
            }}
            className={buttonDisconnectClassName || 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-3xl whitespace-nowrap font-semibold py-1.5 sm:py-2 px-3 sm:px-3.5'}
          >
            {buttonDisconnectTitle || 'Wrong Network'}
          </button>
          :
          <button
            disabled={disabled}
            onClick={disconnect}
            className={buttonDisconnectClassName || 'bg-gray-100 hover:bg-gray-200 dark:bg-red-600 dark:hover:bg-red-700 rounded-3xl font-semibold py-1.5 sm:py-2 px-3 sm:px-3.5'}
          >
            {buttonDisconnectTitle || 'Disconnect'}
          </button>
        :
        <button
          disabled={disabled}
          onClick={connect}
          className={buttonConnectClassName || 'bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-3xl text-gray-100 hover:text-white font-semibold py-1.5 sm:py-2 px-3 sm:px-3.5'}
          style={buttonConnectClassName?.includes('w-full') ? null : { width: 'max-content' }}
        >
          {buttonConnectTitle || (
            <div className="flex items-center space-x-1.5">
              <span>Connect</span>
              <IoWalletOutline size={20} />
              {/*<Img
                src="/logos/wallets/metamask.png"
                alt=""
                className="w-4 h-4 -mr-1 mb-0.5"
              />*/}
            </div>
          )}
        </button>
      }
    </>
  )
}
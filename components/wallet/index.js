import { useEffect, useCallback } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { providers, utils } from 'ethers'
import { Img } from 'react-image'
import { IoWalletOutline } from 'react-icons/io5'

import { networks } from '../../lib/menus'
import { WALLET_DATA, WALLET_RESET } from '../../reducers/types'

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      infuraId: process.env.NEXT_PUBLIC_INFURA_ID,
    },
  },
}

const web3Modal = typeof window !== 'undefined' && new Web3Modal({
  network: 'mainnet', // optional
  cacheProvider: true,
  providerOptions,
})

export default function Wallet({ chainIdToConnect, hidden, buttonConnectTitle, buttonConnectClassName, buttonDisconnectTitle, buttonDisconnectClassName, onChangeNetwork }) {
  const dispatch = useDispatch()
  const { chains, wallet, preferences } = useSelector(state => ({ chains: state.chains, wallet: state.wallet, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { wallet_data } = { ...wallet }
  const { provider, web3_provider, chain_id } = { ...wallet_data }
  const { theme } = { ...preferences }

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

  const disconnect = useCallback(async () => {
    if (web3Modal) {
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
          params: [{ chainId: utils.hexlify(chainIdToConnect)?.replace('0x0', '0x') }],
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

      const handleDisconnect = ({ code }) => {
        disconnect()

        if (code === 1013) {
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
        chainIdToConnect ?
          <button
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
            onClick={disconnect}
            className={buttonDisconnectClassName || 'bg-gray-100 hover:bg-gray-200 dark:bg-red-600 dark:hover:bg-red-700 rounded-3xl font-semibold py-1.5 sm:py-2 px-3 sm:px-3.5'}
          >
            {buttonDisconnectTitle || 'Disconnect'}
          </button>
        :
        <button
          onClick={connect}
          className={buttonConnectClassName || 'bg-gray-100 hover:bg-gray-200 dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-3xl font-semibold py-1.5 sm:py-2 px-3 sm:px-3.5'}
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
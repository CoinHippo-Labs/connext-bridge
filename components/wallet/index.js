import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { usePublicClient, useNetwork, useSwitchNetwork, useWalletClient, useAccount, useDisconnect, useSignMessage } from 'wagmi'
// import { BrowserProvider, FallbackProvider, JsonRpcProvider, JsonRpcSigner } from 'ethers'
import { providers } from 'ethers'
import { hashMessage, parseAbiItem, verifyMessage } from 'viem'

import blocked_addresses from '../../config/blocked_addresses.json'
import { find } from '../../lib/utils'
import { WALLET_DATA, WALLET_RESET } from '../../reducers/types'

const publicClientToProvider = publicClient => {
  const { chain, transport } = { ...publicClient }
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  // if (transport.type === 'fallback') {
  //   const providers = transport.transports.map(({ value }) => new JsonRpcProvider(value?.url, network))
  //   if (providers.length === 1) return providers[0]
  //   return new FallbackProvider(providers)
  // }
  // return new JsonRpcProvider(transport.url, network)
  if (transport.type === 'fallback') {
    return new providers.FallbackProvider(transport.transports.map(({ value }) => new providers.JsonRpcProvider(value?.url, network)))
  }
  return new providers.JsonRpcProvider(transport.url, network)
}

const walletClientToSigner = walletClient => {
  const { account, chain, transport } = { ...walletClient }
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  // const provider = new BrowserProvider(transport, network)
  // const signer = new JsonRpcSigner(provider, account.address)
  const provider = new providers.Web3Provider(transport, network)
  const signer = provider.getSigner(account.address)
  return signer
}

export default (
  {
    hidden = false,
    disabled = false,
    connectChainId,
    onSwitch,
    children,
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const { wallet } = useSelector(state => ({ wallet: state.wallet }), shallowEqual)
  const { wallet_data } = { ...wallet }
  const { chain_id, provider } = { ...wallet_data }

  const { open } = useWeb3Modal()
  const _provider = usePublicClient()
  const { chain } = useNetwork()
  const { switchNetwork } = useSwitchNetwork()
  const { data: signer } = useWalletClient()
  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect()
  const chainId = chain?.id
  const message = process.env.NEXT_PUBLIC_APP_NAME
  const { data: signature, signMessage } = useSignMessage({ message })

  const [signatureValid, setSignatureValid] = useState()

  const validateSignature = async () => {
    const isContract = !!(await _provider.getBytecode({ address }))
    if (isContract) {
      const response = await _provider.readContract({
        address,
        abi: [parseAbiItem('function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)')],
        functionName: 'isValidSignature',
        args: [hashMessage(message), signature],
      })
      // https://eips.ethereum.org/EIPS/eip-1271
      const isValid = response === '0x1626ba7e'
      setSignatureValid(isValid)
    }
    else {
      const isValid = await verifyMessage({ address, message, signature })
      setSignatureValid(isValid)
    }
  }

  useEffect(
    () => {
      if (chainId && signer && address && !find(address, blocked_addresses)) {
        dispatch({
          type: WALLET_DATA,
          value: {
            chain_id: chainId,
            provider: publicClientToProvider(_provider),
            ethereum_provider: window?.ethereum,
            signer: walletClientToSigner(signer),
            address,
          },
        })
      }
      else {
        dispatch({ type: WALLET_RESET })
      }
    },
    [chainId, signer, address],
  )

  useEffect(
    () => {
      if (_provider) {
        validateSignature()
      }
    },
    [_provider],
  )

  return !hidden && (
    <>
      {provider ?
        connectChainId && connectChainId !== chain_id ?
          <button
            disabled={disabled}
            onClick={
              () => {
                switchNetwork(connectChainId)
                if (onSwitch) {
                  onSwitch()
                }
              }
            }
            className={className}
          >
            {children || (
              <div className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded whitespace-nowrap text-slate-600 dark:text-slate-200 py-1 px-2">
                Switch Network
              </div>
            )}
          </button> :
          <button
            disabled={disabled}
            onClick={disconnect}
            className={className}
          >
            {children || (
              <div className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 rounded whitespace-nowrap text-white py-1 px-2">
                Disconnect
              </div>
            )}
          </button> :
        <button
          disabled={disabled}
          onClick={open}
          className={className}
        >
          {children || (
            <div className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 rounded whitespace-nowrap text-white py-1 px-2">
              Connect
            </div>
          )}
        </button>
      }
    </>
  )
}
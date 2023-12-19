import { QueryClient } from '@tanstack/react-query'
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react'
import { mainnet, goerli, bsc, bscTestnet, polygon, polygonMumbai, avalanche, avalancheFuji, optimism, optimismGoerli, arbitrum, arbitrumGoerli, fantom, fantomTestnet, moonbeam, moonbaseAlpha, gnosis, linea, lineaTestnet, zkSync, zkSyncTestnet } from 'wagmi/chains'

export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

export const EVM_CHAIN_CONFIGS = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ?
  [
    { _id: 'ethereum', ...mainnet },
    { _id: 'binance', ...bsc },
    { _id: 'polygon', ...polygon },
    { _id: 'avalanche', ...avalanche },
    { _id: 'optimism', ...optimism },
    { _id: 'arbitrum', ...arbitrum },
    { _id: 'fantom', ...fantom },
    { _id: 'moonbeam', ...moonbeam },
    { _id: 'gnosis', ...gnosis },
    { _id: 'linea', ...linea },
    { _id: 'zksync', ...zkSync },
  ] :
  [
    { _id: 'goerli', ...goerli },
    { _id: 'binance', ...bscTestnet },
    { _id: 'polygon', ...polygonMumbai },
    { _id: 'avalanche', ...avalancheFuji },
    { _id: 'optimism', ...optimismGoerli },
    { _id: 'arbitrum', ...arbitrumGoerli },
    { _id: 'fantom', ...fantomTestnet },
    { _id: 'moonbeam', ...moonbaseAlpha },
    { _id: 'linea', ...lineaTestnet },
    { _id: 'zksync', ...zkSyncTestnet },
  ]

export const queryClient = new QueryClient()

export const wagmiConfig = defaultWagmiConfig({
  chains: EVM_CHAIN_CONFIGS,
  projectId: WALLETCONNECT_PROJECT_ID,
  metadata: {
    name: process.env.NEXT_PUBLIC_APP_NAME,
    description: process.env.NEXT_PUBLIC_DEFAULT_TITLE,
    icons: ['/icons/favicon-32x32.png'],
  },
})

export const WEB3MODAL = createWeb3Modal({
  wagmiConfig,
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: EVM_CHAIN_CONFIGS,
  themeVariables: {
    '--w3m-font-family': 'Manrope, sans-serif',
    '--w3m-background-color': '#1d1c1c',
    '--w3m-color-bg-1': '#1d1c1c',
    '--w3m-color-bg-2': '#27272a',
    '--w3m-color-bg-3': '#1d1c1c',
    '--w3m-color-fg-1': '#e4e7e7',
    '--w3m-color-fg-2': '#bcc2c2',
    '--w3m-color-fg-3': '#6e7777',
    '--w3m-logo-image-url': `${process.env.NEXT_PUBLIC_APP_URL}/logos/logo_with_name_white.png`,
  },
  termsConditionsUrl: process.env.NEXT_PUBLIC_TERMS_URL,
  privacyPolicyUrl: process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL,
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    '163d2cf19babf05eb8962e9748f9ebe613ed52ebf9c8107c9a0f104bfcf161b3',
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369',
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
  ],
  excludeWalletIds: [
    '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927',
  ],
})
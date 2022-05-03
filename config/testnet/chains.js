[
  {
    "id": "ropsten",
    "chain_id": 3,
    "name": "Ethereum Ropsten",
    "short_name": "ROP",
    "image": "/logos/chains/ropsten.png",
    "website": "https://ethereum.org",
    "coingecko_id": "ethereum",
    "color": "#c0c2c3",
    "provider_params": [
      {
        "chainId": "0x3",
        "chainName": "Ethereum Ropsten",
        "rpcUrls": ["https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"],
        "nativeCurrency": {
          "name": "Ropsten Ether",
          "symbol": "ROP",
          "decimals: 18"
        },
        "blockExplorerUrls": ["https://ropsten.etherscan.io"]
      }
    ],
    "explorer": {
      "name": "Etherscan",
      "url": "https://ropsten.etherscan.io",
      "icon": "/logos/explorers/etherscan.png",
      "block_path": "/block/{block}",
      "address_path": "/address/{address}",
      "contract_path": "/token/{address}",
      "contract_0_path": "/address/{address}",
      "transaction_path": "/tx/{tx}"
    }
  },
  {
    "id": "rinkeby",
    "chain_id": 4,
    "domain_id": 1111,
    "name": "Ethereum Rinkeby",
    "short_name": "RIN",
    "image": "/logos/chains/rinkeby.png",
    "website": "https://rinkeby.io",
    "coingecko_id": "ethereum",
    "color": "#c0c2c3",
    "provider_params": [
      {
        "chainId": "0x4",
        "chainName": "Ethereum Rinkeby",
        "rpcUrls": ["https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"],
        "nativeCurrency": {
          "name": "Rinkeby Ether",
          "symbol": "RIN",
          "decimals: 18"
        },
        "blockExplorerUrls": ["https://rinkeby.etherscan.io"]
      }
    ],
    "explorer": {
      "name": "Etherscan",
      "url": "https://rinkeby.etherscan.io",
      "icon": "/logos/explorers/etherscan.png",
      "block_path": "/block/{block}",
      "address_path": "/address/{address}",
      "contract_path": "/token/{address}",
      "contract_0_path": "/address/{address}",
      "transaction_path": "/tx/{tx}"
    }
  },
  {
    "id": "gorli",
    "chain_id": 5,
    "domain_id": 3331,
    "name": "Ethereum Görli",
    "short_name": "GOR",
    "image": "/logos/chains/gorli.png",
    "website": "https://goerli.net",
    "coingecko_id": "ethereum",
    "color": "#c0c2c3",
    "provider_params": [
      {
        "chainId": "0x5",
        "chainName": "Ethereum Görli",
        "rpcUrls": ["https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"],
        "nativeCurrency": {
          "name": "Görli Ether",
          "symbol": "GOR",
          "decimals: 18"
        },
        "blockExplorerUrls": ["https://goerli.etherscan.io"]
      }
    ],
    "explorer": {
      "name": "Etherscan",
      "url": "https://goerli.etherscan.io",
      "icon": "/logos/explorers/etherscan.png",
      "block_path": "/block/{block}",
      "address_path": "/address/{address}",
      "contract_path": "/token/{address}",
      "contract_0_path": "/address/{address}",
      "transaction_path": "/tx/{tx}"
    }
  },
  {
    "id": "kovan",
    "chain_id": 42,
    "domain_id": 2221,
    "name": "Ethereum Kovan",
    "short_name": "KOV",
    "image": "/logos/chains/kovan.png",
    "website": "https://kovan-testnet.github.io/website",
    "coingecko_id": "ethereum",
    "color": "#c0c2c3",
    "provider_params": [
      {
        "chainId": "0x2a",
        "chainName": "Ethereum Kovan",
        "rpcUrls": ["https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"],
        "nativeCurrency": {
          "name": "Kovan Ether",
          "symbol": "KOV",
          "decimals: 18"
        },
        "blockExplorerUrls": ["https://kovan.etherscan.io"]
      }
    ],
    "explorer": {
      "name": "Etherscan",
      "url": "https://kovan.etherscan.io",
      "icon": "/logos/explorers/etherscan.png",
      "block_path": "/block/{block}",
      "address_path": "/address/{address}",
      "contract_path": "/token/{address}",
      "contract_0_path": "/address/{address}",
      "transaction_path": "/tx/{tx}"
    }
  },
  {
    "id": "binance",
    "chain_id": 97,
    "name": "BNB Chain Testnet",
    "short_name": "BNB",
    "image": "/logos/chains/binance.png",
    "website": "https://bnbchain.world",
    "coingecko_id": "binancecoin",
    "color": "#e8b30b",
    "provider_params": [
      {
        "chainId": "0x61",
        "chainName": "BNB Chain Testnet",
        "rpcUrls": ["https://data-seed-prebsc-1-s1.binance.org:8545', 'https://data-seed-prebsc-2-s1.binance.org:8545', 'https://data-seed-prebsc-1-s2.binance.org:8545"],
        "nativeCurrency": {
          "name": "BNB Token",
          "symbol": "BNB",
          "decimals: 18"
        },
        "blockExplorerUrls": ["https://testnet.bscscan.com"]
      }
    ],
    "explorer": {
      "name": "BscScan",
      "url": "https://testnet.bscscan.com",
      "icon": "/logos/explorers/bscscan.png",
      "block_path": "/block/{block}",
      "address_path": "/address/{address}",
      "contract_path": "/token/{address}",
      "contract_0_path": "/address/{address}",
      "transaction_path": "/tx/{tx}"
    }
  },
  {
    "id": "mumbai",
    "chain_id": 80001,
    "name": "Polygon Mumbai",
    "short_name": "MUM",
    "image": "/logos/chains/mumbai.png",
    "website": "https://polygon.technology",
    "coingecko_id": "matic-network",
    "color": "#8247e5",
    "provider_params": [
      {
        "chainId": "0x13881",
        "chainName": "Polygon Mumbai",
        "rpcUrls": ["https://rpc-mumbai.matic.today', 'https://matic-mumbai.chainstacklabs.com', 'https://rpc-mumbai.maticvigil.com"],
        "nativeCurrency": {
          "name": "Matic",
          "symbol": "MATIC",
          "decimals: 18"
        },
        "blockExplorerUrls": ["https://mumbai.polygonscan.com"]
      }
    ],
    "explorer": {
      "name": "Polygonscan",
      "url": "https://mumbai.polygonscan.com",
      "icon": "/logos/explorers/polygonscan.png",
      "block_path": "/block/{block}",
      "address_path": "/address/{address}",
      "contract_path": "/token/{address}",
      "contract_0_path": "/address/{address}",
      "transaction_path": "/tx/{tx}"
    }
  },
  {
    "id": "arbitrum",
    "chain_id": 421611,
    "name": "Arbitrum Rinkeby",
    "short_name": "ARB",
    "image": "/logos/chains/arbitrum.png",
    "website": "https://arbitrum.io",
    "coingecko_id": "ethereum",
    "color": "#28a0f0",
    "provider_params": [
      {
        "chainId": "0x66eeb",
        "chainName": "Arbitrum Rinkeby",
        "rpcUrls": ["https://rinkeby.arbitrum.io/rpc"],
        "nativeCurrency": {
          "name": "Arbitrum Ether",
          "symbol": "aETH",
          "decimals: 18"
        },
        "blockExplorerUrls": ["https://rinkeby-explorer.arbitrum.io/#/"]
      }
    ],
    "explorer": {
      "name": "ARBISCAN",
      "url": "https://testnet.arbiscan.io",
      "icon": "/logos/explorers/arbiscan.png",
      "block_path": "/block/{block}",
      "address_path": "/address/{address}",
      "contract_path": "/token/{address}",
      "contract_0_path": "/address/{address}",
      "transaction_path": "/tx/{tx}"
    }
  },
  {
    "id": "optimism",
    "chain_id": 69,
    "name": "Optimism Kovan",
    "short_name": "OPT",
    "image": "/logos/chains/optimism.png",
    "website": "https://optimism.io",
    "coingecko_id": "ethereum",
    "color": "#dc2626",
    "provider_params": [
      {
        "chainId": "0x45",
        "chainName": "Optimism Kovan",
        "rpcUrls": ["https://kovan.optimism.io"],
        "nativeCurrency": {
          "name": "Ether",
          "symbol": "ETH",
          "decimals: 18"
        },
        "blockExplorerUrls": ["https://kovan-optimistic.etherscan.io"]
      }
    ],
    "explorer": {
      "name": "Etherscan",
      "url": "https://kovan-optimistic.etherscan.io",
      "icon": "/logos/explorers/optimism.png",
      "block_path": "/block/{block}",
      "address_path": "/address/{address}",
      "contract_path": "/token/{address}",
      "contract_0_path": "/address/{address}",
      "transaction_path": "/tx/{tx}"
    }
  },
  {
    "id": "moonbase",
    "chain_id": 1287,
    "domain_id": 5000,
    "name": "Moonbase Alpha",
    "short_name": "MBASE",
    "image": "/logos/chains/moonbase.png",
    "website": "https://moonbeam.network",
    "coingecko_id": "moonbeam",
    "color": "#53cbc8",
    "provider_params": [
      {
        "chainId": "0x507",
        "chainName": "Moonbase Alpha",
        "rpcUrls": ["https://rpc.api.moonbase.moonbeam.network"],
        "nativeCurrency": {
          "name": "Dev",
          "symbol": "DEV",
          "decimals: 18"
        },
        "blockExplorerUrls": ["https://moonbase.moonscan.io"]
      }
    ],
    "explorer": {
      "name": "Moonscan",
      "url": "https://moonbase.moonscan.io",
      "icon": "/logos/explorers/moonbeam.png",
      "block_path": "/block/{block}",
      "address_path": "/address/{address}",
      "contract_path": "/token/{address}",
      "contract_0_path": "/address/{address}",
      "transaction_path": "/tx/{tx}"
    }
  },
  {
    "id": "kava",
    "chain_id": 2221,
    "name": "Kava Alphanet",
    "short_name": "KAVA",
    "image": "/logos/chains/kava.png",
    "website": "https://kava.io",
    "coingecko_id": "kava",
    "color": "#ff554f",
    "provider_params": [
      {
        "chainId": "0x8ad",
        "chainName": "Kava Alphanet",
        "rpcUrls": ["https://evm.evm-alpha.kava.io"],
        "nativeCurrency": {
          "name": "Kava",
          "symbol": "KAVA",
          "decimals: 18"
        },
        "blockExplorerUrls": ["https://explorer.evm-alpha.kava.io"]
      }
    ],
    "explorer": {
      "name": "Kava",
      "url": "https://explorer.evm-alpha.kava.io",
      "icon": "/logos/explorers/kava.png",
      "block_path": "/block/{block}",
      "address_path": "/address/{address}",
      "contract_path": "/token/{address}",
      "contract_0_path": "/address/{address}",
      "transaction_path": "/tx/{tx}"
    }
  }
]
# Bridge | Connext Network

Connext Bridge is a bridge app built on top of [Connext's nxtp protocol](https://github.com/connext/nxtp). The app supports assets transfer between Layer 2 systems and Ethereum Virtual Machine (EVM) compatible chains. 


<br>

<p float="left" align="center">
<img width="646" alt="connext_swap" src="https://user-images.githubusercontent.com/13881651/154973828-1a3767e4-ca45-40ed-9ee0-4f406e9eacca.png">
<img width="356" alt="connext_confirm" src="https://user-images.githubusercontent.com/13881651/154973848-88da7726-71af-403c-8bc1-4a63f3bd981b.png">
</p>
<img width="1024" alt="connext_sign" src="https://user-images.githubusercontent.com/13881651/154971793-649cb8e3-eab1-463f-9982-109c8eb4c4cb.png">

## URLs
### Mainnet
- App: [https://bridge.connext.network](https://bridge.connext.network)
- Explorer: [https://connextscan.io](https://connextscan.io)
### Testnet
- App: [https://testnet.bridge.connext.network](https://testnet.bridge.connext.network)
- Explorer: [https://testnet.connextscan.io](https://testnet.connextscan.io)
### Connext Protocol
- Website: [https://connext.nextwork](https:/connext.nextwork)
- Doc: [https://docs.connext.network](https://docs.connext.network)

<br>

## Data provider / APIs
- [Connext Subgraph](https://github.com/connext/nxtp/tree/main/packages/subgraph)
- [Connextscan API](https://github.com/CoinHippo-Labs/connextscan-lambda)

## Technology stacks
- [Next.js](https://nextjs.org/)
- [Connext SDK](https://github.com/connext/nxtp)
- [Nomad SDK](https://github.com/nomad-xyz/nomad-monorepo)
- [web3.js](https://github.com/ChainSafe/web3.js)
- [ethers.js](https://github.com/ethers-io/ethers.js)
- [Web3Modal](https://github.com/Web3Modal/web3modal)

<br>

## Local Run
- Install dependencies
  ```
  npm install --force
  ```

- Run on [localhost:3000](http://localhost:3000)
  ```
  npm run dev
  ```

## Setup your own Bridge Dapp
We recommend you to use the code from [Bridge | CoinHippo](https://github.com/CoinHippo-Labs/coinhippo-bridge) instead. This is because most UI components and app structures are identical. Besides, the repo has been designed to be built with fewer dependencies while still can take advantage of [Connext's nxtp protocol](https://github.com/connext/nxtp).

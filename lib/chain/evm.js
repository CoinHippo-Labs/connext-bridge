import { Contract, constants, providers, utils } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
const { FallbackProvider, StaticJsonRpcProvider: JsonRpcProvider } = { ...providers }
const { keccak256, toUtf8Bytes } = { ...utils }
import _ from 'lodash'

import { getChainData } from '../object'
import { toBigNumber, formatUnits } from '../number'
import { toArray } from '../utils'

const createRpcProvider = (url, chain_id) => new JsonRpcProvider(url, chain_id ? Number(chain_id) : undefined)

export const getProvider = (chain, chains_data) => {
  const chain_data = getChainData(chain, chains_data)
  const { chain_id, deprecated, private_rpcs } = { ...chain_data }
  let { rpcs } = { ...chain_data }
  rpcs = toArray(private_rpcs || rpcs)
  if (rpcs.length > 0 && !deprecated) {
    try {
      return (
        rpcs.length > 1 ?
          new FallbackProvider(
            rpcs.map((url, i) => {
              return {
                priority: i + 1,
                provider: createRpcProvider(url, chain_id),
                stallTimeout: 1000,
                weight: 1,
              }
            }),
            rpcs.length / 3, // chain_id,
          ) :
          createRpcProvider(_.head(rpcs), chain_id)
      )
    } catch (error) {}
  }
  return null
}

export const getBalance = async (address, contract_data, chain, chains_data) => {
  let balance
  const { contract_address, decimals } = { ...contract_data }

  if (address && contract_address) {
    const chain_data = getChainData(chain, chains_data)
    const { id, private_rpcs } = { ...chain_data }
    let { rpcs } = { ...chain_data }
    rpcs = toArray(private_rpcs || rpcs)

    const request = async (url, params) => {
      const response = await fetch(url, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
      return response && await response.json()
    }

    // for (const url of toArray(rpcs)) {
    //   try {
    //     const response = await request(url, { jsonrpc: '2.0', method: contract_address === ZeroAddress ? 'eth_getBalance' : 'eth_call', params: contract_address === ZeroAddress ? [address, 'latest'] : [{ to: contract_address, data: `${keccak256(toUtf8Bytes('balanceOf(address)')).substring(0, 10)}000000000000000000000000${address.substring(2)}` }, 'latest'], id: 0 })
    //     const { result } = { ...response }
    //     if (result) {
    //       balance = toBigNumber(result)
    //       break
    //     }
    //   } catch (error) {}
    // }
    if (!balance) {
      try {
        const provider = getProvider(id, chains_data)
        if (provider) {
          if (contract_address === ZeroAddress) {
            balance = await provider.getBalance(address)
          }
          else {
            const contract = new Contract(contract_address, ['function balanceOf(address owner) view returns (uint256)'], provider)
            balance = await contract.balanceOf(address)
          }
        }
      } catch (error) {}
    }
  }
  return toBigNumber(balance)
  // return formatUnits(toBigNumber(balance), decimals)
}
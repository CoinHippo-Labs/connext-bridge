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
      return rpcs.length > 1 ?
        new FallbackProvider(
          rpcs.map((url, i) => {
            return {
              priority: i + 1,
              provider: createRpcProvider(url, chain_id),
              stallTimeout: 1000,
              weight: 1,
            }
          }),
          rpcs.length / 3,
        ) :
        createRpcProvider(_.head(rpcs), chain_id)
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
}
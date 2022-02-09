import ERC20 from '@connext/nxtp-contracts/artifacts/contracts/interfaces/IERC20Minimal.sol/IERC20Minimal.json'
import { Contract } from 'ethers'
import BigNumber from 'bignumber.js'

export const getApproved = async (signer, token_address, contract_address) => {
  try {
    const signer_address = await signer.getAddress()
    const erc20 = new Contract(token_address, ERC20.abi, signer)
    const approved = await erc20.allowance(signer_address, contract_address)
    return new BigNumber(approved.toString())
  } catch (error) {
    return new BigNumber(0)
  }
}

export const approve = async (signer, token_address, contract_address, amount) => {
  const erc20 = new Contract(token_address, ERC20.abi, signer)
  const tx = await erc20.approve(contract_address, amount)
  return tx
}
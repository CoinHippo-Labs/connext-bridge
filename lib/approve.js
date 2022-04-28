import { BigNumber, Contract } from 'ethers'
import ERC20 from '@connext/nxtp-contracts/artifacts/contracts/interfaces/IERC20Minimal.sol/IERC20Minimal.json'

export const getApproved = async (signer, token_address, contract_address) => {
  try {
    const signer_address = await signer.getAddress()
    const contract = new Contract(token_address, ERC20.abi, signer)
    const allowance = await contract.allowance(signer_address, contract_address)
    return BigNumber.from(allowance.toString())
  } catch (error) {
    return BigNumber.from('0')
  }
}

export const approve = async (signer, token_address, contract_address, amount) => {
  const contract = new Contract(token_address, ERC20.abi, signer)
  const tx = await contract.approve(contract_address, amount)
  return tx
}
import { equalsIgnoreCase } from '../utils'

export const getBalance = (
  chainId,
  contractAddress,
  data,
) => {
  let balance_data

  if (contractAddress && Array.isArray(data?.[chainId])) {
    data = data[chainId]

    balance_data =
      data
        .find(d =>
          equalsIgnoreCase(
            d?.contract_address,
            contractAddress
          )
        )
  }

  return balance_data
}
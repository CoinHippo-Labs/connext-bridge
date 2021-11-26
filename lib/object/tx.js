export const getChainTx = data => {
  // if (data) {
  //   if (data.chainId === data.sendingChainId) {
  //     data.status = 'Prepared'
  //   }
  //   else {
  //     data.status = data.status === 'Cancelled' ? data.status : 'Fulfilled'
  //   }
  // }

  switch (data?.status) {
    case 'Fulfilled':
      return data?.fulfillTransactionHash
    case 'Prepared':
      return data?.prepareTransactionHash
    default:
      return data?.cancelTransactionHash
  }
  // return data?.fulfillTransactionHash || data?.cancelTransactionHash || data?.prepareTransactionHash
}

export const getFromAddress = data => data?.initiator
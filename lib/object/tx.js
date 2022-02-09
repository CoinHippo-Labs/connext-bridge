export const tx_manager = {
  chain_tx: tx => {
    switch (tx?.status) {
      case 'Fulfilled':
        return tx?.fulfillTransactionHash
      case 'Prepared':
        return tx?.prepareTransactionHash
      default:
        return tx?.cancelTransactionHash
    }
  },
  from: tx => tx?.initiator,
}
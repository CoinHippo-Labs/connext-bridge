import { WALLET_DATA, WALLET_RESET } from './types'

const initial_wallet_data = {
  provider: null,
  web3_provider: null,
  signer: null,
  chain_id: null,
  address: null,
  default_chain_id: null,
}

export default function data(
  state = {
    [`${WALLET_DATA}`]: initial_wallet_data,
  },
  action
) {
  switch (action.type) {
    case WALLET_DATA:
      return {
        ...state,
        [`${WALLET_DATA}`]: { ...state[`${WALLET_DATA}`], ...action.value },
      }
    case WALLET_RESET:
      return {
        ...state,
        [`${WALLET_DATA}`]: initial_wallet_data,
      }
    default:
      return state
  }
}
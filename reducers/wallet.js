import { WALLET_DATA, WALLET_RESET } from './types'

const INITIAL_WALLET_DATA = {
  chain_id: null,
  provider: null,
  ethereum_provider: null,
  signer: null,
  address: null,
}

export default (
  state = {
    [WALLET_DATA]: INITIAL_WALLET_DATA,
  },
  action,
) => {
  switch (action.type) {
    case WALLET_DATA:
      return {
        ...state,
        [WALLET_DATA]: {
          ...state[WALLET_DATA],
          ...action.value,
        },
      }
    case WALLET_RESET:
      return {
        ...state,
        [WALLET_DATA]: INITIAL_WALLET_DATA,
      }
    default:
      return state
  }
}
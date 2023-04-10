import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import moment from 'moment'
import { RotatingSquare } from 'react-loader-spinner'

import DecimalsFormat from '../decimals-format'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { getBalance } from '../../lib/object/balance'
import { loaderColor } from '../../lib/utils'
import { GET_BALANCES_DATA } from '../../reducers/types'

export default (
  {
    chainId,
    asset,
    contractAddress,
    decimals = 18,
    symbol,
    hideSymbol = false,
    trigger,
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const {
    preferences,
    assets,
    rpc_providers,
    wallet,
    balances,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        assets: state.assets,
        rpc_providers: state.rpc_providers,
        wallet: state.wallet,
        balances: state.balances,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    assets_data,
  } = { ...assets }
  const {
    rpcs,
  } = { ...rpc_providers }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    signer,
  } = { ...wallet_data }
  const {
    balances_data,
  } = { ...balances }

  const [balance, setBalance] = useState(null)
  const [_trigger, setTrigger] = useState(null)

  useEffect(
    () => {
      const getData = () => {
        if (chainId && contractAddress && (trigger || _trigger)) {
          const contract_data =
            {
              contract_address: contractAddress,
              chain_id: chainId,
              decimals,
              symbol,
            }

          dispatch(
            {
              type: GET_BALANCES_DATA,
              value:
                {
                  chain: chainId,
                  contract_data,
                },
            }
          )
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(),
          30 * 1000,
        )

      return () => clearInterval(interval)
    },
    [trigger, _trigger],
  )

  useEffect(
    () => {
      const balance_data = getBalance(chainId, contractAddress, balances_data)

      if (balance_data) {
        const {
          amount,
        } = { ...balance_data }

        setBalance(amount)
      }
    },
    [balances_data],
  )

  useEffect(
    () => {
      if (['string', 'number'].includes(typeof balance)) {
        setBalance(null)
        setTrigger(moment().valueOf())
      }
    },
    [chainId, contractAddress],
  )

  const asset_data = getAsset(asset, assets_data)

  const {
    contracts,
  } = { ...asset_data }

  const contract_data = getContract(chainId, contracts)

  const {
    contract_address,
  } = { ...contract_data }

  let {
    amount,
  } = { ...getBalance(chainId, contractAddress || contract_address, balances_data) }

  amount =
    trigger ?
      balance :
      ['string', 'number'].includes(typeof amount) && !isNaN(amount) ?
        amount :
        null

  symbol = symbol || contract_data?.symbol || asset_data?.symbol

  return (
    chainId && asset &&
    (
      <div className={`flex items-center justify-center text-slate-600 dark:text-slate-50 text-sm 3xl:text-xl space-x-1 3xl:space-x-2 ${className}`}>
        {['string', 'number'].includes(typeof amount) && !isNaN(amount) ?
          <>
            <DecimalsFormat
              value={amount}
              className="font-semibold"
            />
            {
              !hideSymbol &&
              (
                <span className="hidden sm:block font-semibold">
                  {symbol}
                </span>
              )
            }
          </> :
          typeof amount === 'string' ?
            <span>
              n/a
            </span> :
            signer &&
            (
              <RotatingSquare
                width="16"
                height="16"
                color={loaderColor(theme)}
              />
            )
        }
      </div>
    )
  )
}
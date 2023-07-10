import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import moment from 'moment'

import Spinner from '../spinner'
import NumberDisplay from '../number'
import { getAssetData, getContractData, getBalanceData } from '../../lib/object'
import { isNumber } from '../../lib/number'
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
  const { assets, wallet, balances } = useSelector(state => ({ assets: state.assets, wallet: state.wallet, balances: state.balances }), shallowEqual)
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { signer } = { ...wallet_data }
  const { balances_data } = { ...balances }

  const [balance, setBalance] = useState(null)
  const [_trigger, setTrigger] = useState(null)

  useEffect(
    () => {
      const getData = () => {
        if (chainId && contractAddress && (trigger || _trigger)) {
          const contract_data = { contract_address: contractAddress, chain_id: chainId, decimals, symbol }
          dispatch({ type: GET_BALANCES_DATA, value: { chain: chainId, contract_data } })
        }
      }

      getData()
      const interval = setInterval(() => getData(), 30 * 1000)
      return () => clearInterval(interval)
    },
    [trigger, _trigger],
  )

  useEffect(
    () => {
      const balance_data = getBalanceData(chainId, contractAddress, balances_data)
      if (balance_data) {
        const { amount } = { ...balance_data }
        setBalance(amount)
      }
    },
    [balances_data],
  )

  useEffect(
    () => {
      if (isNumber(balance)) {
        setBalance(null)
        setTrigger(moment().valueOf())
      }
    },
    [chainId, contractAddress],
  )

  const asset_data = getAssetData(asset, assets_data)
  const { contracts } = { ...asset_data }
  const contract_data = getContractData(chainId, contracts)
  const { contract_address } = { ...contract_data }
  symbol = symbol || contract_data?.symbol || asset_data?.symbol
  let { amount } = { ...getBalanceData(chainId, contractAddress || contract_address, balances_data) }
  amount = trigger ? balance : isNumber(amount) ? amount : null

  return chainId && asset && (
    <div className={`flex items-center justify-center text-slate-600 dark:text-slate-50 text-sm 3xl:text-xl space-x-1 3xl:space-x-2 ${className}`}>
      {isNumber(amount) ?
        <>
          <NumberDisplay
            value={amount}
            format="0,0.000000"
            maxDecimals={6}
            className="font-semibold"
          />
          {!hideSymbol && (
            <span className="hidden sm:block font-semibold">
              {symbol}
            </span>
          )}
        </> :
        typeof amount === 'string' ?
          <span>n/a</span> :
          signer && <Spinner name="RotatingSquare" width={16} height={16} />
      }
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { IoWarning } from 'react-icons/io5'

import { toArray, equalsIgnoreCase } from '../../lib/utils'

export default (
  {
    threshold = 0.05,
    amount,
    assetPrice,
    gasFee,
    gasSymbol,
  },
) => {
  const {
    gas_tokens_price,
  } = useSelector(
    state => (
      {
        gas_tokens_price: state.gas_tokens_price,
      }
    ),
    shallowEqual,
  )
  const {
    gas_tokens_price_data,
  } = { ...gas_tokens_price }

  const [hidden, setHidden] = useState(false)

  useEffect(
    () => {
      setHidden(false)
    },
    [amount, gasFee, gasSymbol],
  )

  const {
    price,
  } = { ...toArray(gas_tokens_price_data).find(d => equalsIgnoreCase(d?.symbol, gasSymbol)) }

  return (
    !hidden && Number(amount) > 0 && assetPrice > 0 && Number(gasFee) > 0 && price > 0 &&
    (Number(gasFee) * price) / (Number(amount) * assetPrice) > 1 + threshold &&
    (
      <div className="flex items-start justify-between space-x-2">
        <div className="flex items-start space-x-1">
          <IoWarning
            size={14}
            className="min-w-max text-yellow-500 dark:text-yellow-400 mt-0.5"
          />
          <div className="text-yellow-500 dark:text-yellow-400 text-xs">
            The estimated destination gas fee is higher than {threshold * 100}% of the amount you're trying to bridge.
          </div>
        </div>
        <button
          onClick={() => setHidden(true)}
          className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-xs mt-0.5 py-1 px-1.5"
        >
          Accept
        </button>
      </div>
    )
  )
}
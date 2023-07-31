import { IoWarning } from 'react-icons/io5'

import { isNumber } from '../../../lib/number'

const LOW_THRESHOLD = 0.2
const HIGH_THRESHOLD = 5.0

export default ({ value, estimatedValue }) => {
  const _value = Number(value)
  const _estimatedValue = Number(estimatedValue)
  return isNumber(value) && ((isNumber(estimatedValue) && _estimatedValue > _value) || _value < LOW_THRESHOLD || _value > HIGH_THRESHOLD) && (
    <div className="flex items-start space-x-1.5 3xl:space-x-2.5">
      <IoWarning size={16} className="min-w-max 3xl:w-5 3xl:h-5 text-yellow-500 dark:text-yellow-400" />
      <div className="text-yellow-500 dark:text-yellow-400 text-xs 3xl:text-xl">
        {(isNumber(estimatedValue) && _estimatedValue > _value) ?
          <>
            Slippage tolerance is too low
            <br />
            (estimated: {estimatedValue}%)
            <br />
            (use a larger amount or set tolerance higher)
          </> :
          _value < LOW_THRESHOLD ? 'Your transfer may not complete due to low slippage tolerance.' : 'Your transfer may be frontrun due to high slippage tolerance.'
        }
      </div>
    </div>
  )
}
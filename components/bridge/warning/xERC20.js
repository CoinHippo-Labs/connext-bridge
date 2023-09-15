import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import { IoWarning } from 'react-icons/io5'

import { getBalanceData } from '../../../lib/object'
import { equalsIgnoreCase } from '../../../lib/utils'

const AMOUNT_THRESHOLD = 0

export default ({ asset, contract }) => {
  const { balances } = useSelector(state => ({ balances: state.balances }), shallowEqual)
  const { balances_data } = { ...balances }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { bridge } = { ...query }

  const { symbol } = { ...asset }
  const { contract_address, chain_id, xERC20 } = { ...contract }
  const { amount } = { ...getBalanceData(chain_id, xERC20, balances_data) }

  return symbol && xERC20 && (
    !equalsIgnoreCase(contract_address, xERC20) ?
      Number(amount) > AMOUNT_THRESHOLD0 && (
        <div className="flex flex-col space-y-2 mb-2">
          <div className="flex items-start space-x-1.5 3xl:space-x-2.5">
            <IoWarning size={16} className="min-w-max 3xl:w-5 3xl:h-5 text-yellow-500 dark:text-yellow-400" />
            <div className="text-yellow-500 dark:text-yellow-400 text-xs 3xl:text-xl">
              {`It looks like you did not complete a previous ${symbol} transfer, so you currently have bridgeable x${symbol} in your wallet. Would you like to complete the transfer and/or revert back to ${symbol}?`}
            </div>
          </div>
          <Link href={`${pathname.replace('[bridge]', bridge)}?symbol=x${symbol}`} className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white py-1.5 px-2">
            <span className="whitespace-nowrap text-xs font-medium">
              {`Yes, switch to x${symbol}`}
            </span>
          </Link>
        </div>
      ) :
      Number(amount) > AMOUNT_THRESHOLD && (
        <div className="flex items-start space-x-1.5 3xl:space-x-2.5 mb-1.5">
          <IoWarning size={16} className="min-w-max 3xl:w-5 3xl:h-5 text-yellow-500 dark:text-yellow-400" />
          <div className="text-yellow-500 dark:text-yellow-400 text-xs 3xl:text-xl">
            {`You have a x${symbol} balance because a previous ${symbol} transfer must have failed. Please complete transferring x${symbol} or unwrap back to ${symbol} below.`}
          </div>
        </div>
      )
  )
}
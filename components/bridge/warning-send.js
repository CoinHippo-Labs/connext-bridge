import { IoWarning } from 'react-icons/io5'

const EXCLUDE_DESTINATION_CHAINS = ['ethereum', 'gnosis']
const WARNING_ASSETS = ['usdt', 'dai']
const AMOUNT_THRESHOLD = 5000

export default ({ data }) => {
  const {
    destination_chain,
    asset,
    amount,
  } = { ...data }

  return (
    process.env.NEXT_PUBLIC_NETWORK === 'mainnet' && destination_chain && !EXCLUDE_DESTINATION_CHAINS.includes(destination_chain) && WARNING_ASSETS.includes(asset) && Number(amount) > AMOUNT_THRESHOLD &&
    (
      <div className="bg-slate-50 dark:bg-slate-800 rounded flex items-center justify-between space-x-2 py-2 pl-2 pr-2.5">
        <div className="flex items-start space-x-1.5 3xl:space-x-2.5">
          <IoWarning
            size={16}
            className="min-w-max 3xl:w-5 3xl:h-5 text-yellow-600 dark:text-yellow-400"
          />
          <div className="text-yellow-600 dark:text-yellow-400 text-xs 3xl:text-xl">
            Transfer may exceed slippage tolerance as pool liquidity is low.
          </div>
        </div>
      </div>
    )
  )
}
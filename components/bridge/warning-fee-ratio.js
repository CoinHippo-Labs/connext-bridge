import { IoWarning } from 'react-icons/io5'

const RATIO_THRESHOLD = 0.5

export default ({ ratio = 0 }) => {
  return (
    Number(ratio) > RATIO_THRESHOLD && (
      <div className="flex items-start space-x-1.5 3xl:space-x-2.5">
        <IoWarning
          size={16}
          className="min-w-max 3xl:w-5 3xl:h-5 text-yellow-600 dark:text-yellow-400"
        />
        <div className="text-yellow-600 dark:text-yellow-400 text-xs 3xl:text-xl">
          {`Fees are >${RATIO_THRESHOLD * 100}% of the sending amount.`}
        </div>
      </div>
    )
  )
}
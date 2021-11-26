import { useSelector, shallowEqual } from 'react-redux'

import moment from 'moment'
import { FaHeart } from 'react-icons/fa'

export default function Footer() {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  return (
    <div className={`footer flex flex-col md:flex-row items-center text-xs font-light p-3 ${theme}`}>
      <span className="w-full md:w-1/3 flex items-center justify-center md:justify-start text-gray-400 mt-4 md:mt-0">
      </span>
      <span className="w-full md:w-1/3 flex items-center justify-center text-gray-400 mt-4 md:mt-0">
      </span>
      <span className="w-full md:w-1/3 flex items-center justify-center md:justify-end text-gray-400 space-x-1 mt-4 md:mt-0">
        <span>© {moment().format('YYYY')} made with</span>
        <FaHeart className="text-red-400 text-xl" />
        <span>by <span className="font-semibold">{process.env.NEXT_PUBLIC_TEAM_NAME}</span> team.</span>
      </span>
    </div>
  )
}
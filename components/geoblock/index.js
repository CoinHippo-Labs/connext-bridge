import { useSelector, shallowEqual } from 'react-redux'

import { isBlock } from '../../lib/api/ip'

export default () => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { ip_data } = { ...preferences }

  return isBlock(ip_data) && (
    <div className="max-w-2md 3xl:max-w-xl bg-slate-100 dark:bg-slate-800 rounded mt-0.5 mx-auto py-6 px-4 sm:px-7">
      <span className="normal-case text-base 3xl:text-xl font-medium mx-0.5">
        Sorry, Connext is not available in your region.
      </span>
    </div>
  )
}
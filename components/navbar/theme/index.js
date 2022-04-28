import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { FiMoon, FiSun } from 'react-icons/fi'

import { THEME } from '../../../reducers/types'

export default function Theme() {
  const dispatch = useDispatch()
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  return (
    <button
      onClick={() => {
        dispatch({
          type: THEME,
          value: theme === 'light' ? 'dark' : 'light',
        })
      }}
      className="w-10 sm:w-12 h-16 btn-transparent flex items-center justify-center"
    >
      <div className="w-6 h-6 flex items-center justify-center">
        {theme === 'light' ? <FiMoon size={16} /> : <FiSun size={16} />}
      </div>
    </button>
  )
}
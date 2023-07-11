import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { RiMoonLine, RiSunLine } from 'react-icons/ri'

import { THEME } from '../../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  return (
    <button
      onClick={() => dispatch({ type: THEME, value: theme === 'light' ? 'dark' : 'light' })}
      className="w-8 3xl:w-10 h-16 3xl:h-20 flex items-center justify-center sm:mr-1"
    >
      <div className="w-6 h-6 flex items-center justify-center">
        {theme === 'light' ? <RiMoonLine size={20} className="3xl:w-6 3xl:h-6" /> : <RiSunLine size={20} className="3xl:w-6 3xl:h-6" />}
      </div>
    </button>
  )
}
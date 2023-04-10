import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { FiMoon, FiSun } from 'react-icons/fi'

import { THEME } from '../../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const {
    preferences,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }

  return (
    <button
      onClick={
        () => {
          dispatch(
            {
              type: THEME,
              value: theme === 'light' ? 'dark' : 'light',
            }
          )
        }
      }
      className="w-8 h-16 flex items-center justify-center sm:mr-1 3xl:w-10 3xl:h-20"
    >
      <div className="w-6 h-6 flex items-center justify-center">
        {theme === 'light' ?
          <FiMoon
            size={16}
            className="3xl:w-6 3xl:h-6"
          /> :
          <FiSun
            size={16}
            className="3xl:w-6 3xl:h-6"
          />
        }
      </div>
    </button>
  )
}
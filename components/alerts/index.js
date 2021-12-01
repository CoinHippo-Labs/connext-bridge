import PropTypes from 'prop-types'
import { useState } from 'react'

import { FiX } from 'react-icons/fi'

const Alert = ({
  size = 'default',
  color,
  outlined = false,
  raised = false,
  rounded = false,
  borderLeft = false,
  icon = null,
  closeDisabled = false,
  children,
  className,
}) => {
  const [hidden, setHidden] = useState(false)

  let css = []

  css.push(color)
  if (outlined) css.push(`border border-current`)
  if (raised) css.push('shadow')
  if (rounded) css.push('rounded-lg')
  if (hidden) css.push('hidden')
  if (borderLeft) css.push('border-l-4 border-current')
  if(size === 'sm') {
    css.push('p-2')
  } else {
    css.push('p-4')
  }
  if (className) {
    css.push(className)
  }
  css = css.join(' ')

  return (
    <div className={`w-full flex ${css.includes('items-') ? '' : 'items-center'} justify-start p-4 ${css}`}>
      <div className="flex-shrink">{icon}</div>
      <div className="flex-grow">{children}</div>
      {!closeDisabled && (
        <div className="flex-shrink">
          <button
            onClick={() => setHidden(!hidden)}
            className="flex items-center justify-center ml-auto"
          >
            <FiX className="w-4 h-4 stroke-current" />
          </button>
        </div>
      )}
    </div>
  )
}

Alert.propTypes = {
  color: PropTypes.string,
  outlined: PropTypes.bool,
  raised: PropTypes.bool,
  rounded: PropTypes.bool,
  icon: PropTypes.any,
  children: PropTypes.any,
}

export default Alert
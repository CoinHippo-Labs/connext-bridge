import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'

import Portal from '../portal'

import { FiX } from 'react-icons/fi'

const Notifications = ({
  visible = true,
  outerClassNames,
  innerClassNames,
  animation,
  btnTitle,
  btnClassNames,
  icon,
  content,
  hideButton,
  onClose,
}) => {
  const [open, setOpen] = useState(visible)

  const show = () => setOpen(true)

  const hide = () => {
    setOpen(false)

    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      {!hideButton && (
        <button type="button" onClick={show} className={`${btnClassNames}`}>
          {btnTitle}
        </button>
      )}
      {open && (
        <Portal selector="#portal">
          <div className={`${visible ? animation : ''} ${outerClassNames}`}>
            <div className={`w-full flex items-center justify-start p-4 ${innerClassNames}`}>
              {icon && (
                <div className="flex-shrink">{icon}</div>
              )}
              <div className="flex-grow">{content}</div>
              <div className="flex-shrink">
                <button
                  onClick={hide}
                  className="flex items-center justify-center ml-auto"
                >
                  <FiX className="w-4 h-4 stroke-current ml-2" />
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}

Notifications.propTypes = {
  visible: PropTypes.bool,
  outerClassNames: PropTypes.string,
  innerClassNames: PropTypes.string,
  animation: PropTypes.string,
  btnTitle: PropTypes.string,
  btnClassNames: PropTypes.string,
  icon: PropTypes.any,
  content: PropTypes.any,
}

export default Notifications
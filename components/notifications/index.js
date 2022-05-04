import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'

import Portal from '../portal'

export default ({
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
import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import Portal from '../portal'
import { FiX } from 'react-icons/fi'

export default function Modal({ id = 'portal', hidden, buttonTitle, disabled, onClick, buttonClassName, title, icon, body, cancelButtonTitle, cancelDisabled = false, onCancel, cancelButtonClassName, confirmButtonTitle, confirmDisabled = false, onConfirm, onConfirmHide = true, confirmButtonClassName, onClose, noButtons, modalClassName = '' }) {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const modalRef = useRef(null)

  const [open, setOpen] = useState(false)

  const show = () => {
    if (onClick) {
      onClick(true)
    }

    setOpen(true)
  }

  const hide = () => {
    if (typeof hidden !== 'boolean') {
      setOpen(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = event => {
      if (!modalRef || !modalRef.current) return false
      if (!open || modalRef.current.contains(event.target)) return false

      if (!cancelDisabled) {
        setOpen(!open)

        if (onClose) {
          onClose()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [modalRef, open, cancelDisabled])

  useEffect(() => {
    if (typeof hidden === 'boolean') {
      setOpen(!hidden)
    }
  }, [hidden])

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={show}
        className={buttonClassName || 'btn btn-default btn-rounded bg-blue-500 hover:bg-blue-600 text-white'}
      >
        {buttonTitle}
      </button>
      {open && (
        <Portal selector={`#${id}`}>
          <div className="modal-backdrop fade-in" />
          <div data-background={theme} className={`modal show ${theme === 'dark' ? 'dark' : ''}`}>
            <div ref={modalRef} className={`w-full max-w-sm lg:max-w-lg relative lg:my-4 mx-auto ${modalClassName}`}>
              <div className="w-full bg-white dark:bg-gray-900 relative outline-none rounded-lg shadow-lg border-0 border-gray-200 dark:border-gray-700 flex flex-col text-gray-900 dark:text-white">
                <div className="relative flex-auto p-4">
                  <div className="flex items-start justify-start space-x-4 p-2">
                    {icon && (
                      <div className="w-12 flex-shrink-0">{icon}</div>
                    )}
                    <div className="w-full flex flex-col">
                      <div className="text-lg font-bold mb-2">{title}</div>
                      {body}
                    </div>
                  </div>
                </div>
                {!noButtons && (
                  <div className={`border-t border-gray-200 dark:border-gray-700 border-solid rounded-b flex items-center justify-end space-x-${cancelButtonClassName?.includes('hidden') ? 0 : 2} p-4`}>
                    <button
                      type="button"
                      disabled={cancelDisabled}
                      onClick={() => {
                        if (onCancel) onCancel()
                        hide()
                      }}
                      className={cancelButtonClassName || 'btn btn-default btn-rounded bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-900 dark:text-white'}
                    >
                      {cancelButtonTitle || 'Cancel'}
                    </button>
                    <button
                      type="button"
                      disabled={confirmDisabled}
                      onClick={() => {
                        if (onConfirm) onConfirm()
                        if (onConfirmHide) hide()
                      }}
                      className={confirmButtonClassName || 'btn btn-default btn-rounded bg-blue-600 hover:bg-blue-500 text-white'}
                    >
                      {confirmButtonTitle || 'Confirm'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
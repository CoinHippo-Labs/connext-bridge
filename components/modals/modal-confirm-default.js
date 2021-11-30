import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import Portal from '../portal'
import { FiX } from 'react-icons/fi'

export default function Modal({ buttonTitle, buttonClassName, title, body, cancelButtonTitle, onCancel, confirmButtonTitle, onConfirm, confirmButtonClassName }) {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const modalRef = useRef(null)

  const [open, setOpen] = useState(false)

  const show = () => setOpen(true)

  const hide = () => {
    if (onCancel) {
      onCancel()
    }
    setOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = event => {
      if (!modalRef || !modalRef.current) return false
      if (!open || modalRef.current.contains(event.target)) return false

      setOpen(!open)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [modalRef, open])

  return (
    <>
      <button
        type="button"
        onClick={show}
        className={buttonClassName || 'btn btn-default btn-rounded bg-blue-500 hover:bg-blue-600 text-white'}
      >
        {buttonTitle}
      </button>
      {open && (
        <Portal selector="#portal">
          <div className="modal-backdrop fade-in" />
          <div data-background={theme} className={`modal show ${theme === 'dark' ? 'dark' : ''}`}>
            <div ref={modalRef} className="w-auto min-w-sm lg:max-w-lg relative mx-auto">
              <div className="modal-content">
                <div className="modal-header">
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <button
                    onClick={hide}
                    className="modal-close btn btn-transparent"
                  >
                    <FiX size={20} className="stroke-current" />
                  </button>
                </div>
                <div className="relative flex-auto p-4">{body}</div>
                <div className="modal-footer space-x-2">
                  <button
                    type="button"
                    onClick={hide}
                    className="btn btn-default btn-rounded bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    {cancelButtonTitle || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onConfirm) onConfirm()
                      hide()
                    }}
                    className={confirmButtonClassName || 'btn btn-default btn-rounded bg-blue-500 hover:bg-blue-600 text-white'}
                  >
                    {confirmButtonTitle || 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
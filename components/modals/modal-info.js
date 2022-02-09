import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import Portal from '../portal'
import { FiX } from 'react-icons/fi'

export default function Modal({ className = '', buttonTitle, buttonClassName, title, icon, body, onCancel, confirmButtonTitle, onConfirm, confirmButtonClassName }) {
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
            <div ref={modalRef} className={`w-auto ${className.includes('max-w-') ? '' : 'max-w-sm lg:max-w-lg'} relative lg:my-4 mx-auto ${className}`}>
              <div className="w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg relative border-0 border-gray-100 dark:border-gray-800 outline-none flex flex-col items-center justify-center text-gray-900 dark:text-white">
                <div className="w-full relative text-center p-4">
                  {icon}
                  <div className="w-full flex flex-col mb-4">
                    <div className="text-lg font-bold mb-2">{title}</div>
                    {body}
                  </div>
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
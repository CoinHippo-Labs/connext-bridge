import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import Portal from './portal'

export default (
  {
    id = 'portal',
    hidden,
    disabled,
    onClick,
    buttonTitle,
    buttonClassName,
    buttonStyle = {},
    title,
    icon,
    body,
    noCancelOnClickOutside = false,
    cancelDisabled = false,
    onCancel,
    cancelButtonTitle = 'Cancel',
    cancelButtonClassName = '',
    confirmDisabled = false,
    onConfirm,
    onConfirmHide = true,
    confirmButtonTitle = 'Confirm',
    confirmButtonClassName = '',
    onClose,
    noButtons,
    modalClassName = '',
  },
) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const [open, setOpen] = useState(false)

  const modalRef = useRef(null)

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

  useEffect(
    () => {
      const handleClickOutside = e => {
        if (!open || !modalRef?.current || modalRef.current.contains(e.target)) {
          return false
        }

        if (!cancelDisabled) {
          setOpen(!open)
          if (onClose) {
            onClose()
          }
        }
      }

      if (!noCancelOnClickOutside) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    },
    [modalRef, open, cancelDisabled],
  )

  useEffect(
    () => {
      if (typeof hidden === 'boolean') {
        setOpen(!hidden)
      }
    },
    [hidden],
  )

  return (
    <>
      {buttonTitle && (
        <button
          type="button"
          disabled={disabled}
          onClick={show}
          className={buttonClassName || 'btn btn-default btn-rounded bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 text-white text-sm 3xl:text-base'}
          style={buttonStyle}
        >
          {buttonTitle}
        </button>
      )}
      {open && (
        <Portal selector={`#${id}`}>
          <div className="modal-backdrop fade-in" />
          <div data-background={theme} className={`modal show ${theme === 'dark' ? 'dark' : ''}`}>
            <div
              ref={modalRef}
              className={`w-full ${modalClassName.includes('max-w-') ? '' : 'max-w-sm lg:max-w-lg'} relative lg:my-4 mx-auto ${modalClassName}`}
            >
              <div className="w-full bg-white dark:bg-slate-900 relative outline-none rounded shadow-lg border-0 flex flex-col">
                <div className="relative flex-auto p-4">
                  <div className="flex items-start justify-start space-x-4 p-2">
                    {icon && (
                      <div className="w-12 flex-shrink-0">
                        {icon}
                      </div>
                    )}
                    <div className="w-full flex flex-col">
                      <div className="uppercase text-base font-bold mb-2">
                        {title}
                      </div>
                      {body}
                    </div>
                  </div>
                </div>
                {!noButtons && (
                  <div className={`border-t border-slate-50 dark:border-slate-800 border-solid rounded-b flex items-center justify-end ${cancelButtonClassName.includes('hidden') ? 'space-x-0' : 'space-x-2'} py-4 px-6`}>
                    <button
                      type="button"
                      disabled={cancelDisabled}
                      onClick={
                        () => {
                          if (onCancel) {
                            onCancel()
                          }
                          hide()
                        }
                      }
                      className={cancelButtonClassName || 'btn btn-default btn-rounded bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-sm 3xl:text-base'}
                    >
                      {cancelButtonTitle}
                    </button>
                    <button
                      type="button"
                      disabled={confirmDisabled}
                      onClick={
                        () => {
                          if (onConfirm) {
                            onConfirm()
                          }
                          if (onConfirmHide) {
                            hide()
                          }
                        }
                      }
                      className={confirmButtonClassName || 'btn btn-default btn-rounded bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 text-white text-sm 3xl:text-base'}
                    >
                      {confirmButtonTitle}
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
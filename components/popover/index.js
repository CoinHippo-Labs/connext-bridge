import { useState, useEffect, useRef } from 'react'
import { usePopper } from 'react-popper'

export default ({
  placement,
  disabled = false,
  onClick,
  title,
  content,
  children,
  className = '',
  titleClassName = '',
  contentClassName = '',
}) => {
  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const popoverRef = useRef(null)

  const { styles, attributes } = usePopper(
    buttonRef.current,
    popoverRef.current,
    {
      placement,
      modifiers: [
        {
          name: 'offset',
          enabled: true,
          options: {
            offset: [0, 0]
          }
        }
      ]
    }
  )

  useEffect(() => {
    const handleClickOutside = e => {
      if (hidden || buttonRef.current.contains(e.target) || popoverRef.current.contains(e.target)) return false
      setHidden(!hidden)
    }

    const handleMouseEnter = e => {
      if (buttonRef.current.contains(e.target) || popoverRef.current.contains(e.target)) setHidden(false)
    }

    const handleMouseLeave = e => {
      if (buttonRef.current.contains(e.target) || popoverRef.current.contains(e.target)) setHidden(true)
    }

    document.addEventListener('mousedown', handleClickOutside)
    buttonRef?.current?.addEventListener('mouseenter', handleMouseEnter)
    buttonRef?.current?.addEventListener('mouseleave', handleMouseLeave)
    popoverRef?.current?.addEventListener('mouseenter', handleMouseEnter)
    popoverRef?.current?.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      buttonRef?.current?.removeEventListener('mouseenter', handleMouseEnter)
      buttonRef?.current?.removeEventListener('mouseleave', handleMouseLeave)
      popoverRef?.current?.removeEventListener('mouseenter', handleMouseEnter)
      popoverRef?.current?.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [hidden, popoverRef, buttonRef])

  return (
    <div className="flex">
      <button
        ref={buttonRef}
        disabled={disabled}
        onClick={() => {
          setHidden(!hidden)
          if (onClick) {
            onClick()
          }
        }}
        className={`btn btn-rounded ${className}`}
      >
        {children}
      </button>
      <div ref={popoverRef} { ...attributes.popper } style={styles.popper}>
        <div
          className={`${hidden ? 'hidden' : 'block'} w-auto bg-white dark:bg-black rounded-lg shadow-lg border-0 border-slate-200 dark:border-slate-900 z-10 no-underline break-words text-sm font-normal`}
          style={styles.offset}
        >
          <div className={`bg-slate-100 dark:bg-black rounded-t-lg border-b border-solid border-slate-200 dark:border-slate-900 uppercase font-semibold mb-0 p-2 ${titleClassName}`}>
            {title}
          </div>
          <div className={`p-2 ${contentClassName}`}>
            {content}
          </div>
        </div>
      </div>
    </div>
  )
}
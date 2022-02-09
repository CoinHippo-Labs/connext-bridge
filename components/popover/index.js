import { useState, useEffect, useRef } from 'react'
import { usePopper } from 'react-popper'

export default function Popover({ placement, title, content, children, className = '', titleClassName = '', contentClassName = '' }) {
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
    const handleClickOutside = event => {
      if (
        hidden ||
        buttonRef.current.contains(event.target) ||
        popoverRef.current.contains(event.target)
      ) {
        return false
      }
      setHidden(!hidden)
    }

    const handleMouseEnter = event => {
      if (
        buttonRef.current.contains(event.target) ||
        popoverRef.current.contains(event.target)
      ) {
        setHidden(false)
      }
    }

    const handleMouseLeave = event => {
      if (
        buttonRef.current.contains(event.target) ||
        popoverRef.current.contains(event.target)
      ) {
        setHidden(true)
      }
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

  const handlePopoverClick = () => setHidden(!hidden)

  return (
    <div className="flex">
      <button
        ref={buttonRef}
        onClick={handlePopoverClick}
        className={`btn btn-rounded ${className}`}
      >
        {children}
      </button>
      <div ref={popoverRef} { ...attributes.popper } style={styles.popper}>
        <div
          className={`w-auto no-underline break-words rounded-lg shadow-lg z-10 bg-white dark:bg-black border-0 border-gray-200 dark:border-gray-900 text-gray-900 dark:text-white text-sm font-normal ${hidden ? 'hidden' : 'block'}`}
          style={styles.offset}
        >
          <div className={`bg-gray-100 dark:bg-black border-b border-solid border-gray-200 dark:border-gray-900 rounded-t-lg uppercase text-gray-900 dark:text-white font-semibold mb-0 p-2 ${titleClassName}`}>
            {title}
          </div>
          <div className={`p-2 ${contentClassName}`}>{content}</div>
        </div>
      </div>
    </div>
  )
}
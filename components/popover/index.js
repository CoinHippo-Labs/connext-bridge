import { useState, useEffect, useRef } from 'react'
import { usePopper } from 'react-popper'

export default function Popover({ placement, title, content, children, className = '' }) {
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

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [hidden, popoverRef, buttonRef])

  const handlePopoverClick = () => setHidden(!hidden)

  return (
    <div className="flex relative">
      <button
        ref={buttonRef}
        onClick={handlePopoverClick}
        className={`btn btn-rounded ${className}`}
      >
        {children}
      </button>
      <div ref={popoverRef} { ...attributes.popper } style={styles.popper}>
        <div
          className={`w-auto no-underline break-words rounded-lg shadow-lg z-10 bg-white dark:bg-gray-800 border-0 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-normal ${hidden ? 'hidden' : 'block'}`}
          style={styles.offset}
        >
          <div className="bg-gray-100 dark:bg-gray-800 border-b border-solid border-gray-200 dark:border-gray-700 rounded-t-lg uppercase text-gray-900 dark:text-white font-semibold mb-0 p-2">
            {title}
          </div>
          <div className="p-2">{content}</div>
        </div>
      </div>
    </div>
  )
}
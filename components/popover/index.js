import { useState, useEffect, useRef } from 'react'
import { usePopper } from 'react-popper'

export default (
  {
    placement,
    disabled = false,
    onClick,
    title,
    content,
    children,
    className = '',
    titleClassName = '',
    contentClassName = '',
  },
) => {
  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const popoverRef = useRef(null)

  const {
    styles,
    attributes,
  } = usePopper(
    buttonRef.current,
    popoverRef.current,
    {
      placement,
      modifiers:
        [
          {
            name: 'offset',
            enabled: true,
            options: {
              offset:
                [
                  [
                    'top',
                    'bottom',
                  ].includes(placement) ?
                    -50 :
                    0,
                  0,
                ],
            },
          },
        ],
    },
  )

  useEffect(
    () => {
      const handleClickOutside = e => {
        if (
          hidden ||
          buttonRef.current.contains(e.target) ||
          popoverRef.current.contains(e.target)
        ) {
          return false
        }

        setHidden(!hidden)
      }

      const handleMouseEnter = e => {
        if (
          buttonRef.current.contains(e.target) ||
          popoverRef.current.contains(e.target)
        ) {
          setHidden(false)
        }
      }

      const handleMouseLeave = e => {
        if (
          buttonRef.current.contains(e.target) ||
          popoverRef.current.contains(e.target)
        ) {
          setHidden(true)
        }
      }

      document
        .addEventListener(
          'mousedown',
          handleClickOutside,
        )

      if (buttonRef?.current) {
        buttonRef.current
          .addEventListener(
            'mouseenter',
            handleMouseEnter,
          )
        buttonRef.current
          .addEventListener(
            'mouseleave',
            handleMouseLeave,
          )
      }

      if (popoverRef?.current) {
        popoverRef.current
          .addEventListener(
            'mouseenter',
            handleMouseEnter,
          )
        popoverRef.current
          .addEventListener(
            'mouseleave',
            handleMouseLeave,
          )
      }

      return () => {
        document
          .removeEventListener(
            'mousedown',
            handleClickOutside,
          )

        if (buttonRef?.current) {
          buttonRef.current
            .removeEventListener(
              'mouseenter',
              handleMouseEnter,
            )
          buttonRef.current
            .removeEventListener(
              'mouseleave',
              handleMouseLeave,
            )
        }

        if (popoverRef?.current) {
          popoverRef.current
            .removeEventListener(
              'mouseenter',
              handleMouseEnter,
            )
          popoverRef.current
            .removeEventListener(
              'mouseleave',
              handleMouseLeave,
            )
        }
      }
    },
    [hidden, popoverRef, buttonRef],
  )

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
        className={className}
      >
        {children}
      </button>
      <div
        ref={popoverRef}
        { ...attributes.popper }
        style={styles.popper}
      >
        <div
          className={`${hidden ? 'hidden' : 'block'} w-auto bg-light dark:bg-dark rounded shadow z-10 no-underline break-words text-sm font-medium`}
          style={styles.offset}
        >
          {
            title &&
            (
              <div className={`bg-slate-50 dark:bg-slate-900 rounded-t border-b border-solid border-slate-100 dark:border-slate-800 uppercase font-semibold mb-0 p-2 ${titleClassName}`}>
                {title}
              </div>
            )
          }
          <div className={`p-2 ${contentClassName}`}>
            {content}
          </div>
        </div>
      </div>
    </div>
  )
}
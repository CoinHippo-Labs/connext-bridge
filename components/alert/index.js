import { useState } from 'react'
import { BiX, BiMessageError, BiMessageCheck, BiMessageDetail } from 'react-icons/bi'

export default (
  {
    size = 'default',
    status,
    color,
    outlined = false,
    raised = false,
    rounded = true,
    borderLeft = false,
    icon = null,
    closeDisabled = false,
    children,
    className = 'text-white text-sm 3xl:text-base font-medium',
  },
) => {
  const [hidden, setHidden] = useState(false)

  const iconCSS = `w-4 sm:w-6 h-4 sm:h-6 ${className?.includes('p-3') ? 'mr-2.5' : 'mr-3'}`
  switch (status) {
    case 'success':
      color = color || 'bg-green-400 dark:bg-green-500'
      icon = icon || <BiMessageCheck className={iconCSS} />
      break
    case 'failed':
      color = color || 'bg-red-400 dark:bg-red-500'
      icon = icon || <BiMessageError className={iconCSS} />
      break
    default:
      color = color || 'bg-blue-400 dark:bg-blue-500'
      icon = icon || <BiMessageDetail className={iconCSS} />
      break
  }

  let css = [color]
  if (outlined) css.push('border border-current')
  if (raised) css.push('shadow')
  if (rounded) css.push('rounded')
  if (hidden) css.push('hidden')
  if (borderLeft) css.push('border-l-4 border-current')
  if (size === 'sm') css.push('p-2')
  else css.push('p-4.5')
  if (className) css.push(className)
  css = css.join(' ')

  return (
    <div className={`w-full flex ${css.includes('items-') ? '' : 'items-center'} justify-start ${css}`}>
      <div className="flex-shrink">
        {icon}
      </div>
      <div className="flex-grow">
        {children}
      </div>
      {!closeDisabled && (
        <div className="flex-shrink">
          <button
            onClick={() => setHidden(!hidden)}
            className="flex items-center justify-center ml-auto"
          >
            <BiX className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
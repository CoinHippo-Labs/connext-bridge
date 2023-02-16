import { useState } from 'react'
import { BiX } from 'react-icons/bi'

export default (
  {
    size = 'default',
    color,
    outlined = false,
    raised = false,
    rounded = false,
    borderLeft = false,
    icon = null,
    closeDisabled = false,
    children,
    className = '',
  },
) => {
  const [hidden, setHidden] = useState(false)

  let css = [color]

  if (outlined)
    css.push(`border border-current`)
  if (raised)
    css.push('shadow')
  if (rounded)
    css.push('rounded')
  if (hidden)
    css.push('hidden')
  if (borderLeft)
    css.push('border-l-4 border-current')

  if (size === 'sm') {
    css.push('p-2')
  }
  else {
    css.push('p-4')
  }

  if (className)
    css.push(className)

  css = css.join(' ')

  return (
    <div className={`w-full flex ${css.includes('items-') ? '' : 'items-center'} justify-start p-4 ${css}`}>
      <div className="flex-shrink">
        {icon}
      </div>
      <div className="flex-grow">
        {children}
      </div>
      {
        !closeDisabled &&
        (
          <div className="flex-shrink">
            <button
              onClick={() => setHidden(!hidden)}
              className="flex items-center justify-center ml-auto"
            >
              <BiX
                className="w-4 h-4 stroke-current"
              />
            </button>
          </div>
        )
      }
    </div>
  )
}
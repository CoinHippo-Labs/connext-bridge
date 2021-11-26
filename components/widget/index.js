import PropTypes from 'prop-types'

const Widget = ({ title = null, description = null, right = null, className = '', contentClassName = '', titleSubTitleClassName = '', onClick, children }) => {
  return (
    <div onClick={onClick} className={`widget w-full ${className.includes('bg-') ? '' : 'bg-white dark:bg-gray-900'} ${className.includes('border-') ? '' : 'border border-gray-100 dark:border-gray-800'} rounded-lg ${className.includes('p-') ? '' : 'p-4'} ${className}`}>
      {(title || description || right) && (
        <div className={`flex flex-row ${contentClassName.includes('items-') ? '' : 'items-center'} justify-between ${contentClassName}`}>
          <div className={`w-full ${titleSubTitleClassName.includes('flex') ? '' : 'flex flex-col'} ${titleSubTitleClassName}`}>
            <div className="text-gray-500 text-sm font-medium">{title}</div>
            <div className="text-sm font-semibold">{description}</div>
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

Widget.propTypes = {
  title: PropTypes.any,
  description: PropTypes.any,
  right: PropTypes.any,
  className: PropTypes.string,
  contentClassName: PropTypes.string,
  titleSubTitleClassName: PropTypes.string,
  onClick: PropTypes.any,
  children: PropTypes.any,
}

export default Widget
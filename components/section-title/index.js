import PropTypes from 'prop-types'

const SectionTitle = ({ title, subtitle, right = null, className = '', subTitleClassName = '' }) => {
  return (
    <div className="section-title w-full mb-4 pt-3">
      <div className={`flex flex-row ${className.includes(' items-') ? '' : 'items-center'} justify-between mb-4 ${className}`}>
        <div className="flex flex-col">
          <div className="uppercase text-gray-500 text-xs font-normal">{title}</div>
          <div className={`${subTitleClassName.includes('min-w-') ? '' : 'min-w-max'} text-xl font-semibold ${subTitleClassName}`}>{subtitle}</div>
        </div>
        {right}
      </div>
    </div>
  )
}

SectionTitle.propTypes = {
  title: PropTypes.any,
  subtitle: PropTypes.any,
  right: PropTypes.any,
  className: PropTypes.string,
  subTitleClassName: PropTypes.string,
}

export default SectionTitle
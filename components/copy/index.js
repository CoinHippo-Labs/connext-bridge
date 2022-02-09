import { useState, useEffect } from 'react'

import PropTypes from 'prop-types'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { BsCheckCircleFill } from 'react-icons/bs'
import { MdContentCopy } from 'react-icons/md'

const Copy = ({ text, copyTitle, size = 16, onCopy, className = '' }) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const timeout = copied ? setTimeout(() => setCopied(false), 1 * 1000) : null
    return () => clearTimeout(timeout)
  }, [copied, setCopied])

  return copied ?
    <div className={`${copyTitle ? 'min-w-max' : ''} flex items-center space-x-1`}>
      {copyTitle && (
        <span className="text-gray-400 dark:text-gray-600 font-medium">{copyTitle}</span>
      )}
      <BsCheckCircleFill size={size} className={`text-green-400 dark:text-white ${className}`} />
    </div>
    :
    <CopyToClipboard
      text={text}
      onCopy={() => {
        setCopied(true)
        if (onCopy) {
          onCopy()
        }
      }}
    >
      <div className={`${copyTitle ? 'min-w-max' : ''} flex items-center space-x-1`}>
        {copyTitle && (
          <span className="cursor-pointer text-gray-400 dark:text-gray-600 font-medium">{copyTitle}</span>
        )}
        <MdContentCopy size={size} className={`cursor-pointer ${className.includes('text-') ? '' : 'text-gray-300 hover:text-gray-400 dark:text-gray-600 dark:hover:text-gray-500'} ${className}`} />
      </div>
    </CopyToClipboard>
}

Copy.propTypes = {
  text: PropTypes.string,
  copyTitle: PropTypes.any,
  size: PropTypes.number,
  className:PropTypes.string,
}

export default Copy
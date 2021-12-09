import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'
import { BsCheckCircleFill } from 'react-icons/bs'

export default function AdvancedOptions({ applied = false, initialOptions, updateOptions }) {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const [options, setOptions] = useState(initialOptions)
  const [collapse, setCollapse] = useState(true)

  const items = [
    {
      label: 'Infinite Approval',
      name: 'infinite_approval',
      type: 'checkbox',
      options: [{ value: true, label: 'Activate Infinite Approval' }],
    },
    {
      label: 'Receiving address',
      name: 'receiving_address',
      type: 'text',
      placeholder: 'Send funds to an address other than your current wallet',
    },
    {
      label: 'Contract Address',
      name: 'contract_address',
      type: 'text',
      placeholder: 'To call a contract',
    },
    {
      label: 'Call Data',
      name: 'call_data',
      type: 'text',
      placeholder: 'Only when calling a contract directly',
    },
    {
      label: 'Preferred Router',
      name: 'preferred_router',
      type: 'text',
      placeholder: 'Specify a target router to handle transaction',
    },
  ]

  useEffect(() => {
    setOptions(initialOptions)
  }, [initialOptions])

  return (
    <>
      <button
        onClick={() => setCollapse(!collapse)}
        className="bg-transparent text-gray-400 dark:text-gray-500 flex items-center text-sm space-x-1 ml-auto"
      >
        {applied && (
          <>
            <BsCheckCircleFill size={16} className="text-green-500" />
            <span />
          </>
        )}
        <span className={`${applied ? 'text-gray-600 dark:text-gray-300' : ''}`}>Advanced Options</span>
        {collapse ?
          <BiChevronDown size={20} />
          :
          <BiChevronUp size={20} />
        }
      </button>
      {!collapse && (
        <div className="form">
          {items.map((item, i) => (
            <div key={i} className="form-element">
              {item.label && (
                <div className="form-label text-gray-600 dark:text-gray-400 font-medium">{item.label}</div>
              )}
              {item.type === 'checkbox' ?
                <div className="flex items-center space-x-2">
                  {item.options?.map((option, j) => (
                    <label key={j} className="flex items-center space-x-2">
                      <input
                        type={item.type}
                        value={option.value}
                        checked={options?.[item.name]}
                        onChange={e => setOptions({ ...options, [`${item.name}`]: e.target.checked })}
                        className="form-checkbox w-4 h-4 dark:border-0 focus:ring-0 dark:focus:ring-gray-700 rounded-lg"
                      />
                      <span className="text-gray-500 dark:text-gray-500">{option.label}</span>
                    </label>
                  ))}
                </div>
                :
                <input
                  type={item.type}
                  placeholder={item.placeholder}
                  value={options?.[item.name]}
                  onChange={e => setOptions({ ...options, [`${item.name}`]: e.target.value })}
                  className="form-input dark:border-0 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg"
                />
              }
            </div>
          ))}
          {!_.isEqual(options, initialOptions) && (
            <div className="flex justify-end space-x-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setOptions(initialOptions)
                  setCollapse(!collapse)
                }}
                className="btn btn-default btn-rounded bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (updateOptions) {
                    updateOptions(options)
                  }
                  setCollapse(!collapse)
                }}
                className="btn btn-default btn-rounded bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
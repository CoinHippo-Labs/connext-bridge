import { useState, useEffect } from 'react'

import _ from 'lodash'
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'
import { BsCheckCircleFill } from 'react-icons/bs'

export default function AdvancedOptions({ applied = false, disabled = false, initialOptions, updateOptions, useNomad }) {
  const [options, setOptions] = useState(initialOptions)
  const [collapse, setCollapse] = useState(true)

  const items = [
    // {
    //   label: 'Infinite Approval',
    //   name: 'infinite_approval',
    //   type: 'checkbox',
    //   options: [{ value: true, label: 'Activate Infinite Approval' }],
    // },
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
      hide: useNomad,
    },
    {
      label: 'Call Data',
      name: 'call_data',
      type: 'text',
      placeholder: 'Only when calling a contract directly',
      hide: useNomad,
    },
    {
      label: 'Preferred Router',
      name: 'preferred_router',
      type: 'text',
      placeholder: 'Specify a target router to handle transaction',
      hide: useNomad,
    },
    {
      label: 'Initiator',
      name: 'initiator',
      type: 'text',
      placeholder: 'Specify an external signer',
      hide: useNomad,
    },
  ].filter(item => !item.hide)

  useEffect(() => {
    setOptions(initialOptions)
  }, [initialOptions])

  return (
    <>
      <button
        onClick={() => setCollapse(!collapse)}
        className={`bg-transparent flex items-center ${applied ? 'text-green-400 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-600'} text-sm space-x-1 ml-auto`}
      >
        {applied && (
          <BsCheckCircleFill size={16} className="mr-1" />
        )}
        <span>Advanced Options</span>
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
                <div className="form-label text-gray-400 dark:text-gray-600">{item.label}</div>
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
                        className="form-checkbox w-4 h-4 dark:border-0 focus:ring-0 dark:focus:ring-0 rounded-lg"
                      />
                      <span className="text-gray-500">{option.label}</span>
                    </label>
                  ))}
                </div>
                :
                <input
                  type={item.type}
                  placeholder={item.placeholder}
                  value={options?.[item.name]}
                  onChange={e => setOptions({ ...options, [`${item.name}`]: e.target.value })}
                  className="form-input dark:border-0 focus:ring-0 dark:focus:ring-0 rounded-xl"
                />
              }
            </div>
          ))}
          {!_.isEqual(options, initialOptions) && (
            <div className="flex justify-end space-x-2 mb-1">
              <button
                type="button"
                onClick={() => {
                  setOptions(initialOptions)
                  setCollapse(!collapse)
                }}
                className="btn btn-default btn-rounded bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-black dark:text-white"
              >
                Cancel
              </button>
              <button
                disabled={disabled}
                onClick={() => {
                  if (updateOptions) {
                    updateOptions(options)
                  }
                  setCollapse(!collapse)
                }}
                className="btn btn-default btn-rounded bg-blue-500 hover:bg-blue-600 text-white"
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
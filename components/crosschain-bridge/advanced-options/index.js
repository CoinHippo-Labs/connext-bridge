import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import { HiCode } from 'react-icons/hi'

import ModalConfirm from '../../modals/modal-confirm'

export default function AdvancedOptions({ initialOptions, updateOptions }) {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const [options, setOptions] = useState(initialOptions)

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

  return (
    <ModalConfirm
      buttonTitle="Advanced Options"
      buttonClassName="bg-transparent text-gray-400 dark:text-gray-500 text-sm ml-auto mr-2"
      title="Advanced Options"
      body={<div className="form">
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
                      className="form-checkbox w-4 h-4 dark:border-0 focus:ring-0 dark:focus:ring-gray-700"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
              :
              <input
                type={item.type}
                placeholder={item.placeholder}
                value={options?.[item.name]}
                onChange={e => setOptions({ ...options, [`${item.name}`]: e.target.value })}
                className="form-input dark:border-0 focus:ring-gray-200 dark:focus:ring-gray-700"
              />
            }
          </div>
        ))}
      </div>}
      onCancel={() => setOptions(initialOptions)}
      confirmButtonTitle="Ok"
      onConfirm={() => {
        if (updateOptions) {
          updateOptions(options)
        }
      }}
    />
  )
}
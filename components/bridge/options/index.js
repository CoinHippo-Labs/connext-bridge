import { useState, useEffect } from 'react'
import _ from 'lodash'
import Switch from 'react-switch'
import { DebounceInput } from 'react-debounce-input'
import { RiSettings3Line } from 'react-icons/ri'
import { MdSettingsSuggest } from 'react-icons/md'

import Modal from '../../modals'
import Popover from '../../popover'

export default ({
  disabled = false,
  applied = false,
  initialData,
  onChange,
}) => {
  const [data, setData] = useState(initialData)

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const reset = () => setData(initialData)

  const fields = [
    {
      label: 'Recipient Address',
      name: 'to',
      type: 'text',
      placeholder: 'target contract or recipient address',
    },
    {
      label: 'Infinite Approval',
      name: 'infiniteApprove',
      type: 'switch',
    },
    {
      label: '% Slippage',
      name: 'slippage',
      type: 'number',
      placeholder: '0.00',
      presets: [0.1, 0.5, 1.0],
      postfix: '%',
    },
    {
      label: 'Bridge Path',
      name: 'forceSlow',
      type: 'switch',
    },
    {
      label: 'Call Data',
      name: 'callData',
      type: 'textarea',
      placeholder: 'encoded calldata to execute on receiving chain',
    },
  ]

  const hasChanged = !_.isEqual(data, initialData)

  return (
    <Modal
      disabled={disabled}
      buttonTitle={<div className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg p-2">
        {applied ?
          <MdSettingsSuggest size={20} className="text-green-600 hover:text-green-500 dark:text-white dark:hover:text-slate-100 mb-0.5" /> :
          <RiSettings3Line size={20} className="text-slate-400 hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-200" />
        }
      </div>}
      buttonClassName={`min-w-max ${disabled ? 'cursor-not-allowed' : ''} ${applied ? 'ring-2 ring-green-500 dark:ring-white' : ''} rounded-lg shadow flex items-center justify-center`}
      title="Options"
      body={<div className="form mt-2">
        {fields.map((f, i) => (
          <div key={i} className="form-element">
            {f.label && (
              <div className="form-label text-slate-600 dark:text-slate-400 font-medium">
                {f.label}
              </div>
            )}
            {f.type === 'select' ?
              <select
                placeholder={f.placeholder}
                value={data?.[f.name]}
                onChange={e => {
                  console.log('[Options]', {
                    ...data,
                    [`${f.name}`]: e.target.value,
                  })
                  setData({
                    ...data,
                    [`${f.name}`]: e.target.value,
                  })
                }}
                className="form-select bg-slate-50 border-0 focus:ring-0 rounded-lg"
              >
                {f.options?.map((o, i) => (
                  <option
                    key={i}
                    title={o.title}
                    value={o.value}
                  >
                    {o.name}
                  </option>
                ))}
              </select>
              :
              f.type === 'switch' ?
                f.name === 'forceSlow' ?
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={typeof data?.[f.name] === 'boolean' ? data[f.name] : false}
                      onChange={e => {
                        console.log('[Options]', {
                          ...data,
                          [`${f.name}`]: !data?.[f.name],
                        })
                        setData({
                          ...data,
                          [`${f.name}`]: !data?.[f.name],
                        })
                      }}
                      checkedIcon={false}
                      uncheckedIcon={false}
                      onColor="#3b82f6"
                      onHandleColor="#f8fafc"
                      offColor="#22c55e"
                      offHandleColor="#f8fafc"
                    />
                    {data?.forceSlow ?
                      <Popover
                        placement="top"
                        title="Slow Path (Nomad)"
                        content="Use bridge only (wait 30-60 mins, no fees)"
                        titleClassName="normal-case font-semibold py-1.5"
                      >
                        <span className="uppercase font-bold">
                          Slow
                        </span>
                      </Popover>
                      :
                      <Popover
                        placement="top"
                        title="Fast Path"
                        content="Connext Router (+ Nomad) (less than 3 mins, .05% fees)"
                        titleClassName="normal-case font-semibold py-1.5"
                      >
                        <span className="uppercase font-bold">
                          Fast
                        </span>
                      </Popover>
                    }
                  </div>
                  :
                  <Switch
                    checked={typeof data?.[f.name] === 'boolean' ? data[f.name] : false}
                    onChange={e => {
                      console.log('[Options]', {
                        ...data,
                        [`${f.name}`]: !data?.[f.name],
                      })
                      setData({
                        ...data,
                        [`${f.name}`]: !data?.[f.name],
                      })
                    }}
                    onColor="#3b82f6"
                    onHandleColor="#f8fafc"
                    offColor="#64748b"
                    offHandleColor="#f8fafc"
                  />
                :
                f.type === 'textarea' ?
                  <textarea
                    type="text"
                    rows="5"
                    placeholder={f.placeholder}
                    value={data?.[f.name]}
                    onChange={e => {
                      console.log('[Options]', {
                        ...data,
                        [`${f.name}`]: e.target.value,
                      })
                      setData({
                        ...data,
                        [`${f.name}`]: e.target.value,
                      })
                    }}
                    className="form-textarea border-0 focus:ring-0 rounded-lg"
                  />
                  :
                  f.type === 'number' ?
                    <div className="flex items-center space-x-3">
                      <DebounceInput
                        debounceTimeout={300}
                        size={f.size || 'small'}
                        type={f.type}
                        placeholder={f.placeholder}
                        value={typeof data?.[f.name] === 'number' && data[f.name] >= 0 ? data[f.name] : ''}
                        onChange={e => {
                          const regex = /^[0-9.\b]+$/
                          let value
                          if (e.target.value === '' || regex.test(e.target.value)) {
                            value = e.target.value
                          }
                          value = ['slippage'].includes(f.name) && (value < 0 || value > 100) ? 0.1 : value
                          console.log('[Options]', {
                            ...data,
                            [`${f.name}`]: value && !isNaN(value) ? Number(value) : value,
                          })
                          setData({
                            ...data,
                            [`${f.name}`]: value && !isNaN(value) ? Number(value) : value,
                          })
                        }}
                        onWheel={e => e.target.blur()}
                        className={`w-20 bg-slate-50 dark:bg-slate-800 border-0 focus:ring-0 rounded-lg font-semibold py-1.5 px-2.5`}
                      />
                      {f?.presets.length > 0 && (
                        <div className="flex items-center space-x-2.5">
                          {f.presets.map((p, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                console.log('[Options]', {
                                  ...data,
                                  [`${f.name}`]: p,
                                })
                                setData({
                                  ...data,
                                  [`${f.name}`]: p,
                                })
                              }}
                              className={`${data?.[f.name] === p ? 'bg-blue-600 dark:bg-blue-700 font-bold' : 'bg-blue-400 hover:bg-blue-500 dark:bg-blue-500 hover:dark:bg-blue-600 hover:font-semibold'} rounded-lg cursor-pointer text-white py-1 px-2`}
                            >
                              {p} {f.postfix}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    :
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={data?.[f.name]}
                      onChange={e => {
                        console.log('[Options]', {
                          ...data,
                          [`${f.name}`]: e.target.value,
                        })
                        setData({
                          ...data,
                          [`${f.name}`]: e.target.value,
                        })
                      }}
                      className="form-input border-0 focus:ring-0 rounded-lg"
                    />
            }
          </div>
        ))}
      </div>}
      onCancel={() => reset()}
      confirmDisabled={!hasChanged}
      onConfirm={() => {
        if (onChange) {
          onChange(data)
        }
      }}
      confirmButtonTitle="Apply"
      onClose={() => reset()}
    />
  )
}
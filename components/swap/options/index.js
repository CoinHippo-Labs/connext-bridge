import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import Switch from 'react-switch'
import { DebounceInput } from 'react-debounce-input'
import { RiSettings3Line } from 'react-icons/ri'
import { MdSettingsSuggest } from 'react-icons/md'

import Modal from '../../modals'
import { switch_color } from '../../../lib/utils'

const DEFAULT_SWAP_SLIPPAGE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_DEFAULT_SWAP_SLIPPAGE_PERCENTAGE) || 3

export default ({
  disabled = false,
  applied = false,
  initialData,
  onChange,
}) => {
  const {
    preferences,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }

  const [data, setData] = useState(initialData)

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const reset = () => setData(initialData)

  const fields = [
    {
      label: 'Infinite Approval',
      name: 'infiniteApprove',
      type: 'switch',
    },
    {
      label: 'Slippage Tolerance',
      name: 'slippage',
      type: 'number',
      placeholder: '0.00',
      presets: [
        3.0,
        2.0,
        1.0,
      ],
      postfix: '%',
    },
  ]

  const changed = !_.isEqual(
    data,
    initialData,
  )

  return (
    <Modal
      disabled={disabled}
      buttonTitle={<div className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg p-2">
        {applied ?
          <MdSettingsSuggest
            size={20}
            className="text-green-600 hover:text-green-500 dark:text-white dark:hover:text-slate-100 mb-0.5"
          /> :
          <RiSettings3Line
            size={20}
            className="text-slate-400 hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-200"
          />
        }
      </div>}
      buttonClassName={`min-w-max ${disabled ? 'cursor-not-allowed' : ''} ${applied ? 'ring-2 ring-green-500 dark:ring-white' : ''} rounded-lg shadow flex items-center justify-center`}
      title="Options"
      body={<div className="form mt-2">
        {fields
          .map((f, i) => {
            const {
              label,
              name,
              size,
              type,
              placeholder,
              options,
              presets,
              postfix,
            } = { ...f }

            return (
              <div
                key={i}
                className="form-element"
              >
                {label && (
                  <div className="form-label text-slate-600 dark:text-slate-200 font-normal">
                    {label}
                  </div>
                )}
                {type === 'select' ?
                  <select
                    placeholder={placeholder}
                    value={data?.[name]}
                    onChange={e => {
                      const _data = {
                        ...data,
                        [`${name}`]: e.target.value,
                      }

                      console.log(
                        '[Swap Options]',
                        _data,
                      )

                      setData(_data)
                    }}
                    className="form-select bg-slate-50 border-0 focus:ring-0 rounded-lg"
                  >
                    {(options || [])
                      .map((o, j) => {
                        const {
                          title,
                          value,
                          name,
                        } = { ...o }

                        return (
                          <option
                            key={j}
                            title={title}
                            value={value}
                          >
                            {name}
                          </option>
                        )
                      })
                    }
                  </select> :
                  type === 'switch' ?
                    <Switch
                      checked={typeof data?.[name] === 'boolean' ?
                        data[name] :
                        false
                      }
                      onChange={e => {
                        const _data = {
                          ...data,
                          [`${name}`]: !data?.[name],
                        }

                        console.log(
                          '[Swap Options]',
                          _data,
                        )

                        setData(_data)
                      }}
                      checkedIcon={false}
                      uncheckedIcon={false}
                      onColor={switch_color(theme).on}
                      onHandleColor="#f8fafc"
                      offColor={switch_color(theme).off}
                      offHandleColor="#f8fafc"
                    /> :
                    type === 'textarea' ?
                      <textarea
                        type="text"
                        rows="5"
                        placeholder={placeholder}
                        value={data?.[name]}
                        onChange={e => {
                          const _data = {
                            ...data,
                            [`${name}`]: e.target.value,
                          }

                          console.log(
                            '[Swap Options]',
                            _data,
                          )

                          setData(_data)
                        }}
                        className="form-textarea border-0 focus:ring-0 rounded-lg"
                      /> :
                      type === 'number' ?
                        <div className="flex items-center space-x-3">
                          <DebounceInput
                            debounceTimeout={300}
                            size={
                              size ||
                              'small'
                            }
                            type={type}
                            placeholder={placeholder}
                            value={typeof data?.[name] === 'number' && data[name] >= 0 ?
                              data[name] :
                              ''
                            }
                            onChange={e => {
                              const regex = /^[0-9.\b]+$/

                              let value

                              if (
                                e.target.value === '' ||
                                regex.test(e.target.value)
                              ) {
                                value = e.target.value
                              }

                              value = ['slippage'].includes(f.name) &&
                                (
                                  value <= 0 ||
                                  value > 100
                                ) ?
                                  DEFAULT_SWAP_SLIPPAGE_PERCENTAGE :
                                  value

                              const _data = {
                                ...data,
                                [`${name}`]: value && !isNaN(value) ?
                                  Number(value) :
                                  value,
                              }

                              console.log(
                                '[Swap Options]',
                                _data,
                              )

                              setData(_data)
                            }}
                            onWheel={e => e.target.blur()}
                            onKeyDown={e =>
                              [
                                'e',
                                'E',
                                '-',
                              ].includes(e.key) &&
                              e.preventDefault()
                            }
                            className={`w-20 bg-slate-50 dark:bg-slate-800 border-0 focus:ring-0 rounded-lg font-semibold py-1.5 px-2.5`}
                          />
                          {
                            presets?.length > 0 &&
                            (
                              <div className="flex items-center space-x-2.5">
                                {presets
                                  .map((p, j) => (
                                    <div
                                      key={j}
                                      onClick={() => {
                                        const _data = {
                                          ...data,
                                          [`${name}`]: p,
                                        }

                                        console.log(
                                          '[Swap Options]',
                                          _data,
                                        )

                                        setData(_data)
                                      }}
                                      className={`${data?.[name] === p ? 'bg-blue-600 dark:bg-blue-700 font-semibold' : 'bg-blue-400 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 hover:font-medium'} rounded-lg cursor-pointer py-1 px-2`}
                                    >
                                      {p} {postfix}
                                    </div>
                                  ))
                                }
                              </div>
                            )
                          }
                        </div> :
                        <input
                          type={type}
                          placeholder={placeholder}
                          value={data?.[name]}
                          onChange={e => {
                            const _data = {
                              ...data,
                              [`${name}`]: e.target.value,
                            }

                            console.log(
                              '[Swap Options]',
                              _data,
                            )

                            setData(_data)
                          }}
                          className="form-input border-0 focus:ring-0 rounded-lg"
                        />
                }
              </div>
            )
          })
        }
      </div>}
      onCancel={() => reset()}
      confirmDisabled={!changed}
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
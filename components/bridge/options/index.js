import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import Switch from 'react-switch'
import { DebounceInput } from 'react-debounce-input'
import { Tooltip } from '@material-tailwind/react'
import { RiSettings3Line } from 'react-icons/ri'

import Modal from '../../modals'
import Popover from '../../popover'
import { switch_color } from '../../../lib/utils'

const DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE =
  Number(
    process.env.NEXT_PUBLIC_DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE
  ) ||
  3

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
      label: 'Recipient Address',
      tooltip: 'Allows you to transfer to a different address than your connected wallet address.',
      name: 'to',
      type: 'text',
      placeholder: 'target contract or recipient address',
    },
    {
      label: 'Infinite Approval',
      tooltip: 'This allows you to only need to pay for approval on your first transfer.',
      name: 'infiniteApprove',
      type: 'switch',
    },
    /*{
      label: 'Slippage',
      tooltip: 'The maximum percentage you are willing to lose due to market changes.',
      name: 'slippage',
      type: 'number',
      placeholder: '0.00',
      presets: [
        3.0,
        1.0,
        0.5,
      ],
      postfix: '%',
    },*/
    /*{
      label: 'Bridge Path',
      name: 'forceSlow',
      type: 'switch',
    },*/
    {
      label: 'Receive NextAsset',
      name: 'receiveLocal',
      type: 'switch',
    },
    /*{
      label: 'Call Data',
      name: 'callData',
      type: 'textarea',
      placeholder: 'encoded calldata to execute on receiving chain',
    },*/
  ]

  const changed =
    !_.isEqual(
      data,
      initialData,
    )

  const {
    forceSlow,
  } = { ...data }

  return (
    <Modal
      disabled={disabled}
      buttonTitle={
        <div className={`bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg flex items-center ${applied ? 'text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400' : 'text-slate-500 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-200'} space-x-1 py-2 px-2`}>
          <RiSettings3Line
            size={20}
          />
          {/*<span className="text-sm font-medium">
            Settings
          </span>*/}
        </div>
      }
      buttonClassName={`min-w-max ${disabled ? 'cursor-not-allowed' : ''} ${applied ? 'border border-blue-400 dark:border-blue-500' : ''} rounded-lg shadow flex items-center justify-center`}
      title="Advanced Options"
      body={
        <div className="form mt-2">
          {fields
            .map((f, i) => {
              const {
                label,
                tooltip,
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
                  {
                    label &&
                    (tooltip ?
                      <Tooltip
                        placement="right"
                        content={tooltip}
                        className="z-50 bg-dark text-white text-xs"
                      >
                        <div className="form-label max-w-fit text-slate-600 dark:text-slate-200 font-medium">
                          {label}
                        </div>
                      </Tooltip> :
                      <div className="form-label text-slate-600 dark:text-slate-200 font-medium">
                        {label}
                      </div>
                    )
                  }
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
                          '[Options]',
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
                      name === 'forceSlow' ?
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={
                              !(
                                typeof data?.[name] === 'boolean' ?
                                  data[name] :
                                  false
                              )
                            }
                            onChange={e => {
                              const _data = {
                                ...data,
                                [`${name}`]: !data?.[name],
                              }

                              console.log(
                                '[Options]',
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
                          />
                          {forceSlow ?
                            /*<Popover
                              placement="top"
                              title="Slow Path (Nomad)"
                              content="Use bridge only (wait 30-60 mins, no fees)"
                              titleClassName="normal-case font-semibold py-1.5"*/
                            <div
                            >
                              <span className="uppercase font-bold">
                                Slow
                              </span>
                            </div> :
                            /*</Popover>*/
                            /*<Popover
                              placement="top"
                              title="Fast Path"
                              content="Connext Router (+ Nomad) (less than 3 mins, .05% fees)"
                              titleClassName="normal-case font-semibold py-1.5"*/
                            <div
                            >
                              <span className="uppercase font-bold">
                                Fast
                              </span>
                            </div>
                            /*</Popover>*/
                          }
                        </div> :
                        <Switch
                          checked={
                            typeof data?.[name] === 'boolean' ?
                              data[name] :
                              false
                          }
                          onChange={e => {
                            const _data = {
                              ...data,
                              [`${name}`]: !data?.[name],
                            }

                            console.log(
                              '[Options]',
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
                              '[Options]',
                              _data,
                            )

                            setData(_data)
                          }}
                          className="form-textarea border-0 focus:ring-0 rounded-lg"
                        /> :
                        type === 'number' ?
                          <div className="flex items-center space-x-3">
                            <DebounceInput
                              debounceTimeout={500}
                              size={
                                size ||
                                'small'
                              }
                              type={type}
                              placeholder={placeholder}
                              value={
                                typeof data?.[name] === 'number' &&
                                data[name] >= 0 ?
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

                                value =
                                  [
                                    'slippage',
                                  ].includes(name) &&
                                  (
                                    value <= 0 ||
                                    value > 100
                                  ) ?
                                    DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE :
                                    value

                                const _data = {
                                  ...data,
                                  [`${name}`]:
                                    value &&
                                    !isNaN(value) ?
                                      parseFloat(
                                        Number(value)
                                          .toFixed(2)
                                      ) :
                                      value,
                                }

                                console.log(
                                  '[Options]',
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
                              className={`w-20 bg-slate-100 dark:bg-slate-800 border-0 focus:ring-0 rounded-lg font-semibold py-1.5 px-2.5`}
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
                                            '[Options]',
                                            _data,
                                          )

                                          setData(_data)
                                        }}
                                        className={`${data?.[name] === p ? 'bg-slate-100 dark:bg-slate-800 font-bold' : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium hover:font-semibold'} rounded-lg cursor-pointer py-1 px-2`}
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
                                '[Options]',
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
        </div>
      }
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
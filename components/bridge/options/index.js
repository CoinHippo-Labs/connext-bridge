import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Tooltip } from '@material-tailwind/react'
import Switch from 'react-switch'
import { DebounceInput } from 'react-debounce-input'
import _ from 'lodash'
import { RiSettings3Line } from 'react-icons/ri'
import { BiInfoCircle } from 'react-icons/bi'

import Modal from '../../modal'
import { DEFAULT_PERCENT_BRIDGE_SLIPPAGE } from '../../../lib/config'
import { isNumber } from '../../../lib/number'
import { toArray, numberToFixed, switchColor } from '../../../lib/utils'

export default (
  {
    disabled = false,
    applied = false,
    initialData,
    onChange,
    showInfiniteApproval = true,
    hasNextAsset = false,
    chainData,
    relayerFeeAssetTypes,
  },
) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const [data, setData] = useState(initialData)

  useEffect(
    () => {
      setData(initialData)
    },
    [initialData],
  )

  const reset = () => setData(initialData)

  const receiveLocalTooltip = !hasNextAsset && `Unavailable on ${chainData?.name || 'Ethereum'}`

  const fields = [
    {
      label: 'Recipient Address',
      tooltip: 'Allows you to transfer to a different address than your connected wallet address.',
      name: 'to',
      type: 'text',
      placeholder: 'target recipient address',
    },
    {
      label: 'Infinite Approval',
      tooltip: showInfiniteApproval ? 'This allows you to only need to pay for approval on your first transfer.' : 'Approval sufficient. If you need to, please revoke using other tools.',
      name: 'infiniteApprove',
      type: 'switch',
    },
    {
      label: 'Slippage Tolerance',
      tooltip: 'The maximum percentage you are willing to lose due to market changes.',
      name: 'slippage',
      type: 'number',
      presets: [3.0, 1.0, 0.5],
      postfix: '%',
    },
    {
      label: 'Asset for Gas on destination',
      tooltip: 'This covers costs to execute your transfer on the destination chain.',
      name: 'relayerFeeAssetType',
      type: 'select',
      options: toArray(relayerFeeAssetTypes),
    },
    {
      label: 'Receive NextAsset',
      tooltip: receiveLocalTooltip,
      name: 'receiveLocal',
      type: 'switch',
    },
    {
      label: 'Show NextAsset',
      name: 'showNextAssets',
      type: 'switch',
    },
  ]

  const changed = !_.isEqual(data, initialData)

  return (
    <Modal
      disabled={disabled}
      buttonTitle={
        <div className={`bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded flex items-center ${applied ? 'text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400' : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200'} space-x-1 p-2 3xl:p-3`}>
          <RiSettings3Line size={20} className="3xl:w-6 3xl:h-6" />
        </div>
      }
      buttonClassName={`min-w-max ${disabled ? 'cursor-not-allowed' : ''} rounded ${applied ? 'border border-blue-400 dark:border-blue-500' : ''} flex items-center justify-center`}
      title={
        <span className="normal-case text-lg 3xl:text-2xl">
          Advanced options
        </span>
      }
      body={
        <div className="form mt-2">
          {fields.map((f, i) => {
            const { label, tooltip, name, size, type, placeholder, options, presets, postfix } = { ...f }
            return (
              <div key={i} className="form-element">
                {label && (
                  tooltip ?
                    <Tooltip placement="right" content={tooltip}>
                      <div className="w-fit flex items-center">
                        <div className="max-w-fit text-slate-600 dark:text-slate-200 text-sm 3xl:text-base font-medium mb-1">
                          {label}
                        </div>
                        <BiInfoCircle size={16} className="block sm:hidden text-slate-400 dark:text-slate-500 mb-0.5 ml-1 sm:ml-0" />
                      </div>
                    </Tooltip> :
                    <div className="form-label text-slate-600 dark:text-slate-200 text-sm 3xl:text-base font-medium">
                      {label}
                    </div>
                  )
                }
                {type === 'select' ?
                  <select
                    placeholder={placeholder}
                    value={data?.[name]}
                    onChange={e => setData({ ...data, [name]: e.target.value })}
                    className="form-select min-w-fit bg-slate-50 rounded border-0 focus:ring-0"
                    style={{ width: '124px' }}
                  >
                    {toArray(options).map((o, j) => {
                      const { title, value, name } = { ...o }
                      return (
                        <option key={j} title={title} value={value}>
                          {name}
                        </option>
                      )
                    })}
                  </select> :
                  type === 'switch' ?
                    name === 'infiniteApprove' ?
                      <Tooltip placement="right" content={tooltip}>
                        <div className="w-fit flex items-center">
                          <Switch
                            disabled={!showInfiniteApproval}
                            checked={typeof data?.[name] === 'boolean' ? data[name] : false}
                            onChange={e => setData({ ...data, [name]: !data?.[name] })}
                            checkedIcon={false}
                            uncheckedIcon={false}
                            onColor={switchColor(theme).on}
                            onHandleColor="#f8fafc"
                            offColor={switchColor(theme).off}
                            offHandleColor="#f8fafc"
                          />
                        </div>
                      </Tooltip> :
                      name === 'receiveLocal' && receiveLocalTooltip ?
                        <Tooltip placement="right" content={receiveLocalTooltip}>
                          <div className="w-fit flex items-center">
                            <Switch
                              disabled={true}
                              checked={typeof data?.[name] === 'boolean' ? data[name] : false}
                              onChange={e => setData({ ...data, [name]: !data?.[name] })}
                              checkedIcon={false}
                              uncheckedIcon={false}
                              onColor={switchColor(theme).on}
                              onHandleColor="#f8fafc"
                              offColor={switchColor(theme).off}
                              offHandleColor="#f8fafc"
                            />
                          </div>
                        </Tooltip> :
                        <Switch
                          checked={typeof data?.[name] === 'boolean' ? data[name] : false}
                          onChange={e => setData({ ...data, [name]: !data?.[name] })}
                          checkedIcon={false}
                          uncheckedIcon={false}
                          onColor={switchColor(theme).on}
                          onHandleColor="#f8fafc"
                          offColor={switchColor(theme).off}
                          offHandleColor="#f8fafc"
                        /> :
                    type === 'textarea' ?
                      <textarea
                        type="text"
                        rows="5"
                        placeholder={placeholder}
                        value={data?.[name]}
                        onChange={e => setData({ ...data, [name]: e.target.value })}
                        className="form-textarea rounded border-0 focus:ring-0 text-sm 3xl:text-base"
                      /> :
                      type === 'number' ?
                        <div className="flex items-center space-x-3">
                          <DebounceInput
                            debounceTimeout={750}
                            size={size || 'small'}
                            type={type}
                            placeholder={placeholder}
                            value={isNumber(data?.[name]) ? data[name] : ''}
                            onChange={
                              e => {
                                const regex = /^[0-9.\b]+$/
                                let value
                                if (e.target.value === '' || regex.test(e.target.value)) {
                                  value = e.target.value
                                }
                                if (typeof value === 'string') {
                                  if (value.startsWith('.')) {
                                    value = `0${value}`
                                  }
                                  if (isNumber(value)) {
                                    value = Number(value)
                                  }
                                }
                                value = name === 'slippage' && (value <= 0 || value > 100) ? DEFAULT_PERCENT_BRIDGE_SLIPPAGE : value
                                setData({ ...data, [name]: isNumber(value) ? parseFloat(numberToFixed(value, name === 'slippage' ? 2 : 6)) : value })
                              }
                            }
                            onWheel={e => e.target.blur()}
                            onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                            className="w-20 bg-slate-100 dark:bg-slate-800 rounded border-0 focus:ring-0 text-sm 3xl:text-base font-semibold py-1.5 px-2.5"
                          />
                          {presets?.length > 0 && (
                            <div className="flex items-center space-x-2.5">
                              {presets.map((p, j) => (
                                <div
                                  key={j}
                                  onClick={() => setData({ ...data, [name]: p })}
                                  className={`${data?.[name] === p ? 'bg-slate-100 dark:bg-slate-800 font-bold' : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium hover:font-semibold'} rounded cursor-pointer text-sm 3xl:text-base py-1 px-2`}
                                >
                                  {p} {postfix}
                                </div>
                              ))}
                            </div>
                          )}
                        </div> :
                        <input
                          type={type}
                          placeholder={placeholder}
                          value={data?.[name]}
                          onChange={e => setData({ ...data, [name]: e.target.value })}
                          className="form-input rounded border-0 focus:ring-0 text-sm 3xl:text-base"
                        />
                }
              </div>
            )
          })}
        </div>
      }
      onCancel={() => reset()}
      confirmDisabled={!changed}
      onConfirm={
        () => {
          if (onChange) {
            onChange(data)
          }
        }
      }
      confirmButtonTitle="Apply"
      onClose={() => reset()}
    />
  )
}
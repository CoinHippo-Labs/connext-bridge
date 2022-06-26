import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { BigNumber, Contract, FixedNumber, constants, utils } from 'ethers'
import { DebounceInput } from 'react-debounce-input'
import { TailSpin, Watch } from 'react-loader-spinner'
import { MdClose } from 'react-icons/md'
import { BiPlus, BiCaretUp, BiCaretDown, BiMessageError, BiMessageCheck, BiMessageDetail } from 'react-icons/bi'

import GasPrice from '../gas-price'
import Balance from '../balance'
import Image from '../image'
import Wallet from '../wallet'
import Alert from '../alerts'
import Copy from '../copy'
import { number_format, ellipse, loader_color } from '../../lib/utils'

const DEFAULT_POOL_SLIPPAGE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_DEFAULT_POOL_SLIPPAGE_PERCENTAGE) || 0.5
const DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES = Number(process.env.NEXT_PUBLIC_DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES) || 60
const ACTIONS = ['add', 'remove']

export default ({
  data,
}) => {
  const { preferences, dev, wallet } = useSelector(state => ({ preferences: state.preferences, dev: state.dev, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { chain_id, provider, web3_provider, address, signer } = { ...wallet_data }

  const [action, setAction] = useState(_.head(ACTIONS))
  const [amountX, setAmountX] = useState(null)
  const [amountY, setAmountY] = useState(null)
  const [amount, setAmount] = useState(null)
  const [options, setOptions] = useState({
    slippage: DEFAULT_POOL_SLIPPAGE_PERCENTAGE,
    deadline: DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES,
  })
  const [openOptions, setOpenOptions] = useState(false)

  const [approving, setApproving] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [calling, setCalling] = useState(null)
  const [callResponse, setCallResponse] = useState(null)

  const reset = async origin => {
    // const reset_pool = origin !== 'address'
    // if (reset_pool) {
    //   setPool({
    //     ...pool,
    //     amount: null,
    //   })
    // }

    setApproving(null)
    setApproveResponse(null)

    setCalling(null)
    setCallResponse(null)

    // setPoolsTrigger(moment().valueOf())

    // const { chain } = { ...pool }
    // getBalances(chain)
  }

  const call = async () => {
    setCalling(true)
    let success = false
    if (sdk) {
      const { chain, asset, amount } = { ...pool }
      const chain_data = chains_data?.find(c => c?.id === chain)
      const asset_data = assets_data?.find(a => a?.id === asset)
      const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
      const symbol = contract_data?.symbol || asset_data?.symbol
      const decimals = contract_data?.contract_decimals || 18
      const callParams = {
      
      }
      let failed = false
      // try {
      //   const approve_request = await sdk.nxtpSdkBase.approveIfNeeded(xcallParams.params.originDomain, xcallParams.transactingAssetId, xcallParams.amount, infiniteApprove)
      //   if (approve_request) {
      //     setApproving(true)
      //     const approve_response = await signer.sendTransaction(approve_request)
      //     const tx_hash = approve_response?.hash
      //     setApproveResponse({
      //       status: 'pending',
      //       message: `Wait for ${source_symbol} approval`,
      //       tx_hash,
      //     })
      //     const approve_receipt = await signer.provider.waitForTransaction(tx_hash)
      //     setApproveResponse(approve_receipt?.status ?
      //       null : {
      //         status: 'failed',
      //         message: `Failed to approve ${source_symbol}`,
      //         tx_hash,
      //       }
      //     )
      //     failed = !approve_receipt?.status
      //     setApproving(false)
      //   }
      // } catch (error) {
      //   setApproveResponse({ status: 'failed', message: error?.data?.message || error?.message })
      //   failed = true
      //   setApproving(false)
      // }
      if (!failed) {
        // try {
        //   const xcall_request = await sdk.nxtpSdkBase.xcall(xcallParams)
        //   if (xcall_request) {
        //     let gas_limit = await signer.estimateGas(xcall_request)
        //     if (gas_limit) {
        //       gas_limit = FixedNumber.fromString(gas_limit.toString()).mulUnsafe(FixedNumber.fromString(GAS_LIMIT_ADJUSTMENT.toString())).round(0).toString().replace('.0', '');
        //       xcall_request.gasLimit = gas_limit
        //     }
        //     const xcall_response = await signer.sendTransaction(xcall_request)
        //     const tx_hash = xcall_response?.hash
        //     const xcall_receipt = await signer.provider.waitForTransaction(tx_hash)
        //     setXcall(xcall_receipt)
        //     failed = !xcall_receipt?.status
        //     setXcallResponse({
        //       status: failed ? 'failed' : 'success',
        //       message: failed ? 'Failed to send transaction' : `${source_symbol} transfer detected, waiting for execution.`,
        //       tx_hash,
        //     })
        //     success = true
        //   }
        // } catch (error) {
        //   setXcallResponse({ status: 'failed', message: error?.data?.message || error?.message })
        //   failed = true
        // }
      }
    }
    setCalling(false)
    if (sdk && address && success) {
      await sleep(2 * 1000)
      setPoolsTrigger(moment().valueOf())
    }
  }

  const disabled = calling || approving

  return (
    <div className="border-2 border-blue-400 dark:border-blue-600 rounded-2xl space-y-3 p-6">
      <div className="flex items-center justify-between space-x-3">
        <div className="flex items-center space-x-0.5">
          {ACTIONS.map((a, i) => (
            <div
              key={i}
              onClick={() => setAction(a)}
              className={`${action === a ? 'bg-blue-500 dark:bg-blue-600 font-bold text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-900 font-medium hover:font-semibold'} rounded-lg cursor-pointer uppercase py-1 px-2.5`}
            >
              {a}
            </div>
          ))}
        </div>
        <GasPrice chainId={data?.chain_data?.chain_id} />
      </div>
      {action === 'add' ?
        <>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg space-y-5 py-6 px-4">
            <div className="space-y-2">
              {data?.asset_data && (
                <div className="flex items-center justify-between">
                  <Balance
                    chainId={data?.chain_data?.chain_id}
                    asset={data?.asset_data?.id}
                  />
                  <div className="text-base font-bold">
                    {data?.asset_data?.symbol}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between space-x-3">
                <DebounceInput
                  debounceTimeout={300}
                  size="small"
                  type="number"
                  placeholder="0.00"
                  disabled={disabled || !data?.asset_data?.id}
                  value={typeof amountX === 'number' && amountX >= 0 ? amountX : ''}
                  onChange={e => {
                    const regex = /^[0-9.\b]+$/
                    let value
                    if (e.target.value === '' || regex.test(e.target.value)) {
                      value = e.target.value
                    }
                    value = value < 0 ? 0 : value
                    setAmountX(value && !isNaN(value) ? Number(value) : value)
                  }}
                  onWheel={e => e.target.blur()}
                  className={`w-full bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl font-mono text-lg font-semibold text-right py-2 px-3`}
                />
                <div
                  onClick={() => setAmountX(0)}
                  className={`${disabled || !data?.asset_data?.id ? 'pointer-events-none cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-white cursor-pointer'} bg-slate-100 dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-500 text-blue-400 dark:text-slate-200 text-base font-semibold py-0.5 px-2.5`}
                >
                  Max
                </div>
              </div>
            </div>
            <div className="w-full flex items-center justify-center">
              <BiPlus size={24} />
            </div>
            <div className="space-y-2">
              {data?.asset_data && (
                <div className="flex items-center justify-between">
                  <Balance
                    chainId={data?.chain_data?.chain_id}
                    asset={data?.asset_data?.id}
                  />
                  <div className="text-base font-bold">
                    {data?.asset_data?.symbol}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between space-x-3">
                <DebounceInput
                  debounceTimeout={300}
                  size="small"
                  type="number"
                  placeholder="0.00"
                  disabled={disabled || !data?.asset_data?.id}
                  value={typeof amountY === 'number' && amountY >= 0 ? amountY : ''}
                  onChange={e => {
                    const regex = /^[0-9.\b]+$/
                    let value
                    if (e.target.value === '' || regex.test(e.target.value)) {
                      value = e.target.value
                    }
                    value = value < 0 ? 0 : value
                    setAmountY(value && !isNaN(value) ? Number(value) : value)
                  }}
                  onWheel={e => e.target.blur()}
                  className={`w-full bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl font-mono text-lg font-semibold text-right py-2 px-3`}
                />
                <div
                  onClick={() => setAmountY(0)}
                  className={`${disabled || !data?.asset_data?.id ? 'pointer-events-none cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-white cursor-pointer'} bg-slate-100 dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-500 text-blue-400 dark:text-slate-200 text-base font-semibold py-0.5 px-2.5`}
                >
                  Max
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-end">
              <div
                onClick={() => setOpenOptions(!openOptions)}
                className="cursor-pointer flex items-center text-slate-400 dark:text-slate-200 space-x-2"
              >
                <span className="font-semibold">
                  Advanced
                </span>
                {openOptions ?
                  <BiCaretUp size={18} /> :
                  <BiCaretDown size={18} />
                }
              </div>
            </div>
            {openOptions && (
              <div className="form">
                <div className="form-element">
                  <div className="form-label text-slate-600 dark:text-slate-400 font-medium">
                    % Slippage Tolerance
                  </div>
                  <div className="flex items-center space-x-3">
                    <DebounceInput
                      debounceTimeout={300}
                      size="small"
                      type="number"
                      placeholder="% Slippage Tolerance"
                      value={typeof options?.slippage === 'number' && options.slippage >= 0 ? options.slippage : ''}
                      onChange={e => {
                        const regex = /^[0-9.\b]+$/
                        let value
                        if (e.target.value === '' || regex.test(e.target.value)) {
                          value = e.target.value
                        }
                        value = value < 0 || value > 100 ? DEFAULT_POOL_SLIPPAGE_PERCENTAGE : value
                        setOptions({
                          ...options,
                          slippage: value && !isNaN(value) ? Number(value) : value,
                        })
                      }}
                      onWheel={e => e.target.blur()}
                      className={`w-20 bg-slate-50 dark:bg-slate-800 border-0 focus:ring-0 rounded-lg font-semibold py-1.5 px-2.5`}
                    />
                    <div className="flex items-center space-x-2.5">
                      {[0.1, 0.5, 1.0].map((p, i) => (
                        <div
                          key={i}
                          onClick={() => setOptions({
                            ...options,
                            slippage: p,
                          })}
                          className={`${options?.slippage === p ? 'bg-blue-600 dark:bg-blue-700 font-bold' : 'bg-blue-400 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 hover:font-semibold'} rounded-lg cursor-pointer text-white py-1 px-2`}
                        >
                          {p} %
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-element">
                  <div className="form-label text-slate-600 dark:text-slate-400 font-medium">
                    Transaction Deadline
                  </div>
                  <div className="flex items-center space-x-3">
                    <DebounceInput
                      debounceTimeout={300}
                      size="small"
                      type="number"
                      placeholder="Transaction Deadline (minutes)"
                      value={typeof options?.deadline === 'number' && options.deadline >= 0 ? options.deadline : ''}
                      onChange={e => {
                        const regex = /^[0-9.\b]+$/
                        let value
                        if (e.target.value === '' || regex.test(e.target.value)) {
                          value = e.target.value
                        }
                        value = value < 0 ? DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES : value
                        setOptions({
                          ...options,
                          deadline: value && !isNaN(value) ? Number(value) : value,
                        })
                      }}
                      onWheel={e => e.target.blur()}
                      className={`w-20 bg-slate-50 dark:bg-slate-800 border-0 focus:ring-0 rounded-lg font-semibold py-1.5 px-2.5`}
                    />
                    <span className="font-semibold">
                      minutes
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-end">
            {callResponse || approveResponse ?
              [callResponse || approveResponse].map((r, i) => (
                <Alert
                  key={i}
                  color={`${r.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : r.status === 'success' ? callResponse ? 'bg-yellow-400 dark:bg-blue-500' : 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                  icon={r.status === 'failed' ?
                    <BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> :
                    r.status === 'success' ?
                      callResponse ?
                        <div className="mr-3">
                          <Watch color="white" width="20" height="20" />
                        </div> : <BiMessageCheck className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> :
                      <BiMessageDetail className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />
                  }
                  closeDisabled={true}
                  rounded={true}
                  className="rounded-xl p-4.5"
                >
                  <div className="flex items-center justify-between space-x-2">
                    <span className="break-all">
                      {ellipse(r.message, 128)}
                    </span>
                    <div className="flex items-center space-x-2">
                      {r.status === 'failed' && r.message && (
                        <Copy
                          value={r.message}
                          size={24}
                          className="cursor-pointer text-slate-200 hover:text-white"
                        />
                      )}
                      {r.status === 'failed' ?
                        <button
                          onClick={() => reset()}
                          className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                        >
                          <MdClose size={20} />
                        </button>
                        :
                        r.status === 'success' ?
                          <button
                            onClick={() => reset()}
                            className={`${xcallResponse ? 'bg-yellow-500 dark:bg-blue-400' : 'bg-green-500 dark:bg-green-400'} rounded-full flex items-center justify-center text-white p-1`}
                          >
                            <MdClose size={20} />
                          </button>
                          :
                          null
                      }
                    </div>
                  </div>
                </Alert>
              ))
              :
              web3_provider ?
                <button
                  disabled={disabled || !amountX || !amountY}
                  onClick={() => call()}
                  className={`w-full ${disabled || !amountX || !amountY ? 'bg-slate-100 dark:bg-slate-900 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded-xl text-base sm:text-lg text-center py-3 px-2 sm:px-3`}
                >
                  Supply
                </button>
                :
                <Wallet
                  connectChainId={data?.chain_data?.chain_id}
                  buttonConnectTitle="Connect Wallet"
                  className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-white text-base sm:text-lg text-center sm:space-x-2 py-3 px-2 sm:px-3"
                >
                  <span>
                    Connect Wallet
                  </span>
                </Wallet>
            }
          </div>
        </>
        :
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="text-slate-400 dark:text-slate-500 font-semibold">
              Your Pool Tokens
            </div>
            <DebounceInput
              debounceTimeout={300}
              size="small"
              type="number"
              placeholder="0.00"
              disabled={disabled || !data}
              value={typeof amount === 'number' && amount >= 0 ? amount : ''}
              onChange={e => {
                const regex = /^[0-9.\b]+$/
                let value
                if (e.target.value === '' || regex.test(e.target.value)) {
                  value = e.target.value
                }
                value = value < 0 ? 0 : value
                setAmount(value && !isNaN(value) ? Number(value) : value)
              }}
              onWheel={e => e.target.blur()}
              className={`w-full bg-slate-50 focus:bg-slate-100 dark:bg-slate-900 dark:focus:bg-slate-800 ${disabled || !data ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl font-mono text-lg font-semibold text-right py-2 px-3`}
            />
            <div className="flex items-center justify-end space-x-2.5">
              {[0.25, 0.5, 0.75, 1.0].map((p, i) => (
                <div
                  key={i}
                  onClick={() => setAmount(p * data?.value)}
                  className={`${disabled || !data?.asset_data?.id ? 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-blue-400 dark:text-slate-200 font-semibold' : p * amount === data?.value ? 'bg-slate-200 dark:bg-slate-700 cursor-pointer text-blue-600 dark:text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-blue-400 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white font-semibold'} rounded-lg shadow dark:shadow-slate-500 py-0.5 px-2`}
                >
                  {p * 100} %
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg space-y-5 py-6 px-4">
            <div className="flex items-center justify-between space-x-3">
              {web3_provider ?
                data ?
                  <span className="text-base">
                    {number_format(data.amountX || 0, '0,0.000000', true)}
                  </span>
                  :
                  <TailSpin color={loader_color(theme)} width="24" height="24" />
                :
                <span className="text-base">
                  -
                </span>
              }
              <div className="text-base font-bold">
                {data?.asset_data?.symbol}
              </div>
            </div>
            <div className="flex items-center justify-between space-x-3">
              {web3_provider ?
                data ?
                  <span className="text-base">
                    {number_format(data.amountY || 0, '0,0.000000', true)}
                  </span>
                  :
                  <TailSpin color={loader_color(theme)} width="24" height="24" />
                :
                <span className="text-base">
                  -
                </span>
              }
              <div className="text-base font-bold">
                {data?.asset_data?.symbol}
              </div>
            </div>
          </div>
          <div className="flex items-end">
            {callResponse || approveResponse ?
              [callResponse || approveResponse].map((r, i) => (
                <Alert
                  key={i}
                  color={`${r.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : r.status === 'success' ? callResponse ? 'bg-yellow-400 dark:bg-blue-500' : 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                  icon={r.status === 'failed' ?
                    <BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> :
                    r.status === 'success' ?
                      callResponse ?
                        <div className="mr-3">
                          <Watch color="white" width="20" height="20" />
                        </div> : <BiMessageCheck className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> :
                      <BiMessageDetail className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />
                  }
                  closeDisabled={true}
                  rounded={true}
                  className="rounded-xl p-4.5"
                >
                  <div className="flex items-center justify-between space-x-2">
                    <span className="break-all">
                      {ellipse(r.message, 128)}
                    </span>
                    <div className="flex items-center space-x-2">
                      {r.status === 'failed' && r.message && (
                        <Copy
                          value={r.message}
                          size={24}
                          className="cursor-pointer text-slate-200 hover:text-white"
                        />
                      )}
                      {r.status === 'failed' ?
                        <button
                          onClick={() => reset()}
                          className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                        >
                          <MdClose size={20} />
                        </button>
                        :
                        r.status === 'success' ?
                          <button
                            onClick={() => reset()}
                            className={`${xcallResponse ? 'bg-yellow-500 dark:bg-blue-400' : 'bg-green-500 dark:bg-green-400'} rounded-full flex items-center justify-center text-white p-1`}
                          >
                            <MdClose size={20} />
                          </button>
                          :
                          null
                      }
                    </div>
                  </div>
                </Alert>
              ))
              :
              web3_provider ?
                <button
                  disabled={disabled || !amount}
                  onClick={() => call()}
                  className={`w-full ${disabled || !amount ? 'bg-slate-100 dark:bg-slate-900 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 cursor-pointer text-white'} rounded-xl text-base sm:text-lg text-center py-3 px-2 sm:px-3`}
                >
                  Remove
                </button>
                :
                <Wallet
                  connectChainId={data?.chain_data?.chain_id}
                  buttonConnectTitle="Connect Wallet"
                  className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-white text-base sm:text-lg text-center sm:space-x-2 py-3 px-2 sm:px-3"
                >
                  <span>
                    Connect Wallet
                  </span>
                </Wallet>
            }
          </div>
        </div>
      }
    </div>
  )
}
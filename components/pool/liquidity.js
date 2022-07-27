import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { FixedNumber, utils } from 'ethers'
import { DebounceInput } from 'react-debounce-input'
import Switch from 'react-switch'
import { TailSpin, RotatingSquare, Watch } from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { BiPlus, BiCaretUp, BiCaretDown, BiMessageError, BiMessageCheck, BiMessageDetail } from 'react-icons/bi'

import GasPrice from '../gas-price'
import Balance from '../balance'
import Faucet from '../faucet'
import Image from '../image'
import Wallet from '../wallet'
import Alert from '../alerts'
import Copy from '../copy'
import { number_format, ellipse, equals_ignore_case, loader_color, sleep } from '../../lib/utils'

const GAS_LIMIT_ADJUSTMENT = Number(process.env.NEXT_PUBLIC_GAS_LIMIT_ADJUSTMENT) || 1
const DEFAULT_POOL_SLIPPAGE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_DEFAULT_POOL_SLIPPAGE_PERCENTAGE) || 3
const DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES = Number(process.env.NEXT_PUBLIC_DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES) || 60
const ACTIONS = ['add', 'remove']

const DEFAULT_OPTIONS = {
  infiniteApprove: false,
  slippage: DEFAULT_POOL_SLIPPAGE_PERCENTAGE,
  deadline: DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES,
}

export default ({
  pool,
  user_pools_data,
  onFinish,
}) => {
  const { preferences, chains, pool_assets, pools, dev, wallet, balances } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, pool_assets: state.pool_assets, pools: state.pools, dev: state.dev, wallet: state.wallet, balances: state.balances }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { pool_assets_data } = { ...pool_assets }
  const { pools_data } = { ...pools }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { web3_provider, address, signer } = { ...wallet_data }
  const { balances_data } = { ...balances }

  const [action, setAction] = useState(_.head(ACTIONS))
  const [amountX, setAmountX] = useState(null)
  const [amountY, setAmountY] = useState(null)
  const [amount, setAmount] = useState(null)
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [openOptions, setOpenOptions] = useState(false)

  const [approving, setApproving] = useState(null)
  const [approveProcessing, setApproveProcessing] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [calling, setCalling] = useState(null)
  const [callProcessing, setCallProcessing] = useState(null)
  const [callResponse, setCallResponse] = useState(null)

  useEffect(() => {
    reset()
  }, [pool])

  useEffect(() => {
    setApproveResponse(null)
    setCallResponse(null)
    if (typeof amountX === 'number') {
      if (amountX > 0) {
        const {
          chain,
          asset,
        } = { ...pool }
        const pool_data = pools_data?.find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)
        let {
          rate,
        } = { ...pool_data }
        rate = rate || 1

        setAmountY(amountX * rate)
      }
      else {
        setAmountY(0)
      }
    }
    else {
      setAmountY(null)
    }
  }, [amountX])

  useEffect(() => {
    setApproveResponse(null)
    setCallResponse(null)
    if (typeof amountY === 'number') {
      if (amountY > 0) {
        const {
          chain,
          asset,
        } = { ...pool }
        const pool_data = pools_data?.find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)
        let {
          rate,
        } = { ...pool_data }
        rate = rate || 1

        setAmountX(amountY / rate)
      }
      else {
        setAmountX(0)
      }
    }
    else {
      setAmountX(null)
    }
  }, [amountY])

  const reset = async origin => {
    const reset_pool = origin !== 'address'
    if (reset_pool) {
      setAmountX(null)
      setAmountY(null)
      setAmount(null)
    }

    setApproving(null)
    setApproveProcessing(null)
    setApproveResponse(null)

    setCalling(null)
    setCallProcessing(null)
    setCallResponse(null)

    if (onFinish) {
      onFinish()
    }
  }

  const call = async pool_data => {
    setApproving(null)
    setCalling(true)
    let success = false
    if (sdk) {
      const {
        chain_data,
        asset_data,
        contract_data,
        domainId,
        tokens,
        decimals,
        symbol,
      } = { ...pool_data }
      const x_asset_data = tokens?.[0] && {
        ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
        ...(
          equals_ignore_case(tokens[0], contract_data?.contract_address) ?
            contract_data :
            {
              chain_id,
              contract_address: tokens[0],
              decimals: decimals?.[0],
              symbol: symbol?.split('-')[0],
            }
        ),
      }
      const y_asset_data = tokens?.[1] && {
        ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
        ...(
          equals_ignore_case(tokens[1], contract_data?.contract_address) ?
            contract_data :
            {
              chain_id,
              contract_address: tokens[1],
              decimals: decimals?.[1],
              symbol: symbol?.split('-')[1],
            }
        ),
      }

      const {
        infiniteApprove,
      } = { ...options }
      let {
        deadline,
      } = { ...options }
      deadline = deadline && moment().add(deadline, 'minutes').valueOf()

      let failed = false
      switch (action) {
        case 'add':
          if (!(amountX && amountY)) {
            failed = true
            setApproving(false)
            break
          }
          const amounts = [
            utils.parseUnits(amountX.toString(), x_asset_data?.decimals || 18).toString(),
            utils.parseUnits(amountY.toString(), y_asset_data?.decimals || 18).toString(),
          ]
          if (!failed) {
            try {
              const approve_request = await sdk.nxtpSdkBase.approveIfNeeded(
                domainId,
                x_asset_data?.contract_address,
                amounts[0],
                infiniteApprove,
              )
              if (approve_request) {
                setApproving(true)
                const approve_response = await signer.sendTransaction(approve_request)
                const tx_hash = approve_response?.hash
                setApproveResponse({
                  status: 'pending',
                  message: `Wait for ${x_asset_data?.symbol} approval`,
                  tx_hash,
                })
                setApproveProcessing(true)
                const approve_receipt = await signer.provider.waitForTransaction(tx_hash)
                setApproveResponse(approve_receipt?.status ?
                  null : {
                    status: 'failed',
                    message: `Failed to approve ${x_asset_data?.symbol}`,
                    tx_hash,
                  }
                )
                failed = !approve_receipt?.status
                setApproveProcessing(false)
                setApproving(false)
              }
              else {
                setApproving(false)
              }
            } catch (error) {
              setApproveResponse({
                status: 'failed',
                message: error?.data?.message || error?.message,
              })
              failed = true
              setApproveProcessing(false)
              setApproving(false)
            }
            if (!failed) {
              try {
                const approve_request = await sdk.nxtpSdkBase.approveIfNeeded(
                  domainId,
                  y_asset_data?.contract_address,
                  amounts[1],
                  infiniteApprove,
                )
                if (approve_request) {
                  setApproving(true)
                  const approve_response = await signer.sendTransaction(approve_request)
                  const tx_hash = approve_response?.hash
                  setApproveResponse({
                    status: 'pending',
                    message: `Wait for ${y_asset_data?.symbol} approval`,
                    tx_hash,
                  })
                  setApproveProcessing(true)
                  const approve_receipt = await signer.provider.waitForTransaction(tx_hash)
                  setApproveResponse(approve_receipt?.status ?
                    null : {
                      status: 'failed',
                      message: `Failed to approve ${y_asset_data?.symbol}`,
                      tx_hash,
                    }
                  )
                  failed = !approve_receipt?.status
                  setApproveProcessing(false)
                  setApproving(false)
                }
                else {
                  setApproving(false)
                }
              } catch (error) {
                setApproveResponse({
                  status: 'failed',
                  message: error?.data?.message || error?.message,
                })
                failed = true
                setApproveProcessing(false)
                setApproving(false)
              }
            }
          }
          if (!failed) {
            try {
              console.log('[getCanonicalFromLocal]', {
                domainId,
                tokenAddress: contract_data?.contract_address,
              })
              const [canonicalDomain, canonicalId] = await sdk.nxtpSdkPool.getCanonicalFromLocal(domainId, contract_data?.contract_address)
              console.log('[Add Liquidity]', {
                domainId,
                canonicalId,
                amounts,
                deadline,
              })
              const add_request = await sdk.nxtpSdkPool.addLiquidity(
                domainId,
                canonicalId,
                amounts,
                deadline,
              )
              if (add_request) {
                let gasLimit = await signer.estimateGas(add_request)
                if (gasLimit) {
                  gasLimit = FixedNumber.fromString(gasLimit.toString())
                    .mulUnsafe(FixedNumber.fromString(GAS_LIMIT_ADJUSTMENT.toString()))
                    .round(0).toString().replace('.0', '')
                  add_request.gasLimit = gasLimit
                }
                const add_response = await signer.sendTransaction(add_request)
                const tx_hash = add_response?.hash
                setCallProcessing(true)
                const add_receipt = await signer.provider.waitForTransaction(tx_hash)
                failed = !add_receipt?.status
                setCallResponse({
                  status: failed ? 'failed' : 'success',
                  message: failed ? `Failed to add ${symbol} liquidity` : `Add ${symbol} liquidity successful`,
                  tx_hash,
                })
                success = true
              }
            } catch (error) {
              setCallResponse({
                status: 'failed',
                message: error?.data?.message || error?.message,
              })
              failed = true
            }
          }
          break
        case 'remove':
          if (!(amount)) {
            failed = true
            setApproving(false)
            break
          }
          const amount = utils.parseUnits(amount.toString(), y_asset_data?.decimals || 18).toString()
          if (!failed) {
            setApproving(false)
          }
          if (!failed) {
            try {
              console.log('[getCanonicalFromLocal]', {
                domainId,
                tokenAddress: contract_data?.contract_address,
              })
              const [canonicalDomain, canonicalId] = await sdk.nxtpSdkPool.getCanonicalFromLocal(domainId, contract_data?.contract_address)
              console.log('[Remove Liquidity]', {
                domainId,
                canonicalId,
                amount,
                deadline,
              })
              const remove_request = await sdk.nxtpSdkPool.removeLiquidity(
                domainId,
                canonicalId,
                amount,
                deadline,
              )
              if (remove_request) {
                let gasLimit = await signer.estimateGas(remove_request)
                if (gasLimit) {
                  gasLimit = FixedNumber.fromString(gasLimit.toString())
                    .mulUnsafe(FixedNumber.fromString(GAS_LIMIT_ADJUSTMENT.toString()))
                    .round(0).toString().replace('.0', '')
                  remove_request.gasLimit = gasLimit
                }
                const remove_response = await signer.sendTransaction(remove_request)
                const tx_hash = remove_response?.hash
                setCallProcessing(true)
                const remove_receipt = await signer.provider.waitForTransaction(tx_hash)
                failed = !remove_receipt?.status
                setCallResponse({
                  status: failed ? 'failed' : 'success',
                  message: failed ? `Failed to remove ${symbol} liquidity` : `Remove ${symbol} liquidity successful`,
                  tx_hash,
                })
                success = true
              }
            } catch (error) {
              setCallResponse({
                status: 'failed',
                message: error?.data?.message || error?.message,
              })
              failed = true
            }
          }
          break
        default:
          break
      }
    }
    setCallProcessing(false)
    setCalling(false)
    if (sdk && address && success) {
      await sleep(2 * 1000)
      if (onFinish) {
        onFinish()
      }
    }
  }

  const {
    chain,
    asset,
  } = { ...pool }
  const chain_data = chains_data?.find(c => c?.id === chain)
  const {
    chain_id,
  } = { ...chain_data }

  const {
    infiniteApprove,
    slippage,
  } = { ...options }

  const selected = !!(chain && asset)
  const no_pool = selected && pool_assets_data?.findIndex(a => a?.id === asset && a.contracts?.findIndex(a => a?.chain_id === chain_id) > -1) < 0
  const pool_data = pools_data?.find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)
  const {
    asset_data,
    contract_data,
    tokens,
    decimals,
    symbol,
  } = { ...pool_data }
  const x_asset_data = tokens?.[0] && {
    ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
    ...(
      equals_ignore_case(tokens[0], contract_data?.contract_address) ?
        contract_data :
        {
          chain_id,
          contract_address: tokens[0],
          decimals: decimals?.[0],
          symbol: symbol?.split('-')[0],
        }
    ),
  }
  const x_balance = x_asset_data && balances_data?.[chain_id]?.find(b => equals_ignore_case(b?.contract_address, x_asset_data.contract_address))
  const x_balance_amount = x_balance && Number(x_balance.amount)
  const y_asset_data = tokens?.[1] && {
    ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
    ...(
      equals_ignore_case(tokens[1], contract_data?.contract_address) ?
        contract_data :
        {
          chain_id,
          contract_address: tokens[1],
          decimals: decimals?.[1],
          symbol: symbol?.split('-')[1],
        }
    ),
  }
  const y_balance = y_asset_data && balances_data?.[chain_id]?.find(b => equals_ignore_case(b?.contract_address, y_asset_data.contract_address))
  const y_balance_amount = y_balance && Number(y_balance.amount)
  const pool_loading = selected && !no_pool && !pool_data

  const user_pool_data = pool_data && user_pools_data?.find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)
  const {
    tokensX,
    tokensY,
  } = { ...user_pool_data }
  const _tokens = user_pool_data?.tokens
  const position_loading = selected && !no_pool && (!user_pools_data || pool_loading)

  const valid_amount = action === 'remove' ?
    amount/* && amount < _tokens*/ :
    amountX && amountY && amountX <= x_balance_amount && amountY <= y_balance_amount
  const disabled = !pool_data || calling || approving

  return (
    <div className="border border-blue-400 dark:border-blue-800 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-600 space-y-3 p-6">
      <div className="flex items-center justify-between space-x-3 mr-1.5">
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
        <GasPrice
          chainId={chain_id}
        />
      </div>
      {action === 'add' ?
        <>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg space-y-5 py-6 px-4">
            <div className="space-y-2">
              {x_asset_data?.contract_address && (
                <div className="flex items-center justify-between -mt-3">
                  {chain_data?.explorer?.url ?
                    <a
                      href={`${chain_data.explorer.url}${chain_data.explorer.contract_path?.replace('{address}', x_asset_data.contract_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="text-base font-bold">
                        {x_asset_data.symbol}
                      </span>
                    </a> :
                    <div className="text-base font-bold">
                      {x_asset_data.symbol}
                    </div>
                  }
                  <div className="space-y-0.5">
                    <div className="text-slate-400 dark:text-slate-600 text-xs font-medium text-right">
                      Balance
                    </div>
                    <Balance
                      chainId={chain_id}
                      asset={asset}
                      contractAddress={x_asset_data.contract_address}
                      symbol={x_asset_data.symbol}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between space-x-3">
                  <DebounceInput
                    debounceTimeout={300}
                    size="small"
                    type="number"
                    placeholder="0.00"
                    disabled={disabled}
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
                    onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                    className={`w-full bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl text-lg font-semibold text-right py-2 px-3`}
                  />
                  <div
                    onClick={() => setAmountX(x_balance_amount)}
                    className={`${disabled || typeof x_balance_amount !== 'number' ? 'pointer-events-none cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-white cursor-pointer'} bg-slate-100 dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-500 text-blue-400 dark:text-slate-200 text-base font-semibold py-0.5 px-2.5`}
                  >
                    Max
                  </div>
                </div>
                {typeof amountX === 'number' && typeof x_balance_amount === 'number' && amountX > x_balance_amount && (
                  <div className="flex items-center text-red-600 dark:text-yellow-400 space-x-1 sm:mx-2">
                    <BiMessageError size={16} className="min-w-max" />
                    <span className="text-xs font-medium">
                      Not enough {x_asset_data?.symbol}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="w-full flex items-center justify-center">
              <BiPlus size={24} />
            </div>
            <div className="space-y-2">
              {y_asset_data?.contract_address && (
                <div className="flex items-center justify-between">
                  {chain_data?.explorer?.url ?
                    <a
                      href={`${chain_data.explorer.url}${chain_data.explorer.contract_path?.replace('{address}', y_asset_data.contract_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="text-base font-bold">
                        {y_asset_data.symbol}
                      </span>
                    </a> :
                    <div className="text-base font-bold">
                      {y_asset_data.symbol}
                    </div>
                  }
                  <div className="space-y-0.5">
                    <div className="text-slate-400 dark:text-slate-600 text-xs font-medium text-right">
                      Balance
                    </div>
                    <Balance
                      chainId={chain_id}
                      asset={asset}
                      contractAddress={y_asset_data.contract_address}
                      symbol={y_asset_data.symbol}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between space-x-3">
                  <DebounceInput
                    debounceTimeout={300}
                    size="small"
                    type="number"
                    placeholder="0.00"
                    disabled={disabled}
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
                    onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                    className={`w-full bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl text-lg font-semibold text-right py-2 px-3`}
                  />
                  <div
                    onClick={() => setAmountY(y_balance_amount)}
                    className={`${disabled || typeof y_balance_amount !== 'number' ? 'pointer-events-none cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-white cursor-pointer'} bg-slate-100 dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-500 text-blue-400 dark:text-slate-200 text-base font-semibold py-0.5 px-2.5`}
                  >
                    Max
                  </div>
                </div>
                {typeof amountY === 'number' && typeof y_balance_amount === 'number' && amountY > y_balance_amount && (
                  <div className="flex items-center text-red-600 dark:text-yellow-400 space-x-1 sm:mx-2">
                    <BiMessageError size={16} className="min-w-max" />
                    <span className="text-xs font-medium">
                      Not enough {y_asset_data?.symbol}
                    </span>
                  </div>
                )}
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
                    Infinite Approval
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={typeof infiniteApprove === 'boolean' ? infiniteApprove : false}
                      onChange={() => {
                        setOptions({
                          ...options,
                          infiniteApprove: !infiniteApprove,
                        })}
                      }
                      onColor="#3b82f6"
                      onHandleColor="#f8fafc"
                      offColor="#64748b"
                      offHandleColor="#f8fafc"
                      width={48}
                      height={24}
                    />
                  </div>
                </div>
                <div className="form-element">
                  <div className="form-label text-slate-600 dark:text-slate-400 font-medium">
                    Slippage Tolerance
                  </div>
                  <div className="flex items-center space-x-3">
                    <DebounceInput
                      debounceTimeout={300}
                      size="small"
                      type="number"
                      placeholder="Slippage Tolerance"
                      value={typeof slippage === 'number' && slippage >= 0 ? slippage : ''}
                      onChange={e => {
                        const regex = /^[0-9.\b]+$/
                        let value
                        if (e.target.value === '' || regex.test(e.target.value)) {
                          value = e.target.value
                        }
                        value = value <= 0 || value > 100 ? DEFAULT_POOL_SLIPPAGE_PERCENTAGE : value
                        setOptions({
                          ...options,
                          slippage: value && !isNaN(value) ? Number(value) : value,
                        })
                      }}
                      onWheel={e => e.target.blur()}
                      onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                      className={`w-20 bg-slate-50 dark:bg-slate-800 border-0 focus:ring-0 rounded-lg font-semibold py-1.5 px-2.5`}
                    />
                    <div className="flex items-center space-x-2.5">
                      {[3.0, 2.0, 1.0].map((p, i) => (
                        <div
                          key={i}
                          onClick={() => setOptions({
                            ...options,
                            slippage: p,
                          })}
                          className={`${slippage === p ? 'bg-blue-600 dark:bg-blue-700 font-bold' : 'bg-blue-400 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 hover:font-semibold'} rounded-lg cursor-pointer text-white py-1 px-2`}
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
                      onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
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
                  color={`${r.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : r.status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                  icon={r.status === 'failed' ?
                    <BiMessageError className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mr-2.5" /> :
                    r.status === 'success' ?
                      <BiMessageCheck className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mr-2.5" /> :
                      r.status === 'pending' ?
                        <div className="mr-2.5">
                          <Watch color="white" width="16" height="16" />
                        </div> :
                        <BiMessageDetail className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mr-2.5" />
                  }
                  closeDisabled={true}
                  rounded={true}
                  className="rounded-xl p-3"
                >
                  <div className="flex items-center justify-between space-x-2">
                    <span className="leading-5 break-all text-xs">
                      {ellipse(r.message, 128)}
                    </span>
                    <div className="flex items-center space-x-2">
                      {/*r.status === 'failed' && r.message && (
                        <Copy
                          value={r.message}
                          size={18}
                          className="cursor-pointer text-slate-200 hover:text-white"
                        />
                      )*/}
                      {chain_data?.explorer?.url && r.tx_hash && (
                        <a
                          href={`${chain_data.explorer.url}${chain_data.explorer.transaction_path?.replace('{tx}', r.tx_hash)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <TiArrowRight size={20} className="transform -rotate-45" />
                        </a>
                      )}
                      {r.status === 'failed' ?
                        <button
                          onClick={() => reset()}
                          className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                        >
                          <MdClose size={16} />
                        </button>
                        :
                        r.status === 'success' ?
                          <button
                            onClick={() => reset()}
                            className="bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center text-white p-1"
                          >
                            <MdClose size={16} />
                          </button>
                          :
                          null
                      }
                    </div>
                  </div>
                </Alert>
              )) :
              web3_provider ?
                <button
                  disabled={disabled || !valid_amount}
                  onClick={() => call(pool_data)}
                  className={`w-full ${disabled || !valid_amount ? calling || approving ? 'bg-blue-400 dark:bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-900 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded-xl text-base sm:text-lg text-center py-3 px-2 sm:px-3`}
                >
                  <span className="flex items-center justify-center space-x-1.5">
                    {(calling || approving) && (
                      <TailSpin color="white" width="20" height="20" />
                    )}
                    <span>
                      {calling ?
                        approving ?
                          approveProcessing ?
                            'Approving' :
                            'Please Approve' :
                          callProcessing ?
                            'Adding' :
                            typeof approving === 'boolean' ?
                              'Please Confirm' :
                              'Checking Approval' :
                        'Supply'
                      }
                    </span>
                  </span>
                </button> :
                <Wallet
                  connectChainId={chain_id}
                  buttonConnectTitle="Connect Wallet"
                  className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-white text-base sm:text-lg text-center sm:space-x-2 py-3 px-2 sm:px-3"
                >
                  <span>
                    Connect Wallet
                  </span>
                </Wallet>
            }
          </div>
        </> :
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="text-slate-400 dark:text-slate-500 font-semibold">
              Your Pool Tokens
            </div>
            <div className="space-y-1">
              <DebounceInput
                debounceTimeout={300}
                size="small"
                type="number"
                placeholder="0.00"
                disabled={disabled}
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
                onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                className={`w-full bg-slate-50 focus:bg-slate-100 dark:bg-slate-900 dark:focus:bg-slate-800 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl text-lg font-semibold text-right py-2 px-3`}
              />
              {typeof amount === 'number' && typeof _tokens === 'number' && amount > _tokens && (
                <div className="flex items-center text-red-600 dark:text-yellow-400 space-x-1 sm:mx-2">
                  <BiMessageError size={16} className="min-w-max" />
                  <span className="text-xs font-medium">
                    Not enough {symbol}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end space-x-2.5">
              {[0.25, 0.5, 0.75, 1.0].map((p, i) => (
                <div
                  key={i}
                  onClick={() => setAmount(p * _tokens)}
                  className={`${disabled || !_tokens ? 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-blue-400 dark:text-slate-200 font-semibold' : p * amount === _tokens ? 'bg-slate-200 dark:bg-slate-700 cursor-pointer text-blue-600 dark:text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-blue-400 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white font-semibold'} rounded-lg shadow dark:shadow-slate-500 py-0.5 px-2`}
                >
                  {p * 100} %
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg space-y-5 py-6 px-4">
            <div className="flex items-center justify-between space-x-3">
              {chain_data?.explorer?.url && x_asset_data?.contract_address ?
                <a
                  href={`${chain_data.explorer.url}${chain_data.explorer.contract_path?.replace('{address}', x_asset_data.contract_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="text-base font-bold">
                    {x_asset_data.symbol}
                  </span>
                </a> :
                <div className="text-base font-bold">
                  {x_asset_data?.symbol}
                </div>
              }
              {web3_provider ?
                !isNaN(tokensX) ?
                  <span className="text-base">
                    {number_format(tokensX || 0, '0,0.000000', true)}
                  </span> :
                  selected && !no_pool && (
                    position_loading ?
                      <RotatingSquare color={loader_color(theme)} width="24" height="24" /> :
                      '-'
                  ) :
                <span className="text-base">
                  -
                </span>
              }
            </div>
            <div className="flex items-center justify-between space-x-3">
              {chain_data?.explorer?.url && y_asset_data?.contract_address ?
                <a
                  href={`${chain_data.explorer.url}${chain_data.explorer.contract_path?.replace('{address}', y_asset_data.contract_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="text-base font-bold">
                    {y_asset_data.symbol}
                  </span>
                </a> :
                <div className="text-base font-bold">
                  {y_asset_data?.symbol}
                </div>
              }
              {web3_provider ?
                !isNaN(tokensY) ?
                  <span className="text-base">
                    {number_format(tokensY || 0, '0,0.000000', true)}
                  </span> :
                  selected && !no_pool && (
                    position_loading ?
                      <RotatingSquare color={loader_color(theme)} width="24" height="24" /> :
                      '-'
                  ) :
                <span className="text-base">
                  -
                </span>
              }
            </div>
          </div>
          <div className="flex items-end">
            {callResponse || approveResponse ?
              [callResponse || approveResponse].map((r, i) => (
                <Alert
                  key={i}
                  color={`${r.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : r.status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                  icon={r.status === 'failed' ?
                    <BiMessageError className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mr-2.5" /> :
                    r.status === 'success' ?
                      <BiMessageCheck className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mr-2.5" /> :
                      r.status === 'pending' ?
                        <div className="mr-2.5">
                          <Watch color="white" width="16" height="16" />
                        </div> :
                        <BiMessageDetail className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mr-2.5" />
                  }
                  closeDisabled={true}
                  rounded={true}
                  className="rounded-xl p-3"
                >
                  <div className="flex items-center justify-between space-x-2">
                    <span className="leading-5 break-all text-xs">
                      {ellipse(r.message, 128)}
                    </span>
                    <div className="flex items-center space-x-2">
                      {/*r.status === 'failed' && r.message && (
                        <Copy
                          value={r.message}
                          size={18}
                          className="cursor-pointer text-slate-200 hover:text-white"
                        />
                      )*/}
                      {chain_data?.explorer?.url && r.tx_hash && (
                        <a
                          href={`${chain_data.explorer.url}${chain_data.explorer.transaction_path?.replace('{tx}', r.tx_hash)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <TiArrowRight size={20} className="transform -rotate-45" />
                        </a>
                      )}
                      {r.status === 'failed' ?
                        <button
                          onClick={() => reset()}
                          className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                        >
                          <MdClose size={16} />
                        </button>
                        :
                        r.status === 'success' ?
                          <button
                            onClick={() => reset()}
                            className="bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center text-white p-1"
                          >
                            <MdClose size={16} />
                          </button>
                          :
                          null
                      }
                    </div>
                  </div>
                </Alert>
              )) :
              web3_provider ?
                <button
                  disabled={disabled || !valid_amount}
                  onClick={() => call(pool_data)}
                  className={`w-full ${disabled || !valid_amount ? calling || approving ? 'bg-blue-400 dark:bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-900 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 cursor-pointer text-white'} rounded-xl text-base sm:text-lg text-center py-3 px-2 sm:px-3`}
                >
                  <span className="flex items-center justify-center space-x-1.5">
                    {(calling || approving) && (
                      <TailSpin color="white" width="20" height="20" />
                    )}
                    <span>
                      {calling ?
                        approving ?
                          approveProcessing ?
                            'Approving' :
                            'Please Approve' :
                          callProcessing ?
                            'Removing' :
                            typeof approving === 'boolean' ?
                              'Please Confirm' :
                              'Checking Approval' :
                        'Remove'
                      }
                    </span>
                  </span>
                </button> :
                <Wallet
                  connectChainId={chain_id}
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
      {['testnet'].includes(process.env.NEXT_PUBLIC_NETWORK) && y_asset_data?.symbol?.startsWith('mad') && (
        <Faucet
          token_id={asset}
          faucet_amount={10}
          contract_data={y_asset_data}
        />
      )}
    </div>
  )
}
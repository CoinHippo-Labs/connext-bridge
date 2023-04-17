import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { FixedNumber, utils } from 'ethers'
import { DebounceInput } from 'react-debounce-input'
import { TailSpin, Watch, RotatingSquare, Oval } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { BiPlus, BiMessageError, BiMessageCheck, BiMessageDetail, BiInfoCircle } from 'react-icons/bi'
import { IoWarning } from 'react-icons/io5'
import { BsArrowRight } from 'react-icons/bs'

import Alert from '../alerts'
import Balance from '../balance'
import Copy from '../copy'
import DecimalsFormat from '../decimals-format'
import Faucet from '../faucet'
import GasPrice from '../gas-price'
import Image from '../image'
import { ProgressBar } from '../progress-bars'
import Wallet from '../wallet'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getBalance } from '../../lib/object/balance'
import { split, toArray, removeDecimal, numberToFixed, ellipse, equalsIgnoreCase, loaderColor, sleep, errorPatterns, parseError } from '../../lib/utils'

const WRAPPED_PREFIX = process.env.NEXT_PUBLIC_WRAPPED_PREFIX
const GAS_LIMIT_ADJUSTMENT = Number(process.env.NEXT_PUBLIC_GAS_LIMIT_ADJUSTMENT)
const DEFAULT_POOL_SLIPPAGE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_DEFAULT_POOL_SLIPPAGE_PERCENTAGE)
const DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES = 60

const ACTIONS = ['deposit', 'withdraw']

const WITHDRAW_OPTIONS = [
  {
    title: 'Balanced amounts',
    value: 'balanced_amounts',
  },
  {
    title: '{x} only',
    value: 'x_only',
    is_staging: false,
  },
  {
    title: '{y} only',
    value: 'y_only',
    is_staging: false,
  },
  {
    title: 'Custom amounts',
    value: 'custom_amounts',
    is_staging: false,
  },
]

const DEFAULT_OPTIONS = {
  infiniteApprove: true,
  slippage: DEFAULT_POOL_SLIPPAGE_PERCENTAGE,
  deadline: DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES,
}

export default (
  {
    pool,
    userPoolsData,
    onFinish,
  },
) => {
  const {
    preferences,
    chains,
    pool_assets,
    pools,
    dev,
    wallet,
    balances,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        pool_assets: state.pool_assets,
        pools: state.pools,
        dev: state.dev,
        wallet: state.wallet,
        balances: state.balances,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }
  const {
    pool_assets_data,
  } = { ...pool_assets }
  const {
    pools_data,
  } = { ...pools }
  const {
    sdk,
  } = { ...dev }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    provider,
    browser_provider,
    signer,
    address,
  } = { ...wallet_data }
  const {
    balances_data,
  } = { ...balances }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    mode,
  } = { ...query }

  const wallet_chain_id = wallet_data?.chain_id

  const [action, setAction] = useState(_.head(ACTIONS))
  const [amountX, setAmountX] = useState(null)
  const [amountY, setAmountY] = useState(null)
  const [withdrawPercent, setWithdrawPercent] = useState(null)
  const [amount, setAmount] = useState(null)
  const [withdrawOption, setWithdrawOption] = useState(_.head(WITHDRAW_OPTIONS)?.value)
  const [removeAmounts, setRemoveAmounts] = useState(null)
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [openOptions, setOpenOptions] = useState(false)

  const [priceImpactAdd, setPriceImpactAdd] = useState(null)
  const [priceImpactAddResponse, setPriceImpactAddResponse] = useState(null)
  const [priceImpactRemove, setPriceImpactRemove] = useState(null)
  const [priceImpactRemoveResponse, setPriceImpactRemoveResponse] = useState(null)

  const [approving, setApproving] = useState(null)
  const [approveProcessing, setApproveProcessing] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [calling, setCalling] = useState(null)
  const [callProcessing, setCallProcessing] = useState(null)
  const [callResponse, setCallResponse] = useState(null)

  useEffect(
    () => {
      reset()
    },
    [action, pool],
  )

  useEffect(
    () => {
      const getData = async () => {
        setPriceImpactAdd(null)
        setPriceImpactAddResponse(null)
        setApproveResponse(null)

        const {
          chain,
          asset,
        } = { ...pool }

        const chain_data = getChain(chain, chains_data)

        const pool_data = toArray(pools_data).find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)

        const {
          contract_data,
          domainId,
          adopted,
          local,
        } = { ...pool_data }

        const {
          contract_address,
        } = { ...contract_data }

        if (domainId && contract_address && typeof amountX === 'string' && !isNaN(amountX) && typeof amountY === 'string' && !isNaN(amountY)) {
          setPriceImpactAdd(true)
          setCallResponse(null)

          let _amountX, _amountY

          try {
            _amountX = utils.parseUnits((amountX || 0).toString(), adopted?.decimals || 18).toString()
            _amountY = utils.parseUnits((amountY || 0).toString(), local?.decimals || 18).toString()

            if (adopted?.index === 1) {
              const _amount = _amountX
              _amountX = _amountY
              _amountY = _amount
            }

            calculateAddLiquidityPriceImpact(domainId, contract_address, _amountX, _amountY)
          } catch (error) {
            const response = parseError(error)

            console.log(
              '[calculateAddLiquidityPriceImpact error]',
              {
                domainId,
                contract_address,
                _amountX,
                _amountY,
                error,
              },
            )

            setPriceImpactAdd(0)
            setPriceImpactAddResponse(
              {
                status: 'failed',
                ...response,
              }
            )
          }
        }
      }

      getData()
    },
    [amountX, amountY],
  )

  useEffect(
    () => {
      switch (withdrawOption) {
        case 'balanced_amounts':
          calculateRemoveSwapLiquidity()
          break
        case 'x_only':
        case 'y_only':
          // const ratio = withdrawOption === 'x_only' ? 1 : 0
          // setRemoveAmounts([amount * ratio, amount * (1 - ratio)].map((a, i) => isNaN(a) ? '' : removeDecimal(a.toFixed((i === 0 ? adopted : local)?.decimals || 18))))
          // setCallResponse(null)
          calculateRemoveSwapLiquidity()
          break
        default:
          calculateRemoveSwapLiquidity()
          break
      }
    },
    [amount],
  )

  useEffect(
    () => {
      switch (withdrawOption) {
        case 'balanced_amounts':
          calculateRemoveSwapLiquidity()
          break
        case 'x_only':
        case 'y_only':
          // const ratio = withdrawOption === 'x_only' ? 1 : 0
          // setRemoveAmounts([amount * ratio, amount * (1 - ratio)].map((a, i) => isNaN(a) ? '' : removeDecimal(a.toFixed((i === 0 ? adopted : local)?.decimals || 18))))
          // setCallResponse(null)
          calculateRemoveSwapLiquidity()
          break
        default:
          if (!(removeAmounts?.length > 1)) {
            calculateRemoveSwapLiquidity()
          }
          break
      }
    },
    [withdrawOption],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (removeAmounts?.length > 1) {
          const {
            chain,
            asset,
          } = { ...pool }

          const chain_data = getChain(chain, chains_data)

          const pool_data = toArray(pools_data).find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)

          const {
            contract_data,
            domainId,
            local,
          } = { ...pool_data }

          const {
            contract_address,
          } = { ...contract_data }

          let amounts =
            _.cloneDeep(removeAmounts)
              .map((a, i) => {
                const decimals = (i === 0 ? adopted : local)?.decimals || 18
                return utils.parseUnits(Number(a).toFixed(decimals), decimals)
              })

          if (equalsIgnoreCase(contract_address, local?.address)) {
            amounts = _.reverse(amounts)
          }

          calculateRemoveLiquidityPriceImpact(domainId, contract_address, _.head(amounts), _.last(amounts))
        }
      }

      getData()
    },
    [removeAmounts],
  )

  const reset = async origin => {
    const reset_pool = !['address', 'user_rejected'].includes(origin)

    if (reset_pool) {
      setAmountX(null)
      setAmountY(null)
      setWithdrawPercent(null)
      setAmount(null)
      setWithdrawOption(_.head(WITHDRAW_OPTIONS)?.value)
    }

    setPriceImpactAddResponse(null)
    setPriceImpactRemoveResponse(null)

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
    setPriceImpactAddResponse(null)
    setPriceImpactRemoveResponse(null)
    setApproving(null)
    setCalling(true)

    let success = false
    let failed = false

    if (sdk) {
      const {
        chain_data,
        asset_data,
        contract_data,
        domainId,
        symbol,
        lpTokenAddress,
        adopted,
        local,
      } = { ...pool_data }

      const {
        contract_address,
      } = { ...contract_data }

      const x_asset_data =
        adopted?.address &&
        {
          ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
          ...(
            equalsIgnoreCase(adopted.address, contract_address) ?
              contract_data :
              {
                chain_id,
                contract_address: adopted.address,
                decimals: adopted.decimals,
                symbol: adopted.symbol,
              }
          ),
        }

      const y_asset_data =
        local?.address &&
        {
          ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
          ...(
            equalsIgnoreCase(local.address, contract_address) ?
              contract_data :
              {
                chain_id,
                contract_address: local.address,
                decimals: local.decimals,
                symbol: local.symbol,
              }
          ),
        }

      const {
        infiniteApprove,
        slippage,
      } = { ...options }
      let {
        deadline,
      } = { ...options }

      deadline = deadline && moment().add(deadline, 'minutes').valueOf()

      switch (action) {
        case 'deposit':
          try {
            if (!(typeof amountX === 'string' && !isNaN(amountX) && typeof amountY === 'string' && !isNaN(amountY)) || !(amountX || amountY)) {
              failed = true
              setApproving(false)
              break
            }

            let amounts = [
              utils.parseUnits((amountX || 0).toString(), x_asset_data?.decimals || 18).toString(),
              utils.parseUnits((amountY || 0).toString(), y_asset_data?.decimals || 18).toString(),
            ]

            const minToMint = '0'

            if (!failed) {
              try {
                const approve_request = await sdk.sdkBase.approveIfNeeded(domainId, x_asset_data?.contract_address, _.head(amounts), infiniteApprove)

                if (approve_request) {
                  setApproving(true)

                  const approve_response = await signer.sendTransaction(approve_request)

                  const {
                    hash,
                  } = { ...approve_response }

                  setApproveResponse(
                    {
                      status: 'pending',
                      message: `Waiting for ${x_asset_data?.symbol} approval`,
                      tx_hash: hash,
                    }
                  )

                  setApproveProcessing(true)

                  const approve_receipt = await signer.provider.waitForTransaction(hash)

                  const {
                    status,
                  } = { ...approve_receipt }

                  setApproveResponse(
                    status ?
                      null :
                      {
                        status: 'failed',
                        message: `Failed to approve ${x_asset_data?.symbol}`,
                        tx_hash: hash,
                      }
                  )

                  failed = !status

                  setApproveProcessing(false)
                  setApproving(false)
                }
                else {
                  setApproving(false)
                }
              } catch (error) {
                const response = parseError(error)

                setApproveResponse(
                  {
                    status: 'failed',
                    ...response,
                  }
                )

                failed = true

                setApproveProcessing(false)
                setApproving(false)
              }

              if (!failed) {
                try {
                  const approve_request = await sdk.sdkBase.approveIfNeeded(domainId, y_asset_data?.contract_address, _.last(amounts), infiniteApprove)

                  if (approve_request) {
                    setApproving(true)

                    const approve_response = await signer.sendTransaction(approve_request)

                    const {
                      hash,
                    } = { ...approve_response }

                    setApproveResponse(
                      {
                        status: 'pending',
                        message: `Waiting for ${y_asset_data?.symbol} approval`,
                        tx_hash: hash,
                      }
                    )

                    setApproveProcessing(true)

                    const approve_receipt = await signer.provider.waitForTransaction(hash)

                    const {
                      status,
                    } = { ...approve_receipt }

                    setApproveResponse(
                      status ?
                        null :
                        {
                          status: 'failed',
                          message: `Failed to approve ${y_asset_data?.symbol}`,
                          tx_hash: hash,
                        }
                    )

                    failed = !status

                    setApproveProcessing(false)
                    setApproving(false)
                  }
                  else {
                    setApproving(false)
                  }
                } catch (error) {
                  const response = parseError(error)

                  setApproveResponse(
                    {
                      status: 'failed',
                      ...response,
                    }
                  )

                  failed = true

                  setApproveProcessing(false)
                  setApproving(false)
                }
              }
            }

            if (!failed) {
              try {
                console.log(
                  '[getPoolTokenIndex]',
                  {
                    domainId,
                    contract_address,
                    tokenAddress: contract_address,
                  },
                )

                const tokenIndex = await sdk.sdkPool.getPoolTokenIndex(domainId, contract_address, contract_address)

                console.log(
                  '[poolTokenIndex]',
                  {
                    domainId,
                    contract_address,
                    tokenAddress: contract_address,
                    tokenIndex,
                  },
                )

                if (tokenIndex === 1) {
                  amounts = _.reverse(_.cloneDeep(amounts))
                }

                console.log(
                  '[addLiquidity]',
                  {
                    domainId,
                    contract_address,
                    amounts,
                    minToMint,
                    deadline,
                  },
                )

                const add_request = await sdk.sdkPool.addLiquidity(domainId, contract_address, amounts, minToMint, deadline)

                if (add_request) {
                  try {
                    let gasLimit = await signer.estimateGas(add_request)

                    if (gasLimit) {
                      gasLimit =
                        FixedNumber.fromString(gasLimit.toString())
                          .mulUnsafe(
                            FixedNumber.fromString(GAS_LIMIT_ADJUSTMENT.toString())
                          )
                          .round(0)
                          .toString()
                          .replace('.0', '')

                      add_request.gasLimit = gasLimit
                    }
                  } catch (error) {}

                  const add_response = await signer.sendTransaction(add_request)

                  const {
                    hash,
                  } = { ...add_response }

                  setCallProcessing(true)

                  const add_receipt = await signer.provider.waitForTransaction(hash)

                  const {
                    status,
                  } = { ...add_receipt }

                  failed = !status

                  setCallResponse(
                    {
                      status: failed ? 'failed' : 'success',
                      message: failed ? `Failed to add ${symbol} liquidity` : `Add ${symbol} liquidity successful`,
                      tx_hash: hash,
                    }
                  )

                  success = true
                }
              } catch (error) {
                const response = parseError(error)

                console.log(
                  '[addLiquidity error]',
                  {
                    domainId,
                    contract_address,
                    amounts,
                    minToMint,
                    deadline,
                    error,
                  },
                )

                switch (response.code) {
                  case 'user_rejected':
                    reset(response.code)
                    break
                  default:
                    setCallResponse(
                      {
                        status: 'failed',
                        ...response
                      }
                    )
                    break
                }

                failed = true
              }
            }
          } catch (error) {}
          break
        case 'withdraw':
          try {
            if (!amount || ['0', '0.0'].includes(amount)) {
              failed = true
              setApproving(false)
              break
            }

            const is_one_token_withdraw = withdrawOption?.endsWith('_only')

            const _amount = utils.parseUnits((amount || 0).toString(), 18).toString()

            let _amounts =
              removeAmounts?.length > 1 &&
              removeAmounts.map((a, i) => {
                const decimals = (i === 0 ? adopted : local)?.decimals || 18
                return utils.parseUnits((Number(a) * (1 - slippage / 100)).toFixed(decimals), decimals).toString()
              })

            if (adopted?.index === 1) {
              _amounts = _.reverse(_amounts)
            }

            const withdraw_contract_address = is_one_token_withdraw ? (withdrawOption === 'x_only' ? x_asset_data : y_asset_data)?.contract_address : undefined
            const minAmounts = withdrawOption !== 'custom_amounts' ? _amounts || ['0', '0'] : undefined
            const minAmount = is_one_token_withdraw ? _.head(toArray(minAmounts).filter(a => a !== '0')) : undefined
            const amounts = withdrawOption === 'custom_amounts' ? _amounts || ['0', '0'] : undefined
            const maxBurnAmount = withdrawOption === 'custom_amounts' ? '0' : undefined

            if (!failed) {
              try {
                const approve_request = await sdk.sdkBase.approveIfNeeded(domainId, lpTokenAddress, _amount, infiniteApprove)

                if (approve_request) {
                  setApproving(true)

                  const approve_response = await signer.sendTransaction(approve_request)

                  const {
                    hash,
                  } = { ...approve_response }

                  setApproveResponse(
                    {
                      status: 'pending',
                      message: `Waiting for ${symbol} approval`,
                      tx_hash: hash,
                    }
                  )

                  setApproveProcessing(true)

                  const approve_receipt = await signer.provider.waitForTransaction(hash)

                  const {
                    status,
                  } = { ...approve_receipt }

                  setApproveResponse(
                    status ?
                      null :
                      {
                        status: 'failed',
                        message: `Failed to approve ${symbol}`,
                        tx_hash: hash,
                      }
                  )

                  failed = !status

                  setApproveProcessing(false)
                  setApproving(false)
                }
                else {
                  setApproving(false)
                }
              } catch (error) {
                const response = parseError(error)

                setApproveResponse(
                  {
                    status: 'failed',
                    ...response,
                  }
                )

                failed = true

                setApproveProcessing(false)
                setApproving(false)
              }
            }

            if (!failed) {
              const method = is_one_token_withdraw ? 'removeLiquidityOneToken' : withdrawOption === 'custom_amounts' ? 'removeLiquidityImbalance' : 'removeLiquidity'

              try {
                console.log(
                  `[${method}]`,
                  {
                    domainId,
                    contract_address,
                    withdraw_contract_address,
                    amount: _amount,
                    minAmounts,
                    minAmount,
                    amounts,
                    maxBurnAmount,
                    deadline,
                  },
                )

                const remove_request =
                  is_one_token_withdraw ?
                    await sdk.sdkPool.removeLiquidityOneToken(domainId, contract_address, withdraw_contract_address, _amount, minAmount, deadline) :
                    withdrawOption === 'custom_amounts' ?
                      await sdk.sdkPool.removeLiquidityImbalance(domainId, contract_address, amounts, maxBurnAmount, deadline) :
                      await sdk.sdkPool.removeLiquidity(domainId, contract_address, _amount, minAmounts, deadline)

                if (remove_request) {
                  try {
                    let gasLimit = await signer.estimateGas(remove_request)

                    if (gasLimit) {
                      gasLimit =
                        FixedNumber.fromString(gasLimit.toString())
                          .mulUnsafe(
                            FixedNumber.fromString(GAS_LIMIT_ADJUSTMENT.toString())
                          )
                          .round(0)
                          .toString()
                          .replace('.0', '')

                      remove_request.gasLimit = gasLimit
                    }
                  } catch (error) {}

                  const remove_response = await signer.sendTransaction(remove_request)

                  const {
                    hash,
                  } = { ...remove_response }

                  setCallProcessing(true)

                  const remove_receipt = await signer.provider.waitForTransaction(hash)

                  const {
                    status,
                  } = { ...remove_receipt }

                  failed = !status

                  setCallResponse(
                    {
                      status: failed ? 'failed' : 'success',
                      message: failed ? `Failed to remove ${symbol} liquidity` : `Remove ${symbol} liquidity successful`,
                      tx_hash: hash,
                    }
                  )

                  success = true
                }
              } catch (error) {
                const response = parseError(error)

                console.log(
                  `[${method} error]`,
                  {
                    domainId,
                    contract_address,
                    withdraw_contract_address,
                    amount: _amount,
                    minAmounts,
                    minAmount,
                    amounts,
                    maxBurnAmount,
                    deadline,
                    error,
                  },
                )

                let {
                  message,
                } = { ...response }

                if (message?.includes('exceed total supply')) {
                  message = 'Exceed Total Supply'
                }

                switch (response.code) {
                  case 'user_rejected':
                    reset(response.code)
                    break
                  default:
                    setCallResponse(
                      {
                        status: 'failed',
                        message,
                        ...response,
                      }
                    )
                    break
                }

                failed = true
              }
            }
          } catch (error) {}
          break
        default:
          break
      }
    }

    setCallProcessing(false)
    setCalling(false)

    if (sdk && address && success) {
      await sleep(1 * 1000)

      if (onFinish) {
        onFinish()
      }

      if (!failed) {
        switch (action) {
          case 'deposit':
            setAmountX(null)
            setAmountY(null)
            break
          case 'withdraw':
            setWithdrawPercent(null)
            setAmount(null)
            break
          default:
            break
        }
      }
    }
  }

  const calculateRemoveSwapLiquidity = async () => {
    setPriceImpactRemove(null)

    if (typeof amount === 'string') {
      if (utils.parseUnits(amount || '0', 18).toBigInt() <= 0) {
        setRemoveAmounts(['0', '0'])
      }
      else {
        const {
          chain,
          asset,
        } = { ...pool }

        const chain_data = getChain(chain, chains_data)

        const pool_data = toArray(pools_data).find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)

        const {
          contract_data,
          domainId,
          adopted,
          local,
        } = { ...pool_data }

        const {
          contract_address,
        } = { ...contract_data }

        const _amount = utils.parseUnits((amount || 0).toString(), 18).toString()

        try {
          setPriceImpactRemove(true)

          let amounts

          if (withdrawOption?.endsWith('_only')) {
            const index = (withdrawOption === 'x_only' && adopted?.index === 1) || (withdrawOption === 'y_only' && local?.index === 1) ? 1 : 0

            console.log(
              '[calculateRemoveSwapLiquidityOneToken]',
              {
                domainId,
                contract_address,
                amount: _amount,
                index,
              },
            )

            amounts = await sdk.sdkPool.calculateRemoveSwapLiquidityOneToken(domainId, contract_address, _amount, index)

            if (index === 1) {
              amounts = _.concat('0', amounts?.toString())
            }
            else {
              amounts = _.concat(amounts?.toString(), '0')
            }

            console.log(
              '[amountsRemoveSwapLiquidityOneToken]',
              {
                domainId,
                contract_address,
                amount: _amount,
                index,
                amounts,
              },
            )
          }
          else {
            console.log(
              '[calculateRemoveSwapLiquidity]',
              {
                domainId,
                contract_address,
                amount: _amount,
              },
            )

            amounts = await sdk.sdkPool.calculateRemoveSwapLiquidity(domainId, contract_address, _amount)

            console.log(
              '[amountsRemoveSwapLiquidity]',
              {
                domainId,
                contract_address,
                amount: _amount,
                amounts,
              },
            )
          }

          let _amounts

          if (amounts?.length > 1) {
            console.log(
              '[getPoolTokenIndex]',
              {
                domainId,
                contract_address,
                tokenAddress: contract_address,
              },
            )

            const tokenIndex = await sdk.sdkPool.getPoolTokenIndex(domainId, contract_address, contract_address)

            console.log(
              '[poolTokenIndex]',
              {
                domainId,
                contract_address,
                tokenAddress: contract_address,
                tokenIndex,
              },
            )

            if (tokenIndex === 1) {
              _amounts = _.reverse(_.cloneDeep(amounts))
            }
            else {
              _amounts = _.cloneDeep(amounts)
            }

            // calculateRemoveLiquidityPriceImpact(domainId, contract_address, _.head(amounts), _.last(amounts))
          }

          setRemoveAmounts(toArray(_amounts).map((a, i) => Number(utils.formatUnits(BigInt(a || '0'), (i === 0 ? adopted : local)?.decimals || 18))))
          setCallResponse(null)
        } catch (error) {
          const response = parseError(error)

          console.log(
            '[calculateRemoveSwapLiquidity error]',
            {
              domainId,
              contract_address,
              amount: _amount,
              error,
            },
          )

          let {
            message,
          } = { ...response }

          if (message?.includes('exceed total supply')) {
            message = 'Exceed Total Supply'
          }

          setCallResponse(
            {
              status: 'failed',
              ...response,
              message,
            }
          )

          setRemoveAmounts(null)
          setPriceImpactRemove(null)
        }
      }
    }
    else {
      setRemoveAmounts(null)
      setCallResponse(null)
    }
  }

  const calculateAddLiquidityPriceImpact = async (
    domainId,
    contractAddress,
    amountX,
    amountY,
  ) => {
    let manual

    try {
      setPriceImpactAdd(true)

      if ([chain_data?.id].includes(pool_data?.chain_data?.id) && pool_data?.tvl) {
        console.log(
          '[calculateAddLiquidityPriceImpact]',
          {
            domainId,
            contractAddress,
            amountX,
            amountY,
          },
        )

        const price_impact = await sdk.sdkPool.calculateAddLiquidityPriceImpact(domainId, contractAddress, amountX, amountY)

        console.log(
          '[addLiquidityPriceImpact]',
          {
            domainId,
            contractAddress,
            amountX,
            amountY,
            price_impact,
          },
        )

        setPriceImpactAdd(Number(utils.formatUnits(BigInt(price_impact || '0'), 18)) * 100)
      }
      else {
        manual = true
      }
    } catch (error) {
      const response = parseError(error)

      console.log(
        '[calculateAddLiquidityPriceImpact error]',
        {
          domainId,
          contractAddress,
          amountX,
          amountY,
          error,
        },
      )

      const {
        message,
      } = { ...response }

      if (message?.includes('reverted')) {
        manual = true
      }
      else {
        setPriceImpactAdd(0)
        setPriceImpactAddResponse(
          {
            status: 'failed',
            ...response,
          }
        )
      }
    }

    if (manual) {
      setPriceImpactAdd(null)
    }
  }

  const calculateRemoveLiquidityPriceImpact = async (
    domainId,
    contractAddress,
    amountX,
    amountY,
  ) => {
    let manual

    try {
      setPriceImpactRemove(true)

      if ([chain_data?.id].includes(pool_data?.chain_data?.id) && pool_data?.tvl) {
        console.log(
          '[calculateRemoveLiquidityPriceImpact]',
          {
            domainId,
            contractAddress,
            amountX,
            amountY,
          },
        )

        const price_impact = await sdk.sdkPool.calculateRemoveLiquidityPriceImpact(domainId, contractAddress, amountX, amountY)

        console.log(
          '[removeLiquidityPriceImpact]',
          {
            domainId,
            contractAddress,
            amountX,
            amountY,
            price_impact,
          },
        )

        setPriceImpactRemove(Number(utils.formatUnits(BigInt(price_impact || '0'), 18)) * 100)
      }
      else {
        manual = true
      }
    } catch (error) {
      const response = parseError(error)

      console.log(
        '[calculateRemoveLiquidityPriceImpact error]',
        {
          domainId,
          contractAddress,
          amountX,
          amountY,
          error,
        },
      )

      const {
        message,
      } = { ...response }

      if (message?.includes('reverted')) {
        manual = true
      }
      else {
        setPriceImpactRemove(0)
        setPriceImpactRemoveResponse(
          {
            status: 'failed',
            ...response,
          }
        )
      }
    }

    if (manual) {
      setPriceImpactRemove(null)
    }
  }

  const {
    chain,
    asset,
  } = { ...pool }

  const chain_data = getChain(chain, chains_data)

  const {
    chain_id,
    name,
    image,
    explorer,
  } = { ...chain_data }

  const {
    url,
    contract_path,
    transaction_path,
  } = { ...explorer }

  const {
    infiniteApprove,
    slippage,
  } = { ...options }

  const selected = !!(chain && asset)

  const no_pool = selected && !getAsset(asset, pool_assets_data, chain_id)

  const pool_data = toArray(pools_data).find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)

  const {
    asset_data,
    contract_data,
    symbol,
    lpTokenAddress,
    error,
  } = { ...pool_data }
  let {
    adopted,
    local,
  } = { ...pool_data }

  const {
    contract_address,
    next_asset,
  } = { ...contract_data }

  const _image = contract_data?.image
  const image_paths = split(_image, 'normal', '/')
  const image_name = _.last(image_paths)

  const x_asset_data =
    adopted?.address &&
    {
      ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
      ...(
        equalsIgnoreCase(adopted.address, contract_address) ?
          contract_data :
          {
            chain_id,
            contract_address: adopted.address,
            decimals: adopted.decimals,
            symbol: adopted.symbol,
            image:
              _image ?
                !adopted.symbol ?
                  _image :
                  adopted.symbol.startsWith(WRAPPED_PREFIX) ?
                    !image_name.startsWith(WRAPPED_PREFIX) ?
                      image_paths.map((s, i) => i === image_paths.length - 1 ? `${WRAPPED_PREFIX}${s}` : s).join('/') :
                      _image :
                    !image_name.startsWith(WRAPPED_PREFIX) ?
                      _image :
                      image_paths.map((s, i) => i === image_paths.length - 1 ? s.substring(WRAPPED_PREFIX.length) : s).join('/') :
                undefined,
          }
      ),
    }

  const _x_asset_data =
    adopted?.address &&
    {
      ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
      ...contract_data,
    }

  const x_balance_amount = x_asset_data && getBalance(chain_id, x_asset_data.contract_address, balances_data)?.amount

  const y_asset_data =
    local?.address &&
    {
      ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
      ...(
        equalsIgnoreCase(local.address, contract_address) ?
          contract_data :
          {
            chain_id,
            contract_address: local.address,
            decimals: local.decimals,
            symbol: local.symbol,
            image:
              _image ?
                !local.symbol ?
                  _image :
                  local.symbol.startsWith(WRAPPED_PREFIX) ?
                    !image_name.startsWith(WRAPPED_PREFIX) ?
                      image_paths.map((s, i) => i === image_paths.length - 1 ? `${WRAPPED_PREFIX}${s}` : s).join('/') :
                      _image :
                    !image_name.startsWith(WRAPPED_PREFIX) ?
                      _image :
                      image_paths.map((s, i) => i === image_paths.length - 1 ? s.substring(WRAPPED_PREFIX.length) : s).join('/') :
                undefined,
          }
      ),
    }

  const y_balance_amount = y_asset_data && getBalance(chain_id, y_asset_data.contract_address, balances_data)?.amount

  const pool_loading = selected && !no_pool && !error && !pool_data

  const user_pool_data = pool_data && toArray(userPoolsData).find(p => p?.chain_data?.id === chain && p.asset_data?.id === asset)

  const {
    lpTokenBalance,
  } = { ...user_pool_data }

  const x_remove_amount = equalsIgnoreCase(adopted?.address, contract_address) ? _.head(removeAmounts) : _.last(removeAmounts)

  const y_remove_amount = equalsIgnoreCase(adopted?.address, contract_address) ? _.last(removeAmounts) : _.head(removeAmounts)

  const position_loading = selected && !no_pool && !error && (!userPoolsData || pool_loading)

  const pool_tokens_data =
    toArray(_.concat(adopted, local))
      .map((a, i) => {
        const {
          address,
          symbol,
          decimals,
        } = { ...a }

        return {
          i,
          contract_address: address,
          chain_id,
          symbol,
          decimals,
          image:
            (equalsIgnoreCase(address, contract_address) ?
              contract_data?.image :
              equalsIgnoreCase(address, next_asset?.contract_address) ?
                next_asset?.image || contract_data?.image :
                null
            ) ||
            asset_data?.image,
        }
      })

  adopted = { ...adopted, asset_data: _.head(pool_tokens_data) }
  local = { ...local, asset_data: _.last(pool_tokens_data) }

  const native_asset = !adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local

  const wrapped_asset = adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local

  const native_amount = Number(native_asset?.balance || '0')

  const wrapped_amount = Number(wrapped_asset?.balance || '0')

  const total_amount = native_amount + wrapped_amount

  const {
    color,
  } = { ...asset_data }

  const valid_amount =
    action === 'withdraw' ?
      typeof amount === 'string' && !isNaN(amount) && amount &&
      utils.parseUnits(amount, 18).toBigInt() <= utils.parseUnits((lpTokenBalance || 0).toString(), 18).toBigInt() &&
      utils.parseUnits(amount, 18).toBigInt() > 0 :
      typeof amountX === 'string' && !isNaN(amountX) && typeof amountY === 'string' && !isNaN(amountY) && (amountX || amountY) &&
      utils.parseUnits(amountX || '0', x_asset_data?.decimals || 18).toBigInt() <= utils.parseUnits((x_balance_amount || 0).toString(), x_asset_data?.decimals || 18).toBigInt() &&
      utils.parseUnits(amountY || '0', y_asset_data?.decimals || 18).toBigInt() <= utils.parseUnits((y_balance_amount || 0).toString(), y_asset_data?.decimals || 18).toBigInt() &&
      (utils.parseUnits(amountX || '0', x_asset_data?.decimals || 18).toBigInt() > 0 || utils.parseUnits(amountY || '0', y_asset_data?.decimals || 18).toBigInt() > 0)

  const overweighted_asset =
    adopted && local &&
    (Number(amountX) + Number((equalsIgnoreCase(adopted.address, x_asset_data?.contract_address) ? adopted : local).balance)) >
    (Number(amountY) + Number((equalsIgnoreCase(adopted.address, y_asset_data?.contract_address) ? adopted : local).balance)) ?
      'x' :
      'y'

  const disabled = !pool_data || error || calling || approving

  const wrong_chain = wallet_chain_id !== chain_id && !callResponse

  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  return (
    <div className="order-1 lg:order-2 space-y-3">
      <div className="bg-slate-50 dark:bg-slate-900 rounded border dark:border-slate-800 space-y-3 pt-4 3xl: pt-6 pb-5 3xl:pb-7 px-4 3xl:px-6">
        <div className="flex items-center justify-between space-x-2">
          <span className="text-lg 3xl:text-2xl font-semibold">
            Manage Balance
          </span>
          <GasPrice
            chainId={chain_id}
            iconSize={16}
            className="text-xs 3xl:text-xl"
          />
        </div>
        <div className="space-y-4 3xl:space-y-6">
          <div className="w-fit border-b dark:border-slate-800 flex items-center justify-between space-x-4">
            {ACTIONS.map((a, i) => (
              <div
                key={i}
                onClick={() => setAction(a)}
                className={`w-fit border-b-2 ${action === a ? 'border-slate-300 dark:border-slate-200 font-semibold' : 'border-transparent text-slate-400 dark:text-slate-500 font-semibold'} cursor-pointer capitalize text-sm 3xl:text-xl text-left py-3 px-0`}
              >
                {a}
              </div>
            ))}
          </div>
          {action === 'deposit' ?
            <>
              <div className="3xl:space-y-4 pt-1 px-0">
                <div className="space-y-1">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                      Token 1
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                        Balance:
                      </div>
                      {
                        x_asset_data?.contract_address && browser_provider &&
                        (
                          <button
                            disabled={disabled}
                            onClick={
                              () => {
                                if (['string', 'number'].includes(typeof x_balance_amount)) {
                                  setAmountX(x_balance_amount.toString())

                                  if (typeof amountY !== 'string' || !amountY) {
                                    setAmountY('0')
                                  }
                                }
                              }
                            }
                            className="flex items-center space-x-1.5"
                          >
                            <Balance
                              chainId={chain_id}
                              asset={asset}
                              contractAddress={x_asset_data.contract_address}
                              symbol={x_asset_data.symbol}
                              hideSymbol={true}
                              className="text-xs 3xl:text-xl"
                            />
                            <span className={`${disabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400'} text-xs 3xl:text-xl font-medium`}>
                              Max
                            </span>
                          </button>
                        )
                      }
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="rounded border dark:border-slate-800 flex items-center justify-between space-x-2 py-2.5 px-3">
                      {
                        x_asset_data?.contract_address &&
                        (
                          <div className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-1.5">
                              <a
                                href={`${url}${contract_path?.replace('{address}', x_asset_data.contract_address)}${address ? `?a=${address}` : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-max flex items-center space-x-1.5"
                              >
                                {
                                  x_asset_data.image &&
                                  (
                                    <Image
                                      src={x_asset_data.image}
                                      width={20}
                                      height={20}
                                      className="3xl:w-6 3xl:h-6 rounded-full"
                                    />
                                  )
                                }
                                <span className="text-base 3xl:text-2xl font-semibold">
                                  {x_asset_data.symbol}
                                </span>
                              </a>
                            </div>
                          </div>
                        )
                      }
                      <DebounceInput
                        debounceTimeout={750}
                        size="small"
                        type="number"
                        placeholder="0.00"
                        disabled={disabled}
                        value={['string', 'number'].includes(typeof amountX) && !isNaN(amountX) ? amountX : ''}
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

                              value = numberToFixed(value, x_asset_data?.decimals || 18)
                            }

                            setAmountX(value)

                            if (typeof amountY !== 'string' || !amountY) {
                              setAmountY('0')
                            }
                          }
                        }
                        onWheel={e => e.target.blur()}
                        onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                        className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base 3xl:text-2xl font-medium text-right`}
                      />
                    </div>
                    {
                      typeof amountX === 'string' && ['string', 'number'].includes(typeof x_balance_amount) &&
                      utils.parseUnits(amountX || '0', x_asset_data?.decimals || 18).toBigInt() > utils.parseUnits((x_balance_amount || 0).toString(), x_asset_data?.decimals || 18).toBigInt() &&
                      (
                        <div className="flex items-center justify-end text-red-600 dark:text-yellow-400 space-x-1 sm:mx-0">
                          <BiMessageError
                            size={16}
                            className="min-w-max 3xl:w-5 3xl:h-5"
                          />
                          <span className="text-xs 3xl:text-lg font-medium">
                            Not enough {x_asset_data?.symbol}
                          </span>
                        </div>
                      )
                    }
                  </div>
                </div>
                <div className="w-full flex items-center justify-center mt-2.5 -mb-2">
                  <BiPlus
                    size={20}
                    className="3xl:w-6 3xl:h-6 text-slate-400 dark:text-slate-500"
                  />
                </div>
                <div className="space-y-1 mt-2.5">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                      Token 2
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                        Balance:
                      </div>
                      {
                        y_asset_data?.contract_address && browser_provider &&
                        (
                          <button
                            disabled={disabled}
                            onClick={
                              () => {
                                if (['string', 'number'].includes(typeof y_balance_amount)) {
                                  setAmountY(y_balance_amount.toString())

                                  if (typeof amountX !== 'string' || !amountX) {
                                    setAmountX('0')
                                  }
                                }
                              }
                            }
                            className="flex items-center space-x-1.5"
                          >
                            <Balance
                              chainId={chain_id}
                              asset={asset}
                              contractAddress={y_asset_data.contract_address}
                              symbol={y_asset_data.symbol}
                              hideSymbol={true}
                              className="text-xs 3xl:text-xl"
                            />
                            <span className={`${disabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400'} text-xs 3xl:text-xl font-medium`}>
                              Max
                            </span>
                          </button>
                        )
                      }
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="rounded border dark:border-slate-800 flex items-center justify-between space-x-2 py-2.5 px-3">
                      {
                        y_asset_data?.contract_address &&
                        (
                          <div className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-1.5">
                              <a
                                href={`${url}${contract_path?.replace('{address}', y_asset_data.contract_address)}${address ? `?a=${address}` : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-max flex items-center space-x-1.5"
                              >
                                {
                                  y_asset_data.image &&
                                  (
                                    <Image
                                      src={y_asset_data.image}
                                      width={20}
                                      height={20}
                                      className="3xl:w-5 3xl:h-5 rounded-full"
                                    />
                                  )
                                }
                                <span className="text-base 3xl:text-2xl font-semibold">
                                  {y_asset_data.symbol}
                                </span>
                              </a>
                            </div>
                          </div>
                        )
                      }
                      <DebounceInput
                        debounceTimeout={750}
                        size="small"
                        type="number"
                        placeholder="0.00"
                        disabled={disabled}
                        value={['string', 'number'].includes(typeof amountY) && !isNaN(amountY) ? amountY : ''}
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

                              value = numberToFixed(value, y_asset_data?.decimals || 18)
                            }

                            setAmountY(value)

                            if (typeof amountX !== 'string' || !amountX) {
                              setAmountX('0')
                            }
                          }
                        }
                        onWheel={e => e.target.blur()}
                        onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                        className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base 3xl:text-2xl font-medium text-right`}
                      />
                    </div>
                    {
                      typeof amountY === 'string' && ['string', 'number'].includes(typeof y_balance_amount) &&
                      utils.parseUnits(amountY || '0', y_asset_data?.decimals || 18).toBigInt() > utils.parseUnits((y_balance_amount || 0).toString(), y_asset_data?.decimals || 18).toBigInt() &&
                      (
                        <div className="flex items-center justify-end text-red-600 dark:text-yellow-400 space-x-1 sm:mx-0">
                          <BiMessageError
                            size={16}
                            className="min-w-max 3xl:w-5 3xl:h-5"
                          />
                          <span className="text-xs 3xl:text-lg font-medium">
                            Not enough {y_asset_data?.symbol}
                          </span>
                        </div>
                      )
                    }
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {
                  pool_data && false &&
                  (
                    <div className="flex flex-col space-y-3">
                      <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                        Pool Ratio
                      </div>
                      <div className="w-full h-6 flex flex-col items-end justify-center space-y-1.5">
                        <ProgressBar
                          width={native_amount * 100 / total_amount}
                          className="w-full 3xl:h-2 rounded-lg"
                          backgroundClassName="3xl: h-2 rounded-lg"
                          style={{ backgroundColor: color }}
                          backgroundStyle={{ backgroundColor: `${color}33` }}
                        />
                        <div className="w-full flex items-center justify-between space-x-2">
                          <div className="flex flex-col items-start space-y-0.5">
                            <div className="flex items-center space-x-1">
                              {
                                native_asset?.asset_data?.image &&
                                (
                                  <Image
                                    src={native_asset.asset_data.image}
                                    width={16}
                                    height={16}
                                    className="rounded-full"
                                  />
                                )
                              }
                              <DecimalsFormat
                                value={native_amount * 100 / total_amount}
                                suffix="%"
                                className="leading-4 text-xs 3xl:text-xl font-medium"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-0.5">
                            <div className="flex items-center space-x-1">
                              {
                                (wrapped_asset?.contract_data?.next_asset?.image || wrapped_asset?.asset_data?.image) &&
                                (
                                  <Image
                                    src={wrapped_asset?.contract_data?.next_asset?.image || wrapped_asset?.asset_data?.image}
                                    width={16}
                                    height={16}
                                    className="rounded-full"
                                  />
                                )
                              }
                              <DecimalsFormat
                                value={100 - (native_amount * 100 / total_amount)}
                                suffix="%"
                                className="leading-4 text-xs 3xl:text-xl font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
                <div className="space-y-2">
                  <div className="flex items-center justify-between space-x-1">
                    <Tooltip
                      placement="top"
                      content="The adjusted amount you are paying for LP tokens above or below current market prices."
                      className="w-80 z-50 bg-dark text-white text-xs"
                    >
                      <div className="flex items-center">
                        <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                          {typeof priceImpactAdd === 'number' ? priceImpactAdd < 0 ? 'Slippage' : 'Bonus' : 'Price impact'}
                        </div>
                        <BiInfoCircle
                          size={14}
                          className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                        />
                      </div>
                    </Tooltip>
                    <div className="flex items-center text-xs 3xl:text-xl font-semibold space-x-1">
                      {priceImpactAdd === true && !priceImpactAddResponse ?
                        <Oval
                          width="10"
                          height="10"
                          color={loaderColor(theme)}
                        /> :
                        <span className={`${typeof priceImpactAdd === 'number' ? priceImpactAdd < 0 ? 'text-red-500 dark:text-red-500' : priceImpactAdd > 0 ? 'text-green-500 dark:text-green-500' : '' : ''}`}>
                          {typeof priceImpactAdd === 'number' || priceImpactAddResponse ?
                            <DecimalsFormat
                              value={priceImpactAdd}
                              className="whitespace-nowrap"
                            /> :
                            <span>
                              -
                            </span>
                          }
                          <span>
                            %
                          </span>
                        </span>
                      }
                    </div>
                  </div>
                  {/*
                    typeof priceImpactAdd === 'number' && priceImpactAdd < 0 &&
                    (
                      <div className="bg-yellow-50 dark:bg-yellow-200 bg-opacity-50 dark:bg-opacity-10 rounded flex items-start space-x-2 pt-2 pb-3 px-2">
                        <IoWarning
                          size={18}
                          className="min-w-max 3xl:w-6 3xl:h-6 text-yellow-500 dark:text-yellow-400 mt-1"
                        />
                        <div className="flex flex-col space-y-3">
                          <div className="flex flex-col space-y-2.5">
                            <span className="text-base 3xl:text-xl font-bold">
                              Warning
                            </span>
                            <span className="flex flex-wrap items-center leading-4 text-xs 3xl:text-lg text-left">
                              <span className="mr-1">
                                You may have
                              </span>
                              <DecimalsFormat
                                value={priceImpactAdd}
                                className="font-bold mr-1"
                                suffix="%"
                              />
                              <span className="mr-1">
                                slippage because
                              </span>
                              <span className="font-bold mr-1">
                                {(overweighted_asset === 'x' ? x_asset_data : y_asset_data)?.symbol}
                              </span>
                              <span>
                                is currently overweighted in this pool.
                              </span>
                            </span>
                            <div className="flex flex-col items-center space-y-1">
                              <span className="leading-4 text-xs 3xl:text-lg text-left">
                                <span className="mr-1">
                                  If you provide additional
                                </span>
                                <span className="font-bold mr-1">
                                  {(overweighted_asset === 'x' ? y_asset_data : x_asset_data)?.symbol}
                                </span>
                                <span className="mr-1">
                                  instead, you may receive
                                </span>
                                <span className="font-bold mr-1">
                                  bonus
                                </span>
                                <span>
                                  tokens.
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-0">
                            <div className="w-fit bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 rounded flex items-center space-x-1 pt-0.5 pb-1 px-2">
                              <a
                                href={`/${asset.toUpperCase()}-from-${_.head(chains_data)?.id}-to-${chain}?${asset_data?.symbol === _.head(_.head(chains_data)?.provider_params)?.nativeCurrency?.symbol ? `symbol=${asset_data?.symbol}&` : ''}${(overweighted_asset === 'x' ? y_asset_data : x_asset_data)?.symbol?.includes(WRAPPED_PREFIX) ? 'receive_next=true&' : ''}source=pool`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <span className="leading-3 3xl:leading-4 text-white text-xs 3xl:text-xl font-medium">
                                  Click here to get {(overweighted_asset === 'x' ? y_asset_data : x_asset_data)?.symbol}
                                </span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  */}
                </div>
              </div>
              <div className="flex items-end">
                {!valid_amount ?
                  <button
                    disabled={true}
                    className="w-full bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500 rounded text-base 3xl:text-2xl text-center py-3 px-2 sm:px-3"
                  >
                    <span className="flex items-center justify-center space-x-1.5">
                      <span>
                        Enter amount
                      </span>
                    </span>
                  </button> :
                  chain && browser_provider && wrong_chain ?
                    <Wallet
                      connectChainId={chain_id}
                      className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base 3xl:text-2xl font-medium space-x-1.5 sm:space-x-2 py-3 px-2 sm:px-3"
                    >
                      <span>
                        {is_walletconnect ? 'Reconnect' : 'Switch'} to
                      </span>
                      {
                        image &&
                        (
                          <Image
                            src={image}
                            width={28}
                            height={28}
                            className="rounded-full"
                          />
                        )
                      }
                      <span className="font-medium">
                        {name}
                      </span>
                    </Wallet> :
                    callResponse || approveResponse || priceImpactAddResponse || priceImpactRemoveResponse ?
                      toArray(callResponse || approveResponse || priceImpactAddResponse || priceImpactRemoveResponse)
                        .map((r, i) => {
                          const {
                            status,
                            message,
                            tx_hash,
                          } = { ...r }

                          return (
                            <Alert
                              key={i}
                              color={`${status === 'failed' ? 'bg-red-400 dark:bg-red-500' : status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white`}
                              icon={
                                status === 'failed' ?
                                  <BiMessageError
                                    className="w-4 h-4 stroke-current mr-2.5"
                                  /> :
                                  status === 'success' ?
                                    <BiMessageCheck
                                      className="w-4 h-4 stroke-current mr-2.5"
                                    /> :
                                    status === 'pending' ?
                                      <div className="mr-2.5">
                                        <Watch
                                          color="white"
                                          width="16"
                                          height="16"
                                        />
                                      </div> :
                                      <BiMessageDetail
                                        className="w-4 h-4 stroke-current mr-2.5"
                                      />
                              }
                              closeDisabled={true}
                              rounded={true}
                              className="rounded p-3"
                            >
                              <div className="flex items-center justify-between space-x-2">
                                <span className={`leading-5 ${status === 'failed' ? 'break-words text-xs' : 'break-words'} text-sm 3xl:text-xl font-medium`}>
                                  {ellipse(
                                    split(message, 'normal', ' ')
                                      .join(' ')
                                      .substring(0, status === 'failed' && errorPatterns.findIndex(c => message?.indexOf(c) > -1) > -1 ? message.indexOf(errorPatterns.find(c => message.indexOf(c) > -1)) : undefined) ||
                                    message,
                                    128,
                                  )}
                                </span>
                                <div className="flex items-center space-x-1">
                                  {
                                    url && tx_hash &&
                                    (
                                      <a
                                        href={`${url}${transaction_path?.replace('{tx}', tx_hash)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <TiArrowRight
                                          size={20}
                                          className="transform -rotate-45"
                                        />
                                      </a>
                                    )
                                  }
                                  {status === 'failed' ?
                                    <>
                                      <Copy
                                        value={message}
                                        className="cursor-pointer text-slate-200 hover:text-white"
                                      />
                                      <button
                                        onClick={() => reset()}
                                        className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                                      >
                                        <MdClose
                                          size={14}
                                        />
                                      </button>
                                    </> :
                                    status === 'success' ?
                                      <button
                                        onClick={() => reset()}
                                        className="bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center text-white p-1"
                                      >
                                        <MdClose
                                          size={14}
                                        />
                                      </button> :
                                      null
                                  }
                                </div>
                              </div>
                            </Alert>
                          )
                        }) :
                        browser_provider ?
                          <button
                            disabled={disabled || !valid_amount}
                            onClick={() => call(pool_data)}
                            className={`w-full ${disabled || !valid_amount ? calling || approving ? 'bg-blue-400 dark:bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded text-base 3xl:text-2xl text-center py-3 px-2 sm:px-3`}
                          >
                            <span className="flex items-center justify-center space-x-1.5">
                              {
                                (calling || approving) &&
                                (
                                  <TailSpin
                                    width="20"
                                    height="20"
                                    color="white"
                                  />
                                )
                              }
                              <span>
                                {calling ?
                                  approving ?
                                    approveProcessing ?
                                      'Approving' :
                                      'Please Approve' :
                                    callProcessing ?
                                      'Depositing' :
                                      typeof approving === 'boolean' ?
                                        'Please Confirm' :
                                        'Checking Approval' :
                                  !valid_amount ?
                                    'Enter amount' :
                                    'Supply'
                                }
                              </span>
                            </span>
                          </button> :
                          <Wallet
                            connectChainId={chain_id}
                            buttonConnectTitle="Connect Wallet"
                            className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base 3xl:text-2xl font-medium text-center py-3 px-2 sm:px-3"
                          >
                            <span>
                              Connect Wallet
                            </span>
                          </Wallet>
                }
              </div>
            </> :
            <>
              <div className="space-y-6 py-3 px-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between space-x-2">
                    <span className="text-xs 3xl:text-lg font-medium">
                      Withdraw %
                    </span>
                    <div className="flex items-center space-x-1">
                      <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs 3xl:text-lg font-medium">
                        LP Token Balance:
                      </div>
                      {
                        browser_provider && user_pool_data &&
                        (
                          <div className="flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs 3xl:text-lg space-x-1">
                            {['string', 'number'].includes(typeof lpTokenBalance) ?
                              <DecimalsFormat
                                value={lpTokenBalance}
                                className="3xl:text-lg font-semibold"
                              /> :
                              typeof lpTokenBalance === 'string' ?
                                <span>
                                  n/a
                                </span> :
                                <RotatingSquare
                                  width="16"
                                  height="16"
                                  color={loaderColor(theme)}
                                />
                            }
                          </div>
                        )
                      }
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="rounded border dark:border-slate-800 flex items-center justify-between space-x-1 py-2.5 px-3">
                      <DebounceInput
                        debounceTimeout={750}
                        size="small"
                        type="number"
                        placeholder="0.00"
                        disabled={disabled}
                        value={['string', 'number'].includes(typeof withdrawPercent) && !isNaN(withdrawPercent) ? withdrawPercent : ''}
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

                              if (value) {
                                if (Number(value) < 0) {
                                  value = '0'
                                }
                                else if (Number(value) > 100) {
                                  value = '100'
                                }
                              }

                              value = numberToFixed(value, 2)
                            }

                            setWithdrawPercent(value)

                            let _amount

                            try {
                              if (value) {
                                _amount =
                                  Number(value) === 100 ?
                                    (lpTokenBalance || 0).toString() :
                                    FixedNumber.fromString((lpTokenBalance || 0).toString())
                                      .mulUnsafe(
                                        FixedNumber.fromString(value.toString())
                                      )
                                      .divUnsafe(
                                        FixedNumber.fromString('100')
                                      )
                                      .toString()
                              }
                            } catch (error) {
                              _amount = '0'
                            }

                            setAmount(_amount)
                          }
                        }
                        onWheel={e => e.target.blur()}
                        onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                        className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base 3xl:text-2xl font-medium text-right`}
                      />
                      <span className="text-slate-400 dark:text-slate-500 3xl:text-2xl">
                        %
                      </span>
                    </div>
                    {
                      typeof amount === 'string' && ['string', 'number'].includes(typeof lpTokenBalance) &&
                      utils.parseUnits(amount || '0', 18).toBigInt() > utils.parseUnits((lpTokenBalance || 0).toString(), 18).toBigInt() &&
                      (
                        <div className="flex items-center justify-end text-red-600 dark:text-yellow-400 space-x-1 sm:mx-0">
                          <BiMessageError
                            size={16}
                            className="min-w-max 3xl:w-5 3xl:h-5"
                          />
                          <span className="text-xs 3xl:text-lg font-medium">
                            Not enough {symbol}
                          </span>
                        </div>
                      )
                    }
                  </div>
                  {
                    ['string', 'number'].includes(typeof lpTokenBalance) && utils.parseUnits((lpTokenBalance || 0).toString(), 18).toBigInt() > 0 &&
                    (
                      <div className="flex items-center justify-end space-x-2.5">
                        {[0.25, 0.5, 0.75, 1.0].map((p, i) => (
                          <div
                            key={i}
                            onClick={
                              () => {
                                setWithdrawPercent(p * 100)

                                let _amount

                                try {
                                  _amount =
                                    p === 1 ?
                                      (lpTokenBalance || 0).toString() :
                                      FixedNumber.fromString((lpTokenBalance || 0).toString())
                                        .mulUnsafe(
                                          FixedNumber.fromString(p.toString())
                                        )
                                        .toString()
                                } catch (error) {
                                  _amount = '0'
                                }

                                setAmount(_amount)
                              }
                            }
                            className={
                              `${
                                disabled || !['string', 'number'].includes(typeof lpTokenBalance) ?
                                  'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-blue-400 dark:text-slate-200 font-semibold' :
                                  FixedNumber.fromString((lpTokenBalance || 0).toString())
                                    .mulUnsafe(
                                      FixedNumber.fromString(p.toString())
                                    )
                                    .toString() === amount ?
                                    'bg-slate-300 dark:bg-slate-700 cursor-pointer text-blue-600 dark:text-white font-semibold' :
                                    'bg-slate-100 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-800 cursor-pointer text-blue-400 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white 3xl:text-xl font-medium'
                              } rounded text-xs py-0.5 px-1.5`
                            }
                          >
                            {p * 100} %
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>
                {
                  x_asset_data && y_asset_data &&
                  (
                    <div className="space-y-4">
                      <div className="flex flex-col space-y-2">
                        {WITHDRAW_OPTIONS.map((o, i) => {
                          const {
                            value,
                            is_staging,
                          } = { ...o }
                          let {
                            title,
                          } = { ...o }

                          title = title.replace('{x}', x_asset_data.symbol).replace('{y}', y_asset_data.symbol)

                          const selected = value === withdrawOption

                          const _disabled = disabled || (is_staging && !mode)

                          return (
                            <div
                              key={i}
                              onClick={
                                () => {
                                  if (!_disabled) {
                                    setWithdrawOption(value)
                                  }
                                }
                              }
                              className={`${_disabled ? 'cursor-not-allowed' : 'cursor-pointer'} inline-flex items-center space-x-2`}
                            >
                              <input
                                disabled={_disabled}
                                type="radio"
                                value={value}
                                checked={selected}
                                className={`w-4 3xl:w-5 h-4 3xl:h-5 ${_disabled ? 'cursor-not-allowed' : 'cursor-pointer'} text-blue-500 mt-0.5`}
                              />
                              <span className={`${selected ? 'font-bold' : 'text-slate-400 dark:text-slate-500 font-medium'} 3xl:text-xl`}>
                                {title} {is_staging && !mode ? '(coming soon)' : ''}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="space-y-2.5">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between space-x-2">
                            <span className="text-slate-600 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                              You Receive
                            </span>
                            <div className="flex items-center justify-between space-x-2">
                              <div className="flex items-center space-x-1">
                                <div className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                                  Balance:
                                </div>
                                <button
                                  disabled={disabled}
                                  className="cursor-default"
                                >
                                  <Balance
                                    chainId={chain_id}
                                    asset={asset}
                                    contractAddress={x_asset_data.contract_address}
                                    decimals={x_asset_data.decimals}
                                    symbol={x_asset_data.symbol}
                                    hideSymbol={false}
                                    className="text-xs 3xl:text-xl"
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-800 space-y-0.5 py-2.5 px-3">
                            <div className="flex items-center justify-between space-x-2">
                              {url && x_asset_data.contract_address ?
                                <a
                                  href={`${url}${contract_path?.replace('{address}', x_asset_data.contract_address)}${address ? `?a=${address}` : ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-w-max flex items-center space-x-1.5"
                                >
                                  {
                                    x_asset_data.image &&
                                    (
                                      <Image
                                        src={x_asset_data.image}
                                        width={20}
                                        height={20}
                                        className="3xl:w-6 3xl:h-6 rounded-full"
                                      />
                                    )
                                  }
                                  <span className="text-base 3xl:text-2xl font-semibold">
                                    {x_asset_data.symbol}
                                  </span>
                                </a> :
                                <span className="text-base 3xl:text-2xl font-semibold">
                                  {x_asset_data.symbol}
                                </span>
                              }
                              {withdrawOption === 'custom_amounts' ?
                                <DebounceInput
                                  debounceTimeout={750}
                                  size="small"
                                  type="number"
                                  placeholder="0.00"
                                  disabled={disabled}
                                  value={['string', 'number'].includes(typeof x_remove_amount) && !isNaN(x_remove_amount) ? x_remove_amount : ''}
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

                                        value = numberToFixed(value, x_asset_data?.decimals || 18)
                                      }

                                      if (amount) {
                                        if (Number(value) > amount) {
                                          value = numberToFixed(amount.toString(), x_asset_data?.decimals || 18)
                                        }
                                      }
                                      else {
                                        value = '0'
                                      }

                                      setRemoveAmounts([value, amount - Number(value)].map((a, i) => isNaN(a) ? '' : removeDecimal(Number(a).toFixed((i === 0 ? x_asset_data : y_asset_data)?.decimals || 18))))
                                    }
                                  }
                                  onWheel={e => e.target.blur()}
                                  onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                                  className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base 3xl:text-2xl font-medium text-right`}
                                /> :
                                ['string', 'number'].includes(typeof x_remove_amount) && !isNaN(x_remove_amount) ?
                                  <DecimalsFormat
                                    value={x_remove_amount}
                                    className="w-fit bg-transparent text-slate-500 dark:text-slate-500 text-base 3xl:text-2xl font-medium text-right"
                                  /> :
                                  selected && !no_pool && !error &&
                                  (position_loading && amount ?
                                    <TailSpin
                                      width="24"
                                      height="24"
                                      color={loaderColor(theme)}
                                    /> :
                                    null
                                  )
                              }
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between space-x-2">
                            <span className="text-slate-600 dark:text-slate-500 text-xs font-medium" />
                            <div className="flex items-center justify-between space-x-2">
                              <div className="flex items-center space-x-1">
                                <div className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                                  Balance:
                                </div>
                                <button
                                  disabled={disabled}
                                  className="cursor-default"
                                >
                                  <Balance
                                    chainId={chain_id}
                                    asset={asset}
                                    contractAddress={y_asset_data.contract_address}
                                    decimals={y_asset_data.decimals}
                                    symbol={y_asset_data.symbol}
                                    hideSymbol={false}
                                    className="text-xs 3xl:text-xl"
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-800 space-y-0.5 py-2.5 px-3">
                            <div className="flex items-center justify-between space-x-2">
                              {url && y_asset_data.contract_address ?
                                <a
                                  href={`${url}${contract_path?.replace('{address}', y_asset_data.contract_address)}${address ? `?a=${address}` : ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-w-max flex items-center space-x-1.5"
                                >
                                  {
                                    y_asset_data.image &&
                                    (
                                      <Image
                                        src={y_asset_data.image}
                                        width={20}
                                        height={20}
                                        className="3xl:w-6 3xl:h-6 rounded-full"
                                      />
                                    )
                                  }
                                  <span className="text-base 3xl:text-2xl font-semibold">
                                    {y_asset_data.symbol}
                                  </span>
                                </a> :
                                <span className="text-base 3xl:text-2xl font-semibold">
                                  {y_asset_data.symbol}
                                </span>
                              }
                              {withdrawOption === 'custom_amounts' ?
                                <DebounceInput
                                  debounceTimeout={750}
                                  size="small"
                                  type="number"
                                  placeholder="0.00"
                                  disabled={disabled}
                                  value={['string', 'number'].includes(typeof y_remove_amount) && !isNaN(y_remove_amount) ? y_remove_amount : ''}
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

                                        value = numberToFixed(value, y_asset_data?.decimals || 18)
                                      }

                                      if (amount) {
                                        if (Number(value) > amount) {
                                          value = numberToFixed(amount.toString(), y_asset_data?.decimals || 18)
                                        }
                                      }
                                      else {
                                        value = '0'
                                      }

                                      setRemoveAmounts([amount - Number(value), value].map((a, i) => isNaN(a) ? '' : removeDecimal(Number(a).toFixed((i === 0 ? x_asset_data : y_asset_data)?.decimals || 18))))
                                    }
                                  }
                                  onWheel={e => e.target.blur()}
                                  onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                                  className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base 3xl:text-2xl font-medium text-right`}
                                /> :
                                ['string', 'number'].includes(typeof y_remove_amount) && !isNaN(y_remove_amount) ?
                                  <DecimalsFormat
                                    value={y_remove_amount}
                                    className="w-fit bg-transparent text-slate-500 dark:text-slate-500 text-base font-medium text-right"
                                  /> :
                                  selected && !no_pool && !error &&
                                  (position_loading && amount ?
                                    <TailSpin
                                      width="24"
                                      height="24"
                                      color={loaderColor(theme)}
                                    /> :
                                    null
                                )
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between space-x-1">
                          <Tooltip
                            placement="top"
                            content="The adjusted amount you are withdrawing for LP tokens above or below current market prices."
                            className="w-80 z-50 bg-dark text-white text-xs"
                          >
                            <div className="flex items-center">
                              <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                                Slippage
                              </div>
                              <BiInfoCircle
                                size={14}
                                className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                              />
                            </div>
                          </Tooltip>
                          <div className="flex items-center text-xs 3xl:text-xl font-semibold space-x-1">
                            {priceImpactRemove === true && !priceImpactRemoveResponse ?
                              <Oval
                                width="10"
                                height="10"
                                color={loaderColor(theme)}
                              /> :
                              <span className={`${typeof priceImpactRemove === 'number' ? priceImpactRemove < 0 ? 'text-red-500 dark:text-red-500' : priceImpactRemove > 0 ? 'text-green-500 dark:text-green-500' : '' : ''}`}>
                                {typeof priceImpactRemove === 'number' || priceImpactRemoveResponse ?
                                  <DecimalsFormat
                                    value={priceImpactRemove}
                                    className="whitespace-nowrap 3xl:text-xl"
                                  /> :
                                  <span>
                                    -
                                  </span>
                                }
                                <span>
                                  %
                                </span>
                              </span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
              </div>
              <div className="flex items-end">
                {!valid_amount ?
                  <button
                    disabled={true}
                    className="w-full bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500 rounded text-base 3xl:text-2xl text-center py-3 px-2 sm:px-3"
                  >
                    <span className="flex items-center justify-center space-x-1.5">
                      <span>
                        Enter amount
                      </span>
                    </span>
                  </button> :
                  browser_provider && wrong_chain ?
                    <Wallet
                      connectChainId={chain_id}
                      className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base 3xl:text-2xl font-medium space-x-1.5 sm:space-x-2 py-3 px-2 sm:px-3"
                    >
                      <span>
                        {is_walletconnect ? 'Reconnect' : 'Switch'} to
                      </span>
                      {
                        image &&
                        (
                          <Image
                            src={image}
                            width={28}
                            height={28}
                            className="rounded-full"
                          />
                        )
                      }
                      <span className="font-medium">
                        {name}
                      </span>
                    </Wallet> :
                    callResponse || approveResponse || priceImpactAddResponse || priceImpactRemoveResponse ?
                      toArray(callResponse || approveResponse || priceImpactAddResponse || priceImpactRemoveResponse)
                        .map((r, i) => {
                          const {
                            status,
                            message,
                            tx_hash,
                          } = { ...r }

                          return (
                            <Alert
                              key={i}
                              color={`${status === 'failed' ? 'bg-red-400 dark:bg-red-500' : status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white`}
                              icon={
                                status === 'failed' ?
                                  <BiMessageError
                                    className="w-4 h-4 stroke-current mr-2.5"
                                  /> :
                                  status === 'success' ?
                                    <BiMessageCheck
                                      className="w-4 h-4 stroke-current mr-2.5"
                                    /> :
                                    status === 'pending' ?
                                      <div className="mr-2.5">
                                        <Watch
                                          color="white"
                                          width="16"
                                          height="16"
                                        />
                                      </div> :
                                      <BiMessageDetail
                                        className="w-4 h-4 stroke-current mr-2.5"
                                      />
                              }
                              closeDisabled={true}
                              rounded={true}
                              className="rounded p-3"
                            >
                              <div className="flex items-center justify-between space-x-2">
                                <span className={`leading-5 ${status === 'failed' ? 'break-words text-xs' : 'break-words'} text-sm 3xl:text-xl font-medium`}>
                                  {ellipse(
                                    split(message, 'normal', ' ')
                                      .join(' ')
                                      .substring(0, status === 'failed' && errorPatterns.findIndex(c => message?.indexOf(c) > -1) > -1 ? message.indexOf(errorPatterns.find(c => message.indexOf(c) > -1)) : undefined) ||
                                    message,
                                    128,
                                  )}
                                </span>
                                <div className="flex items-center space-x-1">
                                  {
                                    url && r.tx_hash &&
                                    (
                                      <a
                                        href={`${url}${transaction_path?.replace('{tx}', tx_hash)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <TiArrowRight
                                          size={20}
                                          className="transform -rotate-45"
                                        />
                                      </a>
                                    )
                                  }
                                  {status === 'failed' ?
                                    <>
                                      <Copy
                                        value={message}
                                        className="cursor-pointer text-slate-200 hover:text-white"
                                      />
                                      <button
                                        onClick={() => reset()}
                                        className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                                      >
                                        <MdClose
                                          size={14}
                                        />
                                      </button>
                                    </> :
                                    status === 'success' ?
                                      <button
                                        onClick={() => reset()}
                                        className="bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center text-white p-1"
                                      >
                                        <MdClose
                                          size={14}
                                        />
                                      </button> :
                                      null
                                  }
                                </div>
                              </div>
                            </Alert>
                          )
                        }) :
                        browser_provider ?
                          <button
                            disabled={disabled || !valid_amount}
                            onClick={() => call(pool_data)}
                            className={`w-full ${disabled || !valid_amount ? calling || approving ? 'bg-blue-400 dark:bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded text-base 3xl:text-2xl text-center py-3 px-2 sm:px-3`}
                          >
                            <span className="flex items-center justify-center space-x-1.5">
                              {
                                (calling || approving) &&
                                (
                                  <TailSpin
                                    width="20"
                                    height="20"
                                    color="white"
                                  />
                                )
                              }
                              <span>
                                {calling ?
                                  approving ?
                                    approveProcessing ?
                                      'Approving' :
                                      'Please Approve' :
                                    callProcessing ?
                                      'Withdrawing' :
                                      typeof approving === 'boolean' ?
                                        'Please Confirm' :
                                        'Checking Approval' :
                                  !valid_amount ?
                                    'Enter amount' :
                                    'Withdraw'
                                }
                              </span>
                            </span>
                          </button> :
                          <Wallet
                            connectChainId={chain_id}
                            buttonConnectTitle="Connect Wallet"
                            className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base 3xl:text-2xl font-medium text-center py-3 px-2 sm:px-3"
                          >
                            <span>
                              Connect Wallet
                            </span>
                          </Wallet>
                }
              </div>
            </>
          }
          {
            (_x_asset_data?.mintable || _x_asset_data?.wrapable || _x_asset_data?.wrapped) &&
            (
              <Faucet
                tokenId={asset}
                contractData={_x_asset_data}
                titleClassName={wrong_chain ? 'text-slate-400 dark:text-slate-600' : ''}
                className="w-full max-w-lg bg-transparent flex flex-col items-center justify-center space-y-2 mx-auto"
              />
            )
          }
        </div>
      </div>
      {
        process.env.NEXT_PUBLIC_LP_GUIDE &&
        (
          <div className="flex flex-wrap items-center text-xs 3xl:text-xl space-x-1 ml-4 3xl:ml-6">
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              Stuck?
            </span>
            <a
              href={process.env.NEXT_PUBLIC_LP_GUIDE}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1"
            >
              <span className="text-slate-400 dark:text-slate-500 font-medium">
                Click here for our
              </span>
              <span className="text-blue-500 dark:text-white font-bold">
                LP guide
              </span>
              <BsArrowRight
                size={10}
                className="3xl:w-4 3xl:h-4 text-blue-500 dark:text-white"
              />
            </a>
          </div>
        )
      }
    </div>
  )
}
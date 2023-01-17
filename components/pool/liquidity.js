import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, FixedNumber, utils } from 'ethers'
import { DebounceInput } from 'react-debounce-input'
import Switch from 'react-switch'
import { TailSpin, Watch, RotatingSquare, Oval } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { BiPlus, BiCaretUp, BiCaretDown, BiMessageError, BiMessageCheck, BiMessageDetail, BiInfoCircle } from 'react-icons/bi'
import { HiSwitchHorizontal } from 'react-icons/hi'
import { IoWarning } from 'react-icons/io5'

import GasPrice from '../gas-price'
import Balance from '../balance'
import Faucet from '../faucet'
import Image from '../image'
import Wallet from '../wallet'
import Alert from '../alerts'
import Copy from '../copy'
import { number_format, number_to_fixed, ellipse, equals_ignore_case, loader_color, switch_color, sleep, error_patterns } from '../../lib/utils'

const WRAPPED_PREFIX =
  process.env.NEXT_PUBLIC_WRAPPED_PREFIX ||
  'next'

const GAS_LIMIT_ADJUSTMENT =
  Number(
    process.env.NEXT_PUBLIC_GAS_LIMIT_ADJUSTMENT
  ) ||
  1

const DEFAULT_POOL_SLIPPAGE_PERCENTAGE =
  Number(
    process.env.NEXT_PUBLIC_DEFAULT_POOL_SLIPPAGE_PERCENTAGE
  ) ||
  3

const DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES =
  Number(
    process.env.NEXT_PUBLIC_DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES
  ) ||
  60

const ACTIONS =
  [
    'deposit',
    'withdraw',
  ]

const DEFAULT_OPTIONS = {
  infiniteApprove: true,
  slippage: DEFAULT_POOL_SLIPPAGE_PERCENTAGE,
  deadline: DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES,
}

export default (
  {
    pool,
    user_pools_data,
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
  } = useSelector(state =>
    (
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
    web3_provider,
    address,
    signer,
  } = { ...wallet_data }
  const {
    balances_data,
  } = { ...balances }

  const wallet_chain_id = wallet_data?.chain_id

  const [action, setAction] =
    useState(
      _.head(ACTIONS)
    )
  const [amountX, setAmountX] = useState(null)
  const [amountY, setAmountY] = useState(null)
  const [amount, setAmount] = useState(null)
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

        const chain_data = (chains_data || [])
          .find(c =>
            c?.id === chain
          )

        const pool_data = (pools_data || [])
          .find(p =>
            p?.chain_data?.id === chain &&
            p.asset_data?.id === asset
          )

        const {
          contract_data,
          domainId,
          adopted,
          local,
        } = { ...pool_data }
        const {
          contract_address,
        } = { ...contract_data }

        if (
          domainId &&
          contract_address &&
          typeof amountX === 'string' &&
          !isNaN(amountX) &&
          typeof amountY === 'string' &&
          !isNaN(amountY)
        ) {
          setPriceImpactAdd(true)
          setCallResponse(null)

          let _amountX,
            _amountY

          try {
            _amountX =
              utils.parseUnits(
                (
                  amountX ||
                  0
                )
                .toString(),
                adopted?.decimals ||
                18,
              )
              .toString()

            _amountY =
              utils.parseUnits(
                (
                  amountY ||
                  0
                )
                .toString(),
                local?.decimals ||
                18,
              )
              .toString()

            if (adopted?.index === 1) {
              const _amount = _amountX

              _amountX = _amountY
              _amountY = _amount
            }

            calculateAddLiquidityPriceImpact(
              domainId,
              contract_address,
              _amountX,
              _amountY,
            )
          } catch (error) {
            const message =
              error?.reason ||
              error?.data?.message ||
              error?.message

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

            const code =
              _.slice(
                (message || '')
                  .toLowerCase()
                  .split(' ')
                  .filter(s => s),
                0,
                2,
              )
              .join('_')

            setPriceImpactAdd(0)
            setPriceImpactAddResponse(
              {
                status: 'failed',
                message,
                code,
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
      const getData = async () => {
        setPriceImpactRemove(null)

        if (typeof amount === 'string') {
          if (
            utils.parseUnits(
              amount ||
              '0',
              18,
            )
            .lte(
              BigNumber.from(
                '0'
              )
            )
          ) {
            setRemoveAmounts(
              [
                '0',
                '0',
              ]
            )
          }
          else {
            const {
              chain,
              asset,
            } = { ...pool }

            const chain_data = (chains_data || [])
              .find(c =>
                c?.id === chain
              )

            const pool_data = (pools_data || [])
              .find(p =>
                p?.chain_data?.id === chain &&
                p.asset_data?.id === asset
              )

            const {
              contract_data,
              domainId,
              adopted,
              local,
            } = { ...pool_data }
            const {
              contract_address,
            } = { ...contract_data }

            const _amount =
              utils.parseUnits(
                (
                  amount ||
                  0
                )
                .toString(),
                18,
              )
              .toString()

            try {
              setPriceImpactRemove(true)

              console.log(
                '[calculateRemoveSwapLiquidity]',
                {
                  domainId,
                  contract_address,
                  amount: _amount,
                },
              )

              let amounts =
                await sdk.nxtpSdkPool
                  .calculateRemoveSwapLiquidity(
                    domainId,
                    contract_address,
                    _amount,
                  )

              console.log(
                '[amountsRemoveSwapLiquidity]',
                {
                  domainId,
                  contract_address,
                  amount: _amount,
                  amounts,
                },
              )

              if (amounts?.length > 1) {
                console.log(
                  '[getPoolTokenIndex]',
                  {
                    domainId,
                    contract_address,
                    tokenAddress: contract_address,
                  },
                )

                const tokenIndex =
                  await sdk.nxtpSdkPool
                    .getPoolTokenIndex(
                      domainId,
                      contract_address,
                      contract_address,
                    )

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
                  amounts =
                    _.reverse(
                      _.cloneDeep(amounts)
                    )
                }

                calculateRemoveLiquidityPriceImpact(
                  domainId,
                  contract_address,
                  _.head(amounts),
                  _.last(amounts),
                )
              }

              setRemoveAmounts(
                (amounts || [])
                  .map((a, i) =>
                    Number(
                      utils.formatUnits(
                        BigNumber.from(
                          a ||
                          '0'
                        ),
                        (
                          adopted?.index === i ?
                            adopted :
                            local
                        ).decimals ||
                        18,
                      )
                    )
                  )
              )
              setCallResponse(null)
            } catch (error) {
              let message =
                error?.reason ||
                error?.data?.message ||
                error?.message

              console.log(
                '[calculateRemoveSwapLiquidity error]',
                {
                  domainId,
                  contract_address,
                  amount: _amount,
                  error,
                },
              )

              if (message?.includes('exceed total supply')) {
                message = 'Exceed Total Supply'
              }

              setCallResponse(
                {
                  status: 'failed',
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

      getData()
    },
    [amount],
  )

  const reset = async origin => {
    const reset_pool =
      ![
        'address',
        'user_rejected',
      ].includes(origin)

    if (reset_pool) {
      setAmountX(null)
      setAmountY(null)
      setAmount(null)
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
          ...(
            Object.fromEntries(
              Object.entries({ ...asset_data })
                .filter(([k, v]) =>
                  !['contracts'].includes(k)
                )
            )
          ),
          ...(
            equals_ignore_case(
              adopted.address,
              contract_address,
            ) ?
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
          ...(
            Object.fromEntries(
              Object.entries({ ...asset_data })
                .filter(([k, v]) =>
                  !['contracts'].includes(k)
                )
            )
          ),
          ...(
            equals_ignore_case(
              local.address,
              contract_address,
            ) ?
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
      } = { ...options }
      let {
        deadline,
      } = { ...options }

      deadline =
        deadline &&
        moment()
          .add(
            deadline,
            'minutes',
          )
          .valueOf()

      switch (action) {
        case 'deposit':
          if (
            !(
              typeof amountX === 'string' &&
              !isNaN(amountX) &&
              typeof amountY === 'string' &&
              !isNaN(amountY)
            ) ||
            !(
              amountX ||
              amountY
            )
          ) {
            failed = true

            setApproving(false)
            break
          }

          let amounts =
            [
              utils.parseUnits(
                (
                  amountX ||
                  0
                )
                .toString(),
                x_asset_data?.decimals ||
                18,
              )
              .toString(),
              utils.parseUnits(
                (
                  amountY ||
                  0
                )
                .toString(),
                y_asset_data?.decimals ||
                18,
              )
              .toString(),
            ]

          const minToMint = '0'

          if (!failed) {
            try {
              const approve_request =
                await sdk.nxtpSdkBase
                  .approveIfNeeded(
                    domainId,
                    x_asset_data?.contract_address,
                    _.head(amounts),
                    infiniteApprove,
                  )

              if (approve_request) {
                setApproving(true)

                const approve_response =
                  await signer
                    .sendTransaction(
                      approve_request,
                    )

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

                const approve_receipt =
                  await signer.provider
                    .waitForTransaction(
                      hash,
                    )

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
              setApproveResponse(
                {
                  status: 'failed',
                  message:
                    error?.data?.message ||
                    error?.message,
                }
              )

              failed = true

              setApproveProcessing(false)
              setApproving(false)
            }

            if (!failed) {
              try {
                const approve_request =
                  await sdk.nxtpSdkBase
                    .approveIfNeeded(
                      domainId,
                      y_asset_data?.contract_address,
                      _.last(amounts),
                      infiniteApprove,
                    )

                if (approve_request) {
                  setApproving(true)

                  const approve_response =
                    await signer
                      .sendTransaction(
                        approve_request,
                      )

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

                  const approve_receipt =
                    await signer.provider
                      .waitForTransaction(
                        hash,
                      )

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
                setApproveResponse(
                  {
                    status: 'failed',
                    message:
                      error?.data?.message ||
                      error?.message,
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

              const tokenIndex =
                await sdk.nxtpSdkPool
                  .getPoolTokenIndex(
                    domainId,
                    contract_address,
                    contract_address,
                  )

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
                amounts =
                  _.reverse(
                    _.cloneDeep(amounts)
                  )
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

              const add_request =
                await sdk.nxtpSdkPool
                  .addLiquidity(
                    domainId,
                    contract_address,
                    amounts,
                    minToMint,
                    deadline,
                  )

              if (add_request) {
                let gasLimit =
                  await signer
                    .estimateGas(
                      add_request,
                    )

                if (gasLimit) {
                  gasLimit =
                    FixedNumber.fromString(
                      gasLimit
                        .toString()
                    )
                    .mulUnsafe(
                      FixedNumber.fromString(
                        GAS_LIMIT_ADJUSTMENT
                          .toString()
                      )
                    )
                    .round(0)
                    .toString()
                    .replace(
                      '.0',
                      '',
                    )

                  add_request.gasLimit = gasLimit
                }

                const add_response =
                  await signer
                    .sendTransaction(
                      add_request,
                    )

                const {
                  hash,
                } = { ...add_response }

                setCallProcessing(true)

                const add_receipt =
                  await signer.provider
                    .waitForTransaction(
                      hash,
                    )

                const {
                  status,
                } = { ...add_receipt }

                failed = !status

                setCallResponse(
                  {
                    status:
                      failed ?
                        'failed' :
                        'success',
                    message:
                      failed ?
                        `Failed to add ${symbol} liquidity` :
                        `Add ${symbol} liquidity successful`,
                    tx_hash: hash,
                  }
                )

                success = true
              }
            } catch (error) {
              const message =
                error?.reason ||
                error?.data?.message ||
                error?.message

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

              const code =
                _.slice(
                  (message || '')
                    .toLowerCase()
                    .split(' ')
                    .filter(s => s),
                  0,
                  2,
                )
                .join('_')

              switch (code) {
                case 'user_rejected':
                  reset(code)
                  break
                default:
                  setCallResponse(
                    {
                      status: 'failed',
                      message,
                      code,
                    }
                  )
                  break
              }

              failed = true
            }
          }
          break
        case 'withdraw':
          if (
            !amount ||
            [
              '0',
              '0.0',
              0,
            ].includes(amount)
          ) {
            failed = true

            setApproving(false)
            break
          }

          const _amount =
            utils.parseUnits(
              (
                amount ||
                0
              )
              .toString(),
              18,
            )
            .toString()

          const minAmounts =
            [
              '0',
              '0',
            ]

          if (!failed) {
            try {
              const approve_request =
                await sdk.nxtpSdkBase
                  .approveIfNeeded(
                    domainId,
                    lpTokenAddress,
                    _amount,
                    infiniteApprove,
                  )

              if (approve_request) {
                setApproving(true)

                const approve_response =
                  await signer
                    .sendTransaction(
                      approve_request,
                    )

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

                const approve_receipt =
                  await signer.provider
                    .waitForTransaction(
                      hash,
                    )

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
              setApproveResponse(
                {
                  status: 'failed',
                  message:
                    error?.data?.message ||
                    error?.message,
                }
              )

              failed = true

              setApproveProcessing(false)
              setApproving(false)
            }
          }

          if (!failed) {
            try {
              console.log(
                '[removeLiquidity]',
                {
                  domainId,
                  contract_address,
                  amount: _amount,
                  minAmounts,
                  deadline,
                },
              )

              const remove_request =
                await sdk.nxtpSdkPool
                  .removeLiquidity(
                    domainId,
                    contract_address,
                    _amount,
                    minAmounts,
                    deadline,
                  )

              if (remove_request) {
                let gasLimit =
                  await signer
                    .estimateGas(
                      remove_request,
                    )

                if (gasLimit) {
                  gasLimit =
                    FixedNumber.fromString(
                      gasLimit
                        .toString()
                    )
                    .mulUnsafe(
                      FixedNumber.fromString(
                        GAS_LIMIT_ADJUSTMENT
                          .toString()
                      )
                    )
                    .round(0)
                    .toString()
                    .replace(
                      '.0',
                      '',
                    )

                  remove_request.gasLimit = gasLimit
                }

                const remove_response =
                  await signer
                    .sendTransaction(
                      remove_request,
                    )

                const {
                  hash,
                } = { ...remove_response }

                setCallProcessing(true)

                const remove_receipt =
                  await signer.provider
                    .waitForTransaction(
                      hash,
                    )

                const {
                  status,
                } = { ...remove_receipt }

                failed = !status

                setCallResponse(
                  {
                    status:
                      failed ?
                        'failed' :
                        'success',
                    message:
                      failed ?
                        `Failed to remove ${symbol} liquidity` :
                        `Remove ${symbol} liquidity successful`,
                    tx_hash: hash,
                  }
                )

                success = true
              }
            } catch (error) {
              let message =
                error?.reason ||
                error?.data?.message ||
                error?.message

              console.log(
                '[removeLiquidity error]',
                {
                  domainId,
                  contract_address,
                  amount: _amount,
                  minAmounts,
                  deadline,
                  error,
                },
              )

              const code =
                _.slice(
                  (message || '')
                    .toLowerCase()
                    .split(' ')
                    .filter(s => s),
                  0,
                  2,
                )
                .join('_')

              if (message?.includes('exceed total supply')) {
                message = 'Exceed Total Supply'
              }

              switch (code) {
                case 'user_rejected':
                  reset(code)
                  break
                default:
                  setCallResponse(
                    {
                      status: 'failed',
                      message,
                      code,
                    }
                  )
                  break
              }

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

    if (
      sdk &&
      address &&
      success
    ) {
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
            setAmount(null)
            break
          default:
            break
        }
      }
    }
  }

  const calculateAddLiquidityPriceImpact = async (
    domainId,
    contract_address,
    amountX,
    amountY,
  ) => {
    let manual

    try {
      setPriceImpactAdd(true)

      if (
        [
          chain_data?.id,
        ].includes(pool_data?.chain_data?.id) &&
        pool_data?.tvl
      ) {
        console.log(
          '[calculateAddLiquidityPriceImpact]',
          {
            domainId,
            contract_address,
            amountX,
            amountY,
          },
        )

        const price_impact =
          await sdk.nxtpSdkPool
            .calculateAddLiquidityPriceImpact(
              domainId,
              contract_address,
              amountX,
              amountY,
            )

        console.log(
          '[addLiquidityPriceImpact]',
          {
            domainId,
            contract_address,
            amountX,
            amountY,
            price_impact,
          },
        )

        setPriceImpactAdd(
          Number(
            utils.formatUnits(
              BigNumber.from(
                price_impact ||
                '0'
              ),
              18,
            )
          ) *
          100
        )
      }
      else {
        manual = true
      }
    } catch (error) {
      const message =
        error?.reason ||
        error?.data?.message ||
        error?.message

      console.log(
        '[calculateAddLiquidityPriceImpact error]',
        {
          domainId,
          contract_address,
          amountX,
          amountY,
          error,
        },
      )
      
      const code =
        _.slice(
          (message || '')
            .toLowerCase()
            .split(' ')
            .filter(s => s),
          0,
          2,
        )
        .join('_')

      if (message?.includes('reverted')) {
        manual = true
      }
      else {
        setPriceImpactAdd(0)
        setPriceImpactAddResponse(
          {
            status: 'failed',
            message,
            code,
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
    contract_address,
    amountX,
    amountY,
  ) => {
    let manual

    try {
      setPriceImpactRemove(true)

      if (
        [
          chain_data?.id,
        ].includes(pool_data?.chain_data?.id) &&
        pool_data?.tvl
      ) {
        console.log(
          '[calculateRemoveLiquidityPriceImpact]',
          {
            domainId,
            contract_address,
            amountX,
            amountY,
          },
        )

        const price_impact =
          await sdk.nxtpSdkPool
            .calculateRemoveLiquidityPriceImpact(
              domainId,
              contract_address,
              amountX,
              amountY,
            )

        console.log(
          '[removeLiquidityPriceImpact]',
          {
            domainId,
            contract_address,
            amountX,
            amountY,
            price_impact,
          },
        )

        setPriceImpactRemove(
          Number(
            utils.formatUnits(
              BigNumber.from(
                price_impact ||
                '0'
              ),
              18,
            )
          ) *
          100
        )
      }
      else {
        manual = true
      }
    } catch (error) {
      const message =
        error?.reason ||
        error?.data?.message ||
        error?.message

      console.log(
        '[calculateRemoveLiquidityPriceImpact error]',
        {
          domainId,
          contract_address,
          amountX,
          amountY,
          error,
        },
      )
      
      const code =
        _.slice(
          (message || '')
            .toLowerCase()
            .split(' ')
            .filter(s => s),
          0,
          2,
        )
        .join('_')

      if (message?.includes('reverted')) {
        manual = true
      }
      else {
        setPriceImpactRemove(0)
        setPriceImpactRemoveResponse(
          {
            status: 'failed',
            message,
            code,
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

  const chain_data = (chains_data || [])
    .find(c =>
      c?.id === chain
    )
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

  const selected =
    !!(
      chain &&
      asset
    )

  const no_pool =
    selected &&
    (pool_assets_data || [])
      .findIndex(a =>
        a?.id === asset &&
        (a.contracts || [])
          .findIndex(a =>
            a?.chain_id === chain_id
          ) > -1
      ) < 0

  const pool_data = (pools_data || [])
    .find(p =>
      p?.chain_data?.id === chain &&
      p.asset_data?.id === asset
    )

  const {
    asset_data,
    contract_data,
    symbol,
    lpTokenAddress,
    adopted,
    local,
    error,
  } = { ...pool_data }
  let {
    rate,
  } = { ...pool_data }
  const {
    contract_address,
    next_asset,
  } = { ...contract_data }

  rate =
    rate ||
    1

  const _image = contract_data?.image

  const image_paths =
    (_image || '')
      .split('/')

  const image_name = _.last(image_paths)

  const x_asset_data =
    adopted?.address &&
    {
      ...(
        Object.fromEntries(
          Object.entries({ ...asset_data })
            .filter(([k, v]) =>
              !['contracts'].includes(k)
            )
        )
      ),
      ...(
        equals_ignore_case(
          adopted.address,
          contract_address,
        ) ?
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
                      image_paths
                        .map((s, i) =>
                          i === image_paths.length - 1 ?
                            `${WRAPPED_PREFIX}${s}` :
                            s
                        )
                        .join('/') :
                      _image :
                    !image_name.startsWith(WRAPPED_PREFIX) ?
                      _image :
                      image_paths
                        .map((s, i) =>
                          i === image_paths.length - 1 ?
                            s
                              .substring(
                                WRAPPED_PREFIX.length,
                              ) :
                            s
                        )
                        .join('/') :
                undefined,
          }
      ),
    }

  const _x_asset_data =
    adopted?.address &&
    {
      ...(
        Object.fromEntries(
          Object.entries({ ...asset_data })
            .filter(([k, v]) =>
              !['contracts'].includes(k)
            )
        )
      ),
      ...contract_data,
    }

  const x_balance =
    x_asset_data &&
    (balances_data?.[chain_id] || [])
      .find(b =>
        equals_ignore_case(
          b?.contract_address,
          x_asset_data.contract_address,
        )
      )
  
  const x_balance_amount = x_balance?.amount

  const y_asset_data =
    local?.address &&
    {
      ...(
        Object.fromEntries(
          Object.entries({ ...asset_data })
            .filter(([k, v]) =>
              !['contracts'].includes(k)
            )
        )
      ),
      ...(
        equals_ignore_case(
          local.address,
          contract_address,
        ) ?
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
                      image_paths
                        .map((s, i) =>
                          i === image_paths.length - 1 ?
                            `${WRAPPED_PREFIX}${s}` :
                            s
                        )
                        .join('/') :
                      _image :
                    !image_name.startsWith(WRAPPED_PREFIX) ?
                      _image :
                      image_paths
                        .map((s, i) =>
                          i === image_paths.length - 1 ?
                            s
                              .substring(
                                WRAPPED_PREFIX.length,
                              ) :
                            s
                        )
                        .join('/') :
                undefined,
            mintable:
              [
                WRAPPED_PREFIX,
              ].findIndex(s =>
                local.symbol?.startsWith(s)
              ) > -1 ||
              [
                'TEST',
              ].findIndex(s =>
                equals_ignore_case(
                  s,
                  local.symbol,
                )
              ) > -1,
            wrapable:
              [
                'WETH',
              ].findIndex(s =>
                equals_ignore_case(
                  s,
                  local.symbol,
                )
              ) > -1,
          }
      ),
    }

  const y_balance =
    y_asset_data &&
    (balances_data?.[chain_id] || [])
      .find(b =>
        equals_ignore_case(
          b?.contract_address,
          y_asset_data.contract_address,
        )
      )
  
  const y_balance_amount = y_balance?.amount

  const pool_loading =
    selected &&
    !no_pool &&
    !error &&
    !pool_data

  const user_pool_data =
    pool_data &&
    (user_pools_data || [])
      .find(p =>
        p?.chain_data?.id === chain &&
        p.asset_data?.id === asset
      )

  const {
    lpTokenBalance,
  } = { ...user_pool_data }

  const x_remove_amount =
    equals_ignore_case(
      adopted?.address,
      contract_address,
    ) ?
      _.head(removeAmounts) :
      _.last(removeAmounts)

  const y_remove_amount =
    equals_ignore_case(
      adopted?.address,
      contract_address,
    ) ?
      _.last(removeAmounts) :
      _.head(removeAmounts)

  const position_loading =
    selected &&
    !no_pool &&
    !error &&
    (
      !user_pools_data ||
      pool_loading
    )

  const pool_tokens_data =
    [
      adopted,
      local,
    ]
    .map((t, i) => {
      const {
        address,
        symbol,
        decimals,
      } = { ...t }

      return {
        i,
        contract_address: address,
        chain_id,
        symbol,
        decimals,
        image:
          (
            equals_ignore_case(
              address,
              contract_address,
            ) ?
              contract_data?.image :
              equals_ignore_case(
                address,
                next_asset?.contract_address,
              ) ?
                next_asset?.image ||
                contract_data?.image :
                null
          ) ||
          asset_data?.image,
      }
    })

  const valid_amount =
    action === 'withdraw' ?
      typeof amount === 'string' &&
      !isNaN(amount) &&
      amount &&
      utils.parseUnits(
        amount ||
        '0',
        18,
      )
      .lte(
        utils.parseUnits(
          (
            lpTokenBalance ||
            0
          )
          .toString(),
          18,
        )
      ) &&
      utils.parseUnits(
        amount ||
        '0',
        18,
      )
      .gt(
        BigNumber.from(
          '0'
        )
      ) :
      typeof amountX === 'string' &&
      !isNaN(amountX) &&
      typeof amountY === 'string' &&
      !isNaN(amountY) &&
      (
        amountX ||
        amountY
      ) &&
      utils.parseUnits(
        amountX ||
        '0',
        x_asset_data?.decimals ||
        18,
      )
      .lte(
        utils.parseUnits(
          (
            x_balance_amount ||
            0
          )
          .toString(),
          x_asset_data?.decimals ||
          18,
        )
      ) &&
      utils.parseUnits(
        amountY ||
        '0',
        y_asset_data?.decimals ||
        18,
      )
      .lte(
        utils.parseUnits(
          (
            y_balance_amount ||
            0
          )
          .toString(),
          y_asset_data?.decimals ||
          18,
        )
      ) &&
      (
        utils.parseUnits(
          amountX ||
          '0',
          x_asset_data?.decimals ||
          18,
        )
        .gt(
          BigNumber.from(
            '0'
          )
        ) ||
        utils.parseUnits(
          amountY ||
          '0',
          y_asset_data?.decimals ||
          18,
        )
        .gt(
          BigNumber.from(
            '0'
          )
        )
      )

  const wrong_chain =
    wallet_chain_id !== chain_id &&
    !callResponse

  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  const disabled =
    !pool_data ||
    error ||
    calling ||
    approving

  const overweighted_asset =
    adopted &&
    local &&
    (
      Number(amountX) +
      Number(
        (
          equals_ignore_case(
            adopted.address,
            x_asset_data?.contract_address,
          ) ?
            adopted :
            local
        ).balance
      )
    ) >
    (
      Number(amountY) +
      Number(
        (
          equals_ignore_case(
            adopted.address,
            y_asset_data?.contract_address,
          ) ?
            adopted :
            local
        ).balance
      )
    ) ?
     'x' :
     'y'

  const advancedOptions = (
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
            <BiCaretUp
              size={18}
            /> :
            <BiCaretDown
              size={18}
            />
          }
        </div>
      </div>
      {
        openOptions &&
        (
          <div className="form">
            <div className="form-element">
              <Tooltip
                placement="right"
                content="This allows you to only need to pay for approval on your first time providing liquidity."
                className="z-50 bg-dark text-white text-xs"
              >
                <div className="flex items-center">
                  <div className="form-label max-w-fit text-slate-600 dark:text-slate-200 text-xs font-medium">
                    Infinite approval
                  </div>
                  <BiInfoCircle
                    size={14}
                    className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                  />
                </div>
              </Tooltip>
              <div className="flex items-center space-x-3">
                <Switch
                  checked={
                    (
                      typeof infiniteApprove === 'boolean' ?
                        infiniteApprove :
                        false
                    ) ||
                    false
                  }
                  onChange={() => {
                    setOptions(
                      {
                        ...options,
                        infiniteApprove: !infiniteApprove,
                      }
                    )
                  }}
                  checkedIcon={false}
                  uncheckedIcon={false}
                  onColor={switch_color(theme).on}
                  onHandleColor="#f8fafc"
                  offColor={switch_color(theme).off}
                  offHandleColor="#f8fafc"
                />
              </div>
            </div>
            <div className="form-element">
              <Tooltip
                placement="right"
                content="The maximum percentage you are willing to lose due to market changes."
                className="z-50 bg-dark text-white text-xs"
              >
                <div className="flex items-center">
                  <div className="form-label max-w-fit text-slate-600 dark:text-slate-200 text-xs font-medium">
                    Slippage tolerance
                  </div>
                  <BiInfoCircle
                    size={14}
                    className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                  />
                </div>
              </Tooltip>
              <div className="flex items-center space-x-3">
                <DebounceInput
                  debounceTimeout={750}
                  size="small"
                  type="number"
                  placeholder="Slippage Tolerance"
                  value={
                    typeof slippage === 'number' &&
                    slippage >= 0 ?
                      slippage :
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

                    if (typeof value === 'string') {
                      if (value.startsWith('.')) {
                        value = `0${value}`
                      }

                      if (!isNaN(value)) {
                        value = Number(value)
                      }
                    }

                    value =
                      value <= 0 ||
                      value > 100 ?
                        DEFAULT_POOL_SLIPPAGE_PERCENTAGE :
                        value

                    const _data = {
                      ...options,
                      slippage:
                        value &&
                        !isNaN(value) ?
                          parseFloat(
                            Number(value)
                              .toFixed(6)
                          ) :
                          value,
                    }

                    setOptions(_data)
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
                  className={`w-20 bg-slate-200 focus:bg-slate-300 dark:bg-slate-800 dark:focus:bg-slate-700 rounded border-0 focus:ring-0 text-xs font-semibold text-right py-1 px-2`}
                />
                <div className="flex items-center space-x-2.5">
                  {
                    [
                      3.0,
                      1.0,
                      0.5,
                    ]
                    .map((p, i) => (
                      <div
                        key={i}
                        onClick={() =>
                          setOptions(
                            {
                              ...options,
                              slippage: p,
                            }
                          )
                        }
                        className={`${slippage === s ? 'bg-slate-200 dark:bg-slate-700 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-medium hover:font-semibold'} rounded cursor-pointer text-xs py-1 px-1.5`}
                      >
                        {p} %
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
            <div className="form-element">
              <div className="form-label text-slate-600 dark:text-slate-200 text-xs font-medium">
                Transaction deadline
              </div>
              <div className="flex items-center space-x-3">
                <DebounceInput
                  debounceTimeout={750}
                  size="small"
                  type="number"
                  placeholder="Transaction Deadline (minutes)"
                  value={
                    typeof options?.deadline === 'number' &&
                    options.deadline >= 0 ?
                      options.deadline :
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

                    if (typeof value === 'string') {
                      if (value.startsWith('.')) {
                        value = `0${value}`
                      }

                      if (!isNaN(value)) {
                        value = Number(value)
                      }
                    }

                    value =
                      value < 0 ?
                        DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES :
                        value

                    const _data = {
                      ...options,
                      deadline:
                        value &&
                        !isNaN(value) ?
                          parseFloat(
                            Number(value)
                              .toFixed(6)
                          ) :
                          value,
                    }

                    setOptions(_data)
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
                  className={`w-20 bg-slate-200 dark:bg-slate-800 rounded border-0 focus:ring-0 text-xs font-semibold py-1.5 px-2.5`}
                />
                <span className="font-medium">
                  minutes
                </span>
              </div>
            </div>
          </div>
        )
      }
    </div>
  )

  return (
    <div className="order-1 lg:order-2 bg-slate-50 dark:bg-slate-900 rounded border dark:border-slate-800 space-y-3 pt-4 pb-5 px-4">
      <div className="flex items-center justify-between space-x-2">
        <span className="text-lg font-semibold">
          Manage Balance
        </span>
        <GasPrice
          chainId={chain_id}
          iconSize={16}
          className="text-xs"
        />
      </div>
      <div className="space-y-4">
        <div className="w-fit border-b dark:border-slate-800 flex items-center justify-between space-x-4">
          {ACTIONS
            .map((a, i) => (
              <div
                key={i}
                onClick={() => setAction(a)}
                className={`w-fit border-b-2 ${action === a ? 'border-slate-300 dark:border-slate-200 font-semibold' : 'border-transparent text-slate-400 dark:text-slate-500 font-semibold'} cursor-pointer capitalize text-sm text-left py-3 px-0`}
              >
                {a}
              </div>
            ))
          }
        </div>
        {action === 'deposit' ?
          <>
            <div className="pt-1 pb-2 px-0">
              <div className="space-y-1">
                <div className="flex items-center justify-between space-x-2">
                  <div className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                    Token 1
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                      Balance:
                    </div>
                    {
                      x_asset_data?.contract_address &&
                      (
                        <button
                          disabled={disabled}
                          onClick={() => {
                            if (
                              [
                                'string',
                                'number',
                              ].includes(typeof x_balance_amount)
                            ) {
                              setAmountX(
                                x_balance_amount
                                  .toString()
                              )

                              if (
                                typeof amountY !== 'string' ||
                                !amountY
                              ) {
                                setAmountY('0')
                              }
                            }
                          }}
                          className="flex items-center space-x-1.5"
                        >
                          <Balance
                            chainId={chain_id}
                            asset={asset}
                            contractAddress={x_asset_data.contract_address}
                            symbol={x_asset_data.symbol}
                            hideSymbol={true}
                            className="text-xs"
                          />
                          <span className={`${disabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400'} text-xs font-medium`}>
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
                                    alt=""
                                    width={20}
                                    height={20}
                                    className="rounded-full"
                                  />
                                )
                              }
                              <span className="text-base font-semibold">
                                {x_asset_data.symbol}
                              </span>
                            </a>
                            {
                              false &&
                              chain &&
                              asset &&
                              (
                                <Link
                                  href={`/swap/${asset.toUpperCase()}-on-${chain}?from=${y_asset_data.symbol}`}
                                >
                                <a
                                  className="text-blue-500 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white"
                                >
                                  <Tooltip
                                    placement="top"
                                    content={`Click here to swap ${y_asset_data.symbol} into ${x_asset_data.symbol}`}
                                    className="z-50 bg-dark text-white text-xs"
                                  >
                                    <div>
                                      <HiSwitchHorizontal
                                        size={14}
                                      />
                                    </div>
                                  </Tooltip>
                                </a>
                                </Link>
                              )
                            }
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
                      value={
                        [
                          'string',
                          'number',
                        ].includes(typeof amountX) &&
                        !isNaN(amountX) ?
                          amountX :
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

                        if (typeof value === 'string') {
                          if (value.startsWith('.')) {
                            value = `0${value}`
                          }

                          value =
                            number_to_fixed(
                              value,
                              x_asset_data?.decimals ||
                              18,
                            )
                        }

                        setAmountX(value)

                        if (
                          typeof amountY !== 'string' ||
                          !amountY
                        ) {
                          setAmountY('0')
                        }
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
                      className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base font-medium text-right`}
                    />
                  </div>
                  {
                    typeof amountX === 'string' &&
                    [
                      'string',
                      'number',
                    ].includes(typeof x_balance_amount) &&
                    utils.parseUnits(
                      amountX ||
                      '0',
                      x_asset_data?.decimals ||
                      18,
                    )
                    .gt(
                      utils.parseUnits(
                        (
                          x_balance_amount ||
                          0
                        )
                        .toString(),
                        x_asset_data?.decimals ||
                        18,
                      )
                    ) &&
                    (
                      <div className="flex items-center justify-end text-red-600 dark:text-yellow-400 space-x-1 sm:mx-0">
                        <BiMessageError
                          size={16}
                          className="min-w-max"
                        />
                        <span className="text-xs font-medium">
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
                  className="text-slate-400 dark:text-slate-500"
                />
              </div>
              <div className="space-y-1 mt-2.5">
                <div className="flex items-center justify-between space-x-2">
                  <div className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                    Token 2
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                      Balance:
                    </div>
                    {
                      y_asset_data?.contract_address &&
                      (
                        <button
                          disabled={disabled}
                          onClick={() => {
                            if (
                              [
                                'string',
                                'number',
                              ].includes(typeof y_balance_amount)
                            ) {
                              setAmountY(
                                y_balance_amount
                                  .toString()
                              )

                              if (
                                typeof amountX !== 'string' ||
                                !amountX
                              ) {
                                setAmountX('0')
                              }
                            }
                          }}
                          className="flex items-center space-x-1.5"
                        >
                          <Balance
                            chainId={chain_id}
                            asset={asset}
                            contractAddress={y_asset_data.contract_address}
                            symbol={y_asset_data.symbol}
                            hideSymbol={true}
                            className="text-xs"
                          />
                          <span className={`${disabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400'} text-xs font-medium`}>
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
                                    alt=""
                                    width={20}
                                    height={20}
                                    className="rounded-full"
                                  />
                                )
                              }
                              <span className="text-base font-semibold">
                                {y_asset_data.symbol}
                              </span>
                            </a>
                            {
                              false &&
                              chain &&
                              asset &&
                              (
                                <Link
                                  href={`/swap/${asset.toUpperCase()}-on-${chain}`}
                                >
                                <a
                                  className="text-blue-500 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white"
                                >
                                  <Tooltip
                                    placement="top"
                                    content={`Click here to swap ${x_asset_data.symbol} into ${y_asset_data.symbol}`}
                                    className="z-50 bg-dark text-white text-xs"
                                  >
                                    <div>
                                      <HiSwitchHorizontal
                                        size={14}
                                      />
                                    </div>
                                  </Tooltip>
                                </a>
                                </Link>
                              )
                            }
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
                      value={
                        [
                          'string',
                          'number',
                        ].includes(typeof amountY) &&
                        !isNaN(amountY) ?
                          amountY :
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

                        if (typeof value === 'string') {
                          if (value.startsWith('.')) {
                            value = `0${value}`
                          }

                          value =
                            number_to_fixed(
                              value,
                              y_asset_data?.decimals ||
                              18,
                            )
                        }

                        setAmountY(value)

                        if (
                          typeof amountX !== 'string' ||
                          !amountX
                        ) {
                          setAmountX('0')
                        }
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
                      className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base font-medium text-right`}
                    />
                  </div>
                  {
                    typeof amountY === 'string' &&
                    [
                      'string',
                      'number',
                    ].includes(typeof y_balance_amount) &&
                    utils.parseUnits(
                      amountY ||
                      '0',
                      y_asset_data?.decimals ||
                      18,
                    )
                    .gt(
                      utils.parseUnits(
                        (
                          y_balance_amount ||
                          0
                        )
                        .toString(),
                        y_asset_data?.decimals ||
                        18,
                      )
                    ) &&
                    (
                      <div className="flex items-center justify-end text-red-600 dark:text-yellow-400 space-x-1 sm:mx-0">
                        <BiMessageError
                          size={16}
                          className="min-w-max"
                        />
                        <span className="text-xs font-medium">
                          Not enough {y_asset_data?.symbol}
                        </span>
                      </div>
                    )
                  }
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between space-x-1">
                <Tooltip
                  placement="top"
                  content="The adjusted amount you are paying for LP tokens above or below current market prices."
                  className="w-80 z-50 bg-dark text-white text-xs"
                >
                  <div className="flex items-center">
                    <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs font-medium">
                      Price impact
                    </div>
                    <BiInfoCircle
                      size={14}
                      className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                    />
                  </div>
                </Tooltip>
                <div className="flex items-center text-xs font-semibold space-x-1">
                  {
                    priceImpactAdd === true &&
                    !priceImpactAddResponse ?
                      <Oval
                        color={loader_color(theme)}
                        width="16"
                        height="16"
                      /> :
                      <span className={`${typeof priceImpactAdd === 'number' && priceImpactAdd > 0 ? 'text-red-500 dark:text-red-500' : ''}`}>
                        <span className="whitespace-nowrap">
                          {
                            typeof priceImpactAdd === 'number' ||
                            priceImpactAddResponse ?
                              number_format(
                                priceImpactAdd,
                                '0,0.000000',
                                true,
                              ) :
                              '-'
                          }
                        </span>
                        <span>
                          %
                        </span>
                      </span>
                  }
                </div>
              </div>
              {
                false &&
                typeof priceImpactAdd === 'number' &&
                priceImpactAdd < 0 &&
                (
                  <div className="bg-yellow-50 dark:bg-yellow-200 bg-opacity-50 dark:bg-opacity-10 rounded flex items-start space-x-2 p-2">
                    <IoWarning
                      size={18}
                      className="min-w-max text-yellow-500 dark:text-yellow-400 mt-0.5"
                    />
                    <div className="flex flex-col space-y-1.5">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-bold">
                          Price impact is negative
                        </span>
                        <span className="leading-4 text-xs">
                          The pool is currently overweighted in {
                            (overweighted_asset === 'x' ?
                              x_asset_data :
                              y_asset_data
                            )?.symbol
                          }. Providing more {
                            (overweighted_asset === 'x' ?
                              y_asset_data :
                              x_asset_data
                            )?.symbol
                          } will grant bonus LP tokens.
                        </span>
                      </div>
                      {
                        pool_tokens_data
                          .filter(d =>
                            d.symbol?.includes(WRAPPED_PREFIX)
                          )
                          .length > 0 &&
                        (
                          <div className="flex flex-col space-y-0">
                            <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                              Convert to {
                                (overweighted_asset === 'x' ?
                                  y_asset_data :
                                  x_asset_data
                                )?.symbol
                              }
                            </span>
                            <div className="flex items-center space-x-1">
                              <a
                                href={`/${asset.toUpperCase()}-from-${_.head(chains_data)?.id}-to-${chain}?receive_next=true&source=pool`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <span className="leading-3 text-xs font-medium">
                                  Using Bridge
                                </span>
                              </a>
                              <span className="leading-3 text-base text-slate-400 dark:text-slate-500 mt-0.5">
                                |
                              </span>
                              <a
                                href={`/swap/${asset.toUpperCase()}-on-${chain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <span className="leading-3 text-xs font-medium">
                                  Using AMM
                                </span>
                              </a>
                            </div>
                          </div>
                        )
                      }
                    </div>
                  </div>
                )
              }
              {
                typeof priceImpactAdd === 'number' &&
                priceImpactAdd > 0 &&
                (
                  <div className="bg-yellow-50 dark:bg-yellow-200 bg-opacity-50 dark:bg-opacity-10 rounded flex items-start space-x-2 pt-2 pb-3 px-2">
                    <IoWarning
                      size={18}
                      className="min-w-max text-yellow-500 dark:text-yellow-400 mt-1"
                    />
                    <div className="flex flex-col space-y-3">
                      <div className="flex flex-col space-y-2.5">
                        <span className="text-base font-bold">
                          Heads Up!
                        </span>
                        <span className="leading-4 text-xs font-bold">
                          {
                            (overweighted_asset === 'x' ?
                              x_asset_data :
                              y_asset_data
                            )?.symbol
                          } is currently overweighted in this pool.
                        </span>
                        <div className="flex flex-col items-center space-y-1">
                          <span className="leading-4 text-xs text-center">
                            <span className="mr-1">
                              Providing additional
                            </span>
                            <span className="font-semibold mr-1">
                              {
                                (overweighted_asset === 'x' ?
                                  y_asset_data :
                                  x_asset_data
                                )?.symbol
                              }
                            </span>
                            <span className="mr-1">
                              to help balance the pool may result in
                            </span>
                            <span className="font-bold">
                              bonus LP tokens.
                            </span>
                          </span>
                        </div>
                      </div>
                      {
                        pool_tokens_data
                          .filter(d =>
                            d.symbol?.includes(WRAPPED_PREFIX)
                          )
                          .length > 0 &&
                        (overweighted_asset === 'x' ?
                          y_asset_data :
                          x_asset_data
                        )?.symbol?.includes(WRAPPED_PREFIX) &&
                        (
                          <div className="flex flex-col space-y-0 mx-auto">
                            <div className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 rounded flex items-center space-x-1 pt-0.5 pb-1 px-2">
                              <a
                                href={
                                  `/${asset.toUpperCase()}-from-${_.head(chains_data)?.id}-to-${chain}?${
                                    (overweighted_asset === 'x' ?
                                      y_asset_data :
                                      x_asset_data
                                    )?.symbol?.includes(WRAPPED_PREFIX) ?
                                      'receive_next=true&' :
                                      ''
                                  }source=pool`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <span className="leading-3 text-white text-xs font-medium">
                                  GET {
                                    (overweighted_asset === 'x' ?
                                      y_asset_data :
                                      x_asset_data
                                    )?.symbol
                                  }
                                </span>
                              </a>
                            </div>
                          </div>
                        )
                      }
                    </div>
                  </div>
                )
              }
            </div>
            {/*advancedOptions*/}
            <div className="flex items-end">
              {
                chain &&
                web3_provider &&
                wrong_chain ?
                  <Wallet
                    connectChainId={chain_id}
                    className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base font-medium space-x-1.5 sm:space-x-2 py-3 px-2 sm:px-3"
                  >
                    <span className="mr-1.5 sm:mr-2">
                      {is_walletconnect ?
                        'Reconnect' :
                        'Switch'
                      } to
                    </span>
                    {
                      image &&
                      (
                        <Image
                          src={image}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      )
                    }
                    <span className="font-semibold">
                      {name}
                    </span>
                  </Wallet> :
                  callResponse ||
                  approveResponse ||
                  priceImpactAddResponse ||
                  priceImpactRemoveResponse ?
                    [
                      callResponse ||
                      approveResponse ||
                      priceImpactAddResponse ||
                      priceImpactRemoveResponse,
                    ]
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
                            <span className={`leading-5 ${status === 'failed' ? 'break-words text-xs' : 'break-words'} text-sm font-medium`}>
                              {ellipse(
                                (message || '')
                                  .substring(
                                    0,
                                    status === 'failed' &&
                                    error_patterns
                                      .findIndex(c =>
                                        message?.indexOf(c) > -1
                                      ) > -1 ?
                                      message.indexOf(
                                        error_patterns
                                          .find(c =>
                                            message.indexOf(c) > -1
                                          )
                                      ) :
                                      undefined,
                                  )
                                  .trim() ||
                                message,
                                128,
                              )}
                            </span>
                            <div className="flex items-center space-x-1">
                              {
                                url &&
                                tx_hash &&
                                (
                                  <a
                                    href={`${url}${transaction_path?.replace('{tx}', r.tx_hash)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <TiArrowRight
                                      size={20}
                                      className="transform -rotate-45"
                                    />
                                  </a>
                                )}
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
                    web3_provider ?
                      <button
                        disabled={
                          disabled ||
                          !valid_amount
                        }
                        onClick={() => call(pool_data)}
                        className={`w-full ${disabled || !valid_amount ? calling || approving ? 'bg-blue-400 dark:bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded text-base text-center py-3 px-2 sm:px-3`}
                      >
                        <span className="flex items-center justify-center space-x-1.5">
                          {
                            (
                              calling ||
                              approving
                            ) &&
                            (
                              <TailSpin
                                color="white"
                                width="20"
                                height="20"
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
                        className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base font-medium text-center py-3 px-2 sm:px-3"
                      >
                        <span>
                          Connect Wallet
                        </span>
                      </Wallet>
              }
            </div>
          </> :
          <>
            <div className="space-y-3 py-3 px-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-2">
                  {
                    lpTokenAddress &&
                    url ?
                      <a
                        href={`${url}${contract_path?.replace('{address}', lpTokenAddress)}${address ? `?a=${address}` : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 dark:text-slate-500 text-xs font-medium"
                      >
                        Pool Tokens
                      </a> :
                      <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                        Pool Tokens
                      </span>
                  }
                  <div className="flex items-center space-x-1">
                    <div className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                      Balance:
                    </div>
                    {
                      web3_provider &&
                      (
                        <div className="flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs space-x-1">
                          {
                            [
                              'string',
                              'number',
                            ].includes(typeof lpTokenBalance) ?
                              <span className="font-semibold">
                                {number_format(
                                  Number(lpTokenBalance),
                                  Number(lpTokenBalance) > 1000000 ?
                                    '0,0' :
                                    Number(lpTokenBalance) > 10000 ?
                                      '0,0.00' :
                                      '0,0.000000000000000000',
                                  true,
                                )}
                              </span> :
                              typeof lpTokenBalance === 'string' ?
                                <span>
                                  n/a
                                </span> :
                                <RotatingSquare
                                  color={loader_color(theme)}
                                  width="16"
                                  height="16"
                                />
                          }
                        </div>
                      )
                    }
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="rounded border dark:border-slate-800 flex items-center justify-between space-x-2 py-2.5 px-3">
                    <DebounceInput
                      debounceTimeout={750}
                      size="small"
                      type="number"
                      placeholder="0.00"
                      disabled={disabled}
                      value={
                        [
                          'string',
                          'number',
                        ].includes(typeof amount) &&
                        !isNaN(amount) ?
                          amount :
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

                        if (typeof value === 'string') {
                          if (value.startsWith('.')) {
                            value = `0${value}`
                          }

                          value =
                            number_to_fixed(
                              value,
                              18,
                            )
                        }

                        setAmount(value)
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
                      className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base font-medium text-right`}
                    />
                  </div>
                  {
                    typeof amount === 'string' &&
                    [
                      'string',
                      'number',
                    ].includes(typeof lpTokenBalance) &&
                    utils.parseUnits(
                      amount ||
                      '0',
                      18,
                    )
                    .gt(
                      utils.parseUnits(
                        (
                          lpTokenBalance ||
                          0
                        )
                        .toString(),
                        18,
                      )
                    ) &&
                    (
                      <div className="flex items-center justify-end text-red-600 dark:text-yellow-400 space-x-1 sm:mx-0">
                        <BiMessageError
                          size={16}
                          className="min-w-max"
                        />
                        <span className="text-xs font-medium">
                          Not enough {symbol}
                        </span>
                      </div>
                    )
                  }
                </div>
                {
                  [
                    'string',
                    'number',
                  ].includes(typeof lpTokenBalance) &&
                  utils.parseUnits(
                    (
                      lpTokenBalance ||
                      0
                    )
                    .toString(),
                    18,
                  )
                  .gt(
                    BigNumber.from(
                      '0'
                    )
                  ) &&
                  (
                    <div className="flex items-center justify-end space-x-2.5">
                      {
                        [
                          0.25,
                          0.5,
                          0.75,
                          1.0,
                        ]
                        .map((p, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              let _amount

                              try {
                                _amount =
                                  p === 1 ?
                                    (
                                      lpTokenBalance ||
                                      0
                                    )
                                    .toString() :
                                    FixedNumber.fromString(
                                      (
                                        lpTokenBalance ||
                                        0
                                      )
                                      .toString()
                                    )
                                    .mulUnsafe(
                                      FixedNumber.fromString(
                                        p
                                          .toString()
                                      )
                                    )
                                    .toString()
                              } catch (error) {
                                _amount = '0'
                              }

                              setAmount(_amount)
                            }}
                            className={
                              `${
                                disabled ||
                                ![
                                  'string',
                                  'number',
                                ].includes(typeof lpTokenBalance) ?
                                  'bg-slate-200 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-blue-400 dark:text-slate-200 font-semibold' :
                                  FixedNumber.fromString(
                                    (
                                      lpTokenBalance ||
                                      0
                                    )
                                    .toString()
                                  )
                                  .mulUnsafe(
                                    FixedNumber.fromString(
                                      p
                                        .toString()
                                    )
                                  )
                                  .toString() ===
                                  amount ?
                                    'bg-slate-300 dark:bg-slate-700 cursor-pointer text-blue-600 dark:text-white font-semibold' :
                                    'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-800 cursor-pointer text-blue-400 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white font-medium'
                              } rounded text-xs py-0.5 px-1.5`
                            }
                          >
                            {p * 100} %
                          </div>
                        ))
                      }
                    </div>
                  )
                }
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-2">
                  {
                    url &&
                    x_asset_data?.contract_address ?
                      <a
                        href={`${url}${contract_path?.replace('{address}', x_asset_data.contract_address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="text-xs font-semibold">
                          {x_asset_data.symbol}
                        </span>
                      </a> :
                      <div className="text-xs font-semibold">
                        {x_asset_data?.symbol}
                      </div>
                  }
                  {web3_provider ?
                    [
                      'string',
                      'number',
                    ].includes(typeof x_remove_amount) &&
                    !isNaN(x_remove_amount) ?
                      <span className="text-xs">
                        {number_format(
                          x_remove_amount ||
                          0,
                          '0,0.000000',
                          true,
                        )}
                      </span> :
                      selected &&
                      !no_pool &&
                      !error &&
                      (
                        position_loading ?
                          <TailSpin
                            color={loader_color(theme)}
                            width="24"
                            height="24"
                          /> :
                          '-'
                      ) :
                    <span className="text-xs">
                      -
                    </span>
                  }
                </div>
                <div className="flex items-center justify-between space-x-2">
                  {
                    url &&
                    y_asset_data?.contract_address ?
                      <a
                        href={`${url}${contract_path?.replace('{address}', y_asset_data.contract_address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="text-xs font-semibold">
                          {y_asset_data.symbol}
                        </span>
                      </a> :
                      <div className="text-xs font-semibold">
                        {y_asset_data?.symbol}
                      </div>
                  }
                  {web3_provider ?
                    [
                      'string',
                      'number',
                    ].includes(typeof y_remove_amount) &&
                    !isNaN(y_remove_amount) ?
                      <span className="text-xs">
                        {number_format(
                          y_remove_amount ||
                          0,
                          '0,0.000000',
                          true,
                        )}
                      </span> :
                      selected &&
                      !no_pool &&
                      !error &&
                      (
                        position_loading ?
                          <TailSpin
                            color={loader_color(theme)}
                            width="24"
                            height="24"
                          /> :
                          '-'
                      ) :
                    <span className="text-xs">
                      -
                    </span>
                  }
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between space-x-1">
              <Tooltip
                placement="top"
                content="The adjusted amount you are paying for LP tokens above or below current market price."
                className="w-80 z-50 bg-dark text-white text-xs"
              >
                <div className="flex items-center">
                  <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs font-medium">
                    Price impact
                  </div>
                  <BiInfoCircle
                    size={14}
                    className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                  />
                </div>
              </Tooltip>
              <div className="flex items-center text-xs font-semibold space-x-1">
                {
                  priceImpactRemove === true &&
                  !priceImpactRemoveResponse ?
                    <Oval
                      color={loader_color(theme)}
                      width="16"
                      height="16"
                    /> :
                    <span className={`${typeof priceImpactRemove === 'number' && priceImpactRemove > 0 ? 'text-red-500 dark:text-red-500' : ''}`}>
                      <span className="whitespace-nowrap">
                        {
                          typeof priceImpactRemove === 'number' ||
                          priceImpactRemoveResponse ?
                            number_format(
                              priceImpactRemove,
                              '0,0.000000',
                              true,
                            ) :
                            '-'
                        }
                      </span>
                      <span>
                        %
                      </span>
                    </span>
                }
              </div>
            </div>
            {/*advancedOptions*/}
            <div className="flex items-end">
              {
                web3_provider &&
                wrong_chain ?
                  <Wallet
                    connectChainId={chain_id}
                    className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base font-medium space-x-1.5 sm:space-x-2 py-3  px-2 sm:px-3"
                  >
                    <span className="mr-1.5 sm:mr-2">
                      {is_walletconnect ?
                        'Reconnect' :
                        'Switch'
                      } to
                    </span>
                    {
                      image &&
                      (
                        <Image
                          src={image}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      )
                    }
                    <span className="font-semibold">
                      {name}
                    </span>
                  </Wallet> :
                  callResponse ||
                  approveResponse ||
                  priceImpactAdd ||
                  priceImpactRemoveResponse ?
                    [
                      callResponse ||
                      approveResponse ||
                      priceImpactAdd ||
                      priceImpactRemoveResponse,
                    ]
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
                            <span className={`leading-5 ${status === 'failed' ? 'break-words text-xs' : 'break-words'} text-sm font-medium`}>
                              {ellipse(
                                (message || '')
                                  .substring(
                                    0,
                                    status === 'failed' &&
                                    error_patterns.findIndex(c =>
                                      message?.indexOf(c) > -1
                                    ) > -1 ?
                                      message.indexOf(
                                        error_patterns.find(c =>
                                          message.indexOf(c) > -1
                                        )
                                      ) :
                                      undefined,
                                  )
                                  .trim() ||
                                message,
                                128,
                              )}
                            </span>
                            <div className="flex items-center space-x-1">
                              {
                                url &&
                                r.tx_hash &&
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
                    web3_provider ?
                      <button
                        disabled={
                          disabled ||
                          !valid_amount
                        }
                        onClick={() => call(pool_data)}
                        className={`w-full ${disabled || !valid_amount ? calling || approving ? 'bg-red-400 dark:bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 cursor-pointer text-white'} rounded text-base text-center py-3 px-2 sm:px-3`}
                      >
                        <span className="flex items-center justify-center space-x-1.5">
                          {
                            (
                              calling ||
                              approving
                            ) &&
                            (
                              <TailSpin
                                color="white"
                                width="20"
                                height="20"
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
                        className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base font-medium text-center py-3 px-2 sm:px-3"
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
          (
            _x_asset_data?.mintable ||
            _x_asset_data?.wrapable ||
            _x_asset_data?.wrapped
          ) &&
          (
            <Faucet
              token_id={asset}
              contract_data={_x_asset_data}
              className="w-full max-w-lg bg-transparent flex flex-col items-center justify-center space-y-2 mx-auto"
              titleClassName={
                wrong_chain ?
                  'text-slate-400 dark:text-slate-600' :
                  ''
              }
            />
          )
        }
      </div>
    </div>
  )
}
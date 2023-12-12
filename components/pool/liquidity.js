import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Tooltip, Alert as AlertNotification } from '@material-tailwind/react'
import { DebounceInput } from 'react-debounce-input'
import _ from 'lodash'
import moment from 'moment'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { BiPlus, BiMessageError, BiInfoCircle } from 'react-icons/bi'
import { BsArrowRight } from 'react-icons/bs'

import Spinner from '../spinner'
import NumberDisplay from '../number'
import Alert from '../alert'
import Balance from '../balance'
import Faucet from '../faucet'
import GasPrice from '../gas-price'
import Copy from '../copy'
import Image from '../image'
import Wallet from '../wallet'
import { WRAPPED_PREFIX, GAS_LIMIT_ADJUSTMENT, DEFAULT_PERCENT_POOL_SLIPPAGE, DEFAULT_MINUTES_POOL_TRANSACTION_DEADLINE } from '../../lib/config'
import { getChainData, getAssetData, getBalanceData } from '../../lib/object'
import { toBigNumber, toFixedNumber, formatUnits, parseUnits, isNumber, isZero } from '../../lib/number'
import { split, toArray, removeDecimal, numberToFixed, ellipse, equalsIgnoreCase, sleep, normalizeMessage, parseError } from '../../lib/utils'

const ACTIONS = ['deposit', 'withdraw']
const WITHDRAW_OPTIONS = [
  { title: 'Balanced amounts', value: 'balanced_amounts' },
  { title: '{x} only', value: 'x_only' },
  { title: '{y} only', value: 'y_only' },
  { title: 'Custom amounts', value: 'custom_amounts' },
]
const DEFAULT_OPTIONS = {
  infiniteApprove: true,
  slippage: DEFAULT_PERCENT_POOL_SLIPPAGE,
  deadline: DEFAULT_MINUTES_POOL_TRANSACTION_DEADLINE,
}

export default ({ pool, userPools, onFinish }) => {
  const { chains, pool_assets, pools, dev, wallet, balances } = useSelector(state => ({ chains: state.chains, pool_assets: state.pool_assets, pools: state.pools, dev: state.dev, wallet: state.wallet, balances: state.balances }), shallowEqual)
  const { chains_data } = { ...chains }
  const { pool_assets_data } = { ...pool_assets }
  const { pools_data } = { ...pools }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { provider, signer, address } = { ...wallet_data }
  const wallet_chain_id = wallet_data?.chain_id
  const { balances_data } = { ...balances }

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

  const [responses, setResponses] = useState([])

  useEffect(
    () => {
      reset(action)
    },
    [action, pool],
  )

  useEffect(
    () => {
      const getData = async () => {
        setPriceImpactAdd(null)
        setPriceImpactAddResponse(null)
        setApproveResponse(null)

        const { chain, asset } = { ...pool }
        const chain_data = getChainData(chain, chains_data)
        const pool_data = toArray(pools_data).find(d => d.chain_data?.id === chain && d.asset_data?.id === asset)
        const { contract_data, domainId, adopted, local } = { ...pool_data }
        const { contract_address } = { ...contract_data }

        if (domainId && contract_address && isNumber(amountX) && isNumber(amountY)) {
          setCallResponse(null)
          let _amountX
          let _amountY
          try {
            _amountX = parseUnits(amountX, adopted?.decimals)
            _amountY = parseUnits(amountY, local?.decimals)
            if (adopted?.index === 1) {
              const _amount = _amountX
              _amountX = _amountY
              _amountY = _amount
            }
            calculateAddLiquidityPriceImpact(domainId, contract_address, _amountX, _amountY)
          } catch (error) {
            const response = parseError(error)
            console.log('[/pool]', '[calculateAddLiquidityPriceImpact error]', { domainId, contract_address, _amountX, _amountY }, error)
            setPriceImpactAdd(0)
            setPriceImpactAddResponse({ status: 'failed', ...response })
          }
        }
      }
      getData()
    },
    [amountX, amountY],
  )

  useEffect(
    () => {
      calculateRemoveSwapLiquidity()
    },
    [amount],
  )

  useEffect(
    () => {
      switch (withdrawOption) {
        case 'balanced_amounts':
        case 'x_only':
        case 'y_only':
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
          const { chain, asset } = { ...pool }
          const chain_data = getChainData(chain, chains_data)
          const pool_data = toArray(pools_data).find(d => d.chain_data?.id === chain && d.asset_data?.id === asset)
          const { contract_data, domainId, local } = { ...pool_data }
          const { contract_address } = { ...contract_data }

          let amounts = _.cloneDeep(removeAmounts).map((a, i) => {
            const decimals = (i === 0 ? adopted : local)?.decimals || 18
            return parseUnits(a, decimals)
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

    if (onFinish && !ACTIONS.includes(origin)) {
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
      const { chain_data, asset_data, contract_data, domainId, symbol, lpTokenAddress, adopted, local } = { ...pool_data }
      const { contract_address } = { ...contract_data }

      const x_asset_data = adopted?.address && {
        ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
        ...(equalsIgnoreCase(adopted.address, contract_address) ?
          contract_data :
          {
            chain_id,
            contract_address: adopted.address,
            decimals: adopted.decimals,
            symbol: adopted.symbol,
          }
        ),
      }
      const y_asset_data = local?.address && {
        ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
        ...(equalsIgnoreCase(local.address, contract_address) ?
          contract_data :
          {
            chain_id,
            contract_address: local.address,
            decimals: local.decimals,
            symbol: local.symbol,
          }
        ),
      }

      const { infiniteApprove, slippage } = { ...options }
      let { deadline } = { ...options }
      deadline = deadline && moment().add(deadline, 'minutes').valueOf()

      switch (action) {
        case 'deposit':
          try {
            if (!(isNumber(amountX) && isNumber(amountY)) || !(!isZero(amountX) || !isZero(amountY))) {
              failed = true
              setApproving(false)
              break
            }

            const _amountX = amountX
            const _amountY = amountY
            const x_decimals = x_asset_data?.decimals || 18
            const y_decimals = y_asset_data?.decimals || 18

            let amounts = [parseUnits(_amountX, x_decimals), parseUnits(_amountY, y_decimals)]
            const minToMint = '0'
            if (!failed) {
              try {
                const request = await sdk.sdkBase.approveIfNeeded(domainId, x_asset_data?.contract_address, _.head(amounts), infiniteApprove)
                if (request) {
                  setApproving(true)
                  const response = await signer.sendTransaction(request)
                  const { hash } = { ...response }
                  setApproveResponse({
                    status: 'pending',
                    message: `Waiting for ${x_asset_data?.symbol} approval`,
                    tx_hash: hash,
                  })

                  setApproveProcessing(true)
                  const receipt = await signer.provider.waitForTransaction(hash)
                  const { status } = { ...receipt }
                  failed = !status
                  setApproveResponse(!failed ? null : { status: 'failed', message: `Failed to approve ${x_asset_data?.symbol}`, tx_hash: hash })

                  if (!failed) {
                    setResponses(_.uniqBy(_.concat(responses, { message: `Approve ${x_asset_data?.symbol} successful`, tx_hash: hash }), 'tx_hash'))
                  }
                  setApproveProcessing(false)
                }
                setApproving(false)
              } catch (error) {
                const response = parseError(error)
                setApproveResponse({ status: 'failed', ...response })
                setApproveProcessing(false)
                setApproving(false)
                failed = true
              }

              if (!failed) {
                try {
                  const request = await sdk.sdkBase.approveIfNeeded(domainId, y_asset_data?.contract_address, _.last(amounts), infiniteApprove)
                  if (request) {
                    setApproving(true)
                    const response = await signer.sendTransaction(request)
                    const { hash } = { ...response }
                    setApproveResponse({
                      status: 'pending',
                      message: `Waiting for ${y_asset_data?.symbol} approval`,
                      tx_hash: hash,
                    })

                    setApproveProcessing(true)
                    const receipt = await signer.provider.waitForTransaction(hash)
                    const { status } = { ...receipt }
                    failed = !status
                    setApproveResponse(!failed ? null : { status: 'failed', message: `Failed to approve ${y_asset_data?.symbol}`, tx_hash: hash })

                    if (!failed) {
                      setResponses(_.uniqBy(_.concat(responses, { message: `Approve ${y_asset_data?.symbol} successful`, tx_hash: hash }), 'tx_hash'))
                    }
                    setApproveProcessing(false)
                  }
                  setApproving(false)
                } catch (error) {
                  const response = parseError(error)
                  setApproveResponse({ status: 'failed', ...response })
                  setApproveProcessing(false)
                  setApproving(false)
                  failed = true
                }
              }
            }

            if (!failed) {
              try {
                console.log('[/pool]', '[getPoolTokenIndex]', { domainId, contract_address, tokenAddress: contract_address })
                const tokenIndex = await sdk.sdkPool.getPoolTokenIndex(domainId, contract_address, contract_address)
                console.log('[/pool]', '[poolTokenIndex]', { domainId, contract_address, tokenAddress: contract_address, tokenIndex })
                if (tokenIndex === 1) {
                  amounts = _.reverse(_.cloneDeep(amounts))
                }

                console.log('[/pool]', '[addLiquidity]', { domainId, contract_address, amounts, minToMint, deadline })
                const request = await sdk.sdkPool.addLiquidity(domainId, contract_address, amounts, minToMint, deadline)
                if (request) {
                  try {
                    const gasLimit = await signer.estimateGas(request)
                    if (gasLimit) {
                      request.gasLimit = toBigNumber(toFixedNumber(gasLimit).mulUnsafe(toFixedNumber(GAS_LIMIT_ADJUSTMENT)))
                    }
                  } catch (error) {}
                  const response = await signer.sendTransaction(request)
                  const { hash } = { ...response }

                  setCallProcessing(true)
                  success = hash
                  const receipt = await signer.provider.waitForTransaction(hash)
                  const { status } = { ...receipt }
                  failed = !status
                  const _response = {
                    status: failed ? 'failed' : 'success',
                    message: failed ? `Failed to add ${symbol}` : `Add ${symbol} successful`,
                    tx_hash: hash,
                  }
                  setCallResponse(_response)

                  if (!failed) {
                    setResponses(_.uniqBy(_.concat(responses, _response), 'tx_hash'))
                  }
                  success = true
                }
              } catch (error) {
                const response = parseError(error)
                console.log('[/pool]', '[addLiquidity error]', { domainId, contract_address, amounts, minToMint, deadline }, error)
                const { code } = { ...response }
                let { message } = { ...response }
                if (message?.includes('eth_sendRawTransaction')) {
                  message = 'Failed to send transaction'
                }
                switch (code) {
                  case 'user_rejected':
                    reset(code)
                    break
                  default:
                    if (success) {
                      setCallResponse({ status: 'success', message: `Add ${symbol} successful`, tx_hash: typeof success === 'string' ? success : undefined })
                    }
                    else {
                      setCallResponse({ status: 'failed', ...response, message })
                    }
                    break
                }
                failed = !success
              }
            }
          } catch (error) {}
          break
        case 'withdraw':
          try {
            if (isZero(amount)) {
              failed = true
              setApproving(false)
              break
            }

            const isOneToken = withdrawOption?.endsWith('_only')
            let _amount
            if (isNumber(amount) && typeof amount === 'string' && _.last(split(amount, 'normal', '.')).length >= 18 - 2) {
              _amount = amount.substring(0, amount.length - 1 - 2)
            }
            else {
              _amount = amount
            }
            _amount = parseUnits(_amount)

            let _amounts = removeAmounts?.length > 1 && removeAmounts.map((a, i) => {
              const decimals = (i === 0 ? adopted : local)?.decimals || 18
              return parseUnits(a * (1 - slippage / 100), decimals)
            })
            if (adopted?.index === 1) {
              _amounts = _.reverse(_amounts)
            }

            const withdrawContractAddress = isOneToken ? (withdrawOption === 'x_only' ? x_asset_data : y_asset_data)?.contract_address : undefined
            const minAmounts = withdrawOption !== 'custom_amounts' ? _amounts || ['0', '0'] : undefined
            const minAmount = isOneToken ? _.head(toArray(minAmounts).filter(a => a !== '0')) : undefined
            const amounts = withdrawOption === 'custom_amounts' ? _amounts || ['0', '0'] : undefined
            const maxBurnAmount = withdrawOption === 'custom_amounts' ? '0' : undefined
            if (!failed) {
              try {
                const request = await sdk.sdkBase.approveIfNeeded(domainId, lpTokenAddress, _amount, infiniteApprove)
                if (request) {
                  setApproving(true)
                  const response = await signer.sendTransaction(request)
                  const { hash } = { ...response }
                  setApproveResponse({
                    status: 'pending',
                    message: `Waiting for ${symbol} approval`,
                    tx_hash: hash,
                  })

                  setApproveProcessing(true)
                  const receipt = await signer.provider.waitForTransaction(hash)
                  const { status } = { ...receipt }
                  failed = !status
                  setApproveResponse(!failed ? null : { status: 'failed', message: `Failed to approve ${symbol}`, tx_hash: hash })

                  if (!failed) {
                    setResponses(_.uniqBy(_.concat(responses, { message: `Approve ${symbol} successful`, tx_hash: hash }), 'tx_hash'))
                  }
                  setApproveProcessing(false)
                }
                setApproving(false)
              } catch (error) {
                const response = parseError(error)
                setApproveResponse({ status: 'failed', ...response })
                setApproveProcessing(false)
                setApproving(false)
                failed = true
              }
            }

            if (!failed) {
              const method = isOneToken ? 'removeLiquidityOneToken' : withdrawOption === 'custom_amounts' ? 'removeLiquidityImbalance' : 'removeLiquidity'
              try {
                console.log('[/pool]', `[${method}]`, { domainId, contract_address, withdrawContractAddress, amount: _amount, minAmounts, minAmount, amounts, maxBurnAmount, deadline })
                const request = isOneToken ?
                  await sdk.sdkPool.removeLiquidityOneToken(domainId, contract_address, withdrawContractAddress, _amount, minAmount, deadline) :
                  withdrawOption === 'custom_amounts' ?
                    await sdk.sdkPool.removeLiquidityImbalance(domainId, contract_address, amounts, maxBurnAmount, deadline) :
                    await sdk.sdkPool.removeLiquidity(domainId, contract_address, _amount, minAmounts, deadline)
                if (request) {
                  try {
                    const gasLimit = await signer.estimateGas(request)
                    if (gasLimit) {
                      request.gasLimit = toBigNumber(toFixedNumber(gasLimit).mulUnsafe(toFixedNumber(GAS_LIMIT_ADJUSTMENT)))
                    }
                  } catch (error) {}
                  const response = await signer.sendTransaction(request)
                  const { hash } = { ...response }

                  setCallProcessing(true)
                  success = hash
                  const receipt = await signer.provider.waitForTransaction(hash)
                  const { status } = { ...receipt }
                  failed = !status
                  const _response = {
                    status: failed ? 'failed' : 'success',
                    message: failed ? `Failed to remove ${symbol}` : `Remove ${symbol} successful`,
                    tx_hash: hash,
                  }
                  setCallResponse(_response)

                  if (!failed) {
                    setResponses(_.uniqBy(_.concat(responses, _response), 'tx_hash'))
                  }
                  success = true
                }
              } catch (error) {
                const response = parseError(error)
                console.log('[/pool]', `[${method} error]`, { domainId, contract_address, withdrawContractAddress, amount: _amount, minAmounts, minAmount, amounts, maxBurnAmount, deadline }, error)
                const { code } = { ...response }
                let { message } = { ...response }
                if (message?.includes('exceed total supply')) {
                  message = 'Exceed Total Supply'
                }
                else if (message?.includes('eth_sendRawTransaction')) {
                  message = 'Failed to send transaction'
                }
                switch (code) {
                  case 'user_rejected':
                    reset(code)
                    break
                  default:
                    if (success) {
                      setCallResponse({ status: 'success', message: `Remove ${symbol} successful`, tx_hash: typeof success === 'string' ? success : undefined })
                    }
                    else {
                      setCallResponse({ status: 'failed', ...response, message })
                    }
                    break
                }
                failed = !success
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
    if (isNumber(amount)) {
      if (BigInt(parseUnits(amount)) <= 0) {
        setRemoveAmounts(['0', '0'])
      }
      else {
        const { chain, asset } = { ...pool }
        const chain_data = getChainData(chain, chains_data)
        const pool_data = toArray(pools_data).find(d => d.chain_data?.id === chain && d.asset_data?.id === asset)
        const { contract_data, domainId, adopted, local } = { ...pool_data }
        const { contract_address } = { ...contract_data }
        const _amount = parseUnits(amount)

        try {
          setPriceImpactRemove(true)

          let amounts
          if (withdrawOption?.endsWith('_only')) {
            const index = (withdrawOption === 'x_only' && adopted?.index === 1) || (withdrawOption === 'y_only' && local?.index === 1) ? 1 : 0
            console.log('[/pool]', '[calculateRemoveSwapLiquidityOneToken]', { domainId, contract_address, amount: _amount, index })
            amounts = await sdk.sdkPool.calculateRemoveSwapLiquidityOneToken(domainId, contract_address, _amount, index)
            if (index === 1) {
              amounts = _.concat('0', amounts?.toString())
            }
            else {
              amounts = _.concat(amounts?.toString(), '0')
            }
            console.log('[/pool]', '[amountsRemoveSwapLiquidityOneToken]', { domainId, contract_address, amount: _amount, index, amounts })
          }
          else {
            console.log('[/pool]', '[calculateRemoveSwapLiquidity]', { domainId, contract_address, amount: _amount })
            amounts = await sdk.sdkPool.calculateRemoveSwapLiquidity(domainId, contract_address, _amount)
            console.log('[/pool]', '[amountsRemoveSwapLiquidity]', { domainId, contract_address, amount: _amount, amounts })
          }

          let _amounts
          if (amounts?.length > 1) {
            console.log('[/pool]', '[getPoolTokenIndex]', { domainId, contract_address, tokenAddress: contract_address })
            const tokenIndex = await sdk.sdkPool.getPoolTokenIndex(domainId, contract_address, contract_address)
            console.log('[/pool]', '[poolTokenIndex]', { domainId, contract_address, tokenAddress: contract_address, tokenIndex })
            if (tokenIndex === 1) {
              _amounts = _.reverse(_.cloneDeep(amounts))
            }
            else {
              _amounts = _.cloneDeep(amounts)
            }
          }

          setRemoveAmounts(toArray(_amounts).map((a, i) => formatUnits(a, (i === 0 ? adopted : local)?.decimals).toString()))
          setCallResponse(null)
        } catch (error) {
          const response = parseError(error)
          console.log('[/pool]', '[calculateRemoveSwapLiquidity error]', { domainId, contract_address, amount: _amount }, error)
          let { message } = { ...response }
          if (message?.includes('exceed total supply')) {
            message = 'Exceed Total Supply'
          }
          setCallResponse({ status: 'failed', ...response, message })
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

  const calculateAddLiquidityPriceImpact = async (domainId, contractAddress, amountX, amountY) => {
    let failed
    try {
      setPriceImpactAdd(true)
      const { id } = { ...chain_data }
      const { tvl } = { ...pool_data }
      if (pool_data && pool_data.chain_data?.id === id && tvl) {
        console.log('[/pool]', '[calculateAddLiquidityPriceImpact]', { domainId, contractAddress, amountX, amountY })
        const priceImpact = await sdk.sdkPool.calculateAddLiquidityPriceImpact(domainId, contractAddress, amountX, amountY)
        console.log('[/pool]', '[addLiquidityPriceImpact]', { domainId, contractAddress, amountX, amountY, priceImpact })
        setPriceImpactAdd(formatUnits(priceImpact) * 100)
      }
      else {
        failed = true
      }
    } catch (error) {
      const response = parseError(error)
      console.log('[/pool]', '[calculateAddLiquidityPriceImpact error]', { domainId, contractAddress, amountX, amountY }, error)
      const { message } = { ...response }
      if (message?.includes('reverted')) {
        failed = true
      }
      else {
        setPriceImpactAdd(0)
        setPriceImpactAddResponse({ status: 'failed', ...response })
      }
    }
    if (failed) {
      setPriceImpactAdd(null)
    }
  }

  const calculateRemoveLiquidityPriceImpact = async (domainId, contractAddress, amountX, amountY) => {
    let failed
    try {
      setPriceImpactRemove(true)
      const { id } = { ...chain_data }
      const { tvl } = { ...pool_data }
      if (pool_data && pool_data.chain_data?.id === id && tvl) {
        console.log('[/pool]', '[calculateRemoveLiquidityPriceImpact]', { domainId, contractAddress, amountX, amountY })
        let priceImpact = await sdk.sdkPool.calculateRemoveLiquidityPriceImpact(domainId, contractAddress, amountX, amountY)
        console.log('[/pool]', '[removeLiquidityPriceImpact]', { domainId, contractAddress, amountX, amountY, priceImpact })
        if (priceImpact < 0) {
          const overweightedAsset = adopted && local && (Number(amountX) + Number((equalsIgnoreCase(adopted.address, x_asset_data?.contract_address) ? adopted : local).balance)) > (Number(amountY) + Number((equalsIgnoreCase(adopted.address, y_asset_data?.contract_address) ? adopted : local).balance)) ? 'x' : 'y'
          if (withdrawOption === `${overweightedAsset}_only`) {
            priceImpact *= -1
          }
        }
        setPriceImpactRemove(formatUnits(numberToFixed(priceImpact)) * 100)
      }
      else {
        failed = true
      }
    } catch (error) {
      const response = parseError(error)
      console.log('[/pool]', '[calculateRemoveLiquidityPriceImpact error]', { domainId, contractAddress, amountX, amountY }, error)
      const { message } = { ...response }
      if (message?.includes('reverted')) {
        failed = true
      }
      else {
        setPriceImpactRemove(0)
        setPriceImpactRemoveResponse({ status: 'failed', ...response })
      }
    }
    if (failed) {
      setPriceImpactRemove(null)
    }
  }

  const { chain, asset } = { ...pool }
  const chain_data = getChainData(chain, chains_data)
  const { chain_id, name, image, explorer } = { ...chain_data }
  const { url, contract_path, transaction_path } = { ...explorer }
  const { infiniteApprove, slippage } = { ...options }

  const selected = !!(chain && asset)
  const no_pool = selected && !getAssetData(asset, pool_assets_data, { chain_id })
  const pool_data = toArray(pools_data).find(d => d.chain_data?.id === chain && d.asset_data?.id === asset)
  const { asset_data, contract_data, symbol, lpTokenAddress, error } = { ...pool_data }
  let { adopted, local } = { ...pool_data }
  const { contract_address, next_asset } = { ...contract_data }
  const pool_loading = selected && !no_pool && !error && !pool_data

  const user_pool_data = pool_data && toArray(userPools).find(d => d.chain_data?.id === chain && d.asset_data?.id === asset)
  const { lpTokenBalance } = { ...user_pool_data }
  const position_loading = selected && !no_pool && !error && (!userPools || pool_loading)

  const pool_tokens_data = toArray(_.concat(adopted, local)).map((a, i) => {
    const { address, symbol, decimals } = { ...a }
    return {
      i,
      contract_address: address,
      chain_id,
      symbol,
      decimals,
      image: (equalsIgnoreCase(address, contract_address) ? contract_data?.image : equalsIgnoreCase(address, next_asset?.contract_address) ? next_asset?.image || contract_data?.image : null) || asset_data?.image,
    }
  })
  adopted = { ...adopted, asset_data: _.head(pool_tokens_data) }
  local = { ...local, asset_data: _.last(pool_tokens_data) }

  const native_asset = !adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local
  const wrapped_asset = adopted?.symbol?.startsWith(WRAPPED_PREFIX) ? adopted : local
  const native_amount = Number(native_asset?.balance) || 0
  const wrapped_amount = Number(wrapped_asset?.balance) || 0
  const total_amount = native_amount + wrapped_amount

  const _image = contract_data?.image
  const image_paths = split(_image, 'normal', '/', false)
  const image_name = _.last(image_paths)

  const x_asset_data = adopted?.address && {
    ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
    ...(equalsIgnoreCase(adopted.address, contract_address) ?
      contract_data :
      {
        chain_id,
        contract_address: adopted.address,
        decimals: adopted.decimals,
        symbol: adopted.symbol,
        image: _image ?
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
  const _x_asset_data = adopted?.address && {
    ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
    ...contract_data,
  }
  const { mintable, wrappable, wrapped } = { ..._x_asset_data }
  const y_asset_data = local?.address && {
    ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
    ...(equalsIgnoreCase(local.address, contract_address) ?
      contract_data :
      {
        chain_id,
        contract_address: local.address,
        decimals: local.decimals,
        symbol: local.symbol,
        image: _image ?
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

  const x_decimals = x_asset_data?.decimals || 18
  const y_decimals = y_asset_data?.decimals || 18
  const x_balance_amount = x_asset_data && getBalanceData(chain_id, x_asset_data.contract_address, balances_data)?.amount
  const y_balance_amount = y_asset_data && getBalanceData(chain_id, y_asset_data.contract_address, balances_data)?.amount
  const x_remove_amount = equalsIgnoreCase(adopted?.address, contract_address) ? _.head(removeAmounts) : _.last(removeAmounts)
  const y_remove_amount = equalsIgnoreCase(adopted?.address, contract_address) ? _.last(removeAmounts) : _.head(removeAmounts)
  const x_url = x_asset_data?.contract_address && url && `${url}${contract_path?.replace('{address}', x_asset_data.contract_address)}${address ? `?a=${address}` : ''}`
  const y_url = y_asset_data?.contract_address && url && `${url}${contract_path?.replace('{address}', y_asset_data.contract_address)}${address ? `?a=${address}` : ''}`

  const valid_amount = action === 'withdraw' ?
    isNumber(amount) && !isZero(amount) && isNumber(lpTokenBalance) && BigInt(parseUnits(amount)) > 0 && BigInt(parseUnits(amount)) <= BigInt(parseUnits(lpTokenBalance)) :
    isNumber(amountX) && isNumber(amountY) && !(isZero(amountX) && isZero(amountY)) && isNumber(x_balance_amount) && isNumber(y_balance_amount) && (BigInt(parseUnits(amountX, x_decimals)) > 0 || BigInt(parseUnits(amountY, y_decimals)) > 0) && BigInt(parseUnits(amountX, x_decimals)) <= BigInt(parseUnits(x_balance_amount, x_decimals)) && BigInt(parseUnits(amountY, y_decimals)) <= BigInt(parseUnits(y_balance_amount, y_decimals))
  const disabled = !pool_data || error || approving || calling
  const response = callResponse || approveResponse || priceImpactAddResponse || priceImpactRemoveResponse
  const wrong_chain = wallet_chain_id !== chain_id && !callResponse

  return (
    <div className="order-1 lg:order-2 space-y-3">
      <div className="bg-slate-50 dark:bg-slate-900 rounded border dark:border-slate-800 space-y-3 pt-4 3xl:pt-6 pb-5 3xl:pb-7 px-4 3xl:px-6">
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
                className={`w-fit cursor-pointer border-b-2 ${action === a ? 'border-slate-300 dark:border-slate-200' : 'border-transparent text-slate-400 dark:text-slate-500'} capitalize text-sm 3xl:text-xl font-semibold text-left py-3 px-0`}
              >
                {a}
              </div>
            ))}
          </div>
          {action === 'deposit' ?
            <>
              <div className="3xl:space-y-4 pt-2 px-0">
                <div className="space-y-1">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                      Token 1
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                        Balance:
                      </div>
                      {x_asset_data?.contract_address && provider && (
                        <button
                          disabled={disabled}
                          onClick={
                            () => {
                              if (isNumber(x_balance_amount)) {
                                setAmountX(x_balance_amount.toString())
                                if (!isNumber(amountY) || isZero(amountY)) {
                                  setAmountY('0')
                                }
                              }
                            }
                          }
                          className="flex items-center"
                        >
                          <Balance
                            chainId={chain_id}
                            asset={asset}
                            contractAddress={x_asset_data.contract_address}
                            symbol={x_asset_data.symbol}
                            hideSymbol={true}
                            className="text-xs 3xl:text-xl"
                          />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="rounded border dark:border-slate-800 flex items-center justify-between space-x-2 py-2.5 px-3">
                      {x_url && (
                        <a
                          href={x_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-max flex items-center space-x-1.5"
                        >
                          {x_asset_data.image && (
                            <Image
                              src={x_asset_data.image}
                              width={20}
                              height={20}
                              className="3xl:w-6 3xl:h-6 rounded-full"
                            />
                          )}
                          <span className="text-base 3xl:text-2xl font-semibold">
                            {x_asset_data.symbol}
                          </span>
                        </a>
                      )}
                      <DebounceInput
                        debounceTimeout={750}
                        size="small"
                        type="number"
                        placeholder="0.00"
                        disabled={disabled}
                        value={isNumber(amountX) ? amountX : ''}
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
                              value = numberToFixed(value, x_decimals)
                            }
                            setAmountX(value)
                            if (!isNumber(amountY) || isZero(amountY)) {
                              setAmountY('0')
                            }
                          }
                        }
                        onWheel={e => e.target.blur()}
                        onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                        className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base 3xl:text-2xl font-medium text-right`}
                      />
                    </div>
                    {isNumber(amountX) && isNumber(x_balance_amount) && BigInt(parseUnits(amountX, x_decimals)) > BigInt(parseUnits(x_balance_amount, x_decimals)) && (
                      <div className="flex items-center justify-end text-red-600 dark:text-yellow-400 space-x-1 sm:mx-0">
                        <BiMessageError size={16} className="min-w-max 3xl:w-5 3xl:h-5" />
                        <span className="text-xs 3xl:text-lg font-medium">
                          Not enough {x_asset_data?.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full flex items-center justify-center mt-2.5 -mb-2">
                  <BiPlus size={20} className="3xl:w-6 3xl:h-6 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="space-y-1 mt-2.5">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                      Token 2
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                        Balance:
                      </div>
                      {y_asset_data?.contract_address && provider && (
                        <button
                          disabled={disabled}
                          onClick={
                            () => {
                              if (isNumber(y_balance_amount)) {
                                setAmountY(y_balance_amount.toString())
                                if (!isNumber(amountX) || isZero(amountX)) {
                                  setAmountX('0')
                                }
                              }
                            }
                          }
                          className="flex items-center"
                        >
                          <Balance
                            chainId={chain_id}
                            asset={asset}
                            contractAddress={y_asset_data.contract_address}
                            symbol={y_asset_data.symbol}
                            hideSymbol={true}
                            className="text-xs 3xl:text-xl"
                          />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="rounded border dark:border-slate-800 flex items-center justify-between space-x-2 py-2.5 px-3">
                      {y_url && (
                        <a
                          href={y_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-max flex items-center space-x-1.5"
                        >
                          {y_asset_data.image && (
                            <Image
                              src={y_asset_data.image}
                              width={20}
                              height={20}
                              className="3xl:w-6 3xl:h-6 rounded-full"
                            />
                          )}
                          <span className="text-base 3xl:text-2xl font-semibold">
                            {y_asset_data.symbol}
                          </span>
                        </a>
                      )}
                      <DebounceInput
                        debounceTimeout={750}
                        size="small"
                        type="number"
                        placeholder="0.00"
                        disabled={disabled}
                        value={isNumber(amountY) ? amountY : ''}
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
                              value = numberToFixed(value, y_decimals)
                            }
                            setAmountY(value)
                            if (!isNumber(amountX) || isZero(amountX)) {
                              setAmountX('0')
                            }
                          }
                        }
                        onWheel={e => e.target.blur()}
                        onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                        className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base 3xl:text-2xl font-medium text-right`}
                      />
                    </div>
                    {isNumber(amountY) && isNumber(y_balance_amount) && BigInt(parseUnits(amountY, y_decimals)) > BigInt(parseUnits(y_balance_amount, y_decimals)) && (
                      <div className="flex items-center justify-end text-red-600 dark:text-yellow-400 space-x-1 sm:mx-0">
                        <BiMessageError size={16} className="min-w-max 3xl:w-5 3xl:h-5" />
                        <span className="text-xs 3xl:text-lg font-medium">
                          Not enough {y_asset_data?.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-1">
                  <Tooltip
                    placement="top"
                    content="The adjusted amount you are paying for LP tokens above or below current market prices."
                    className="w-80"
                  >
                    <div className="flex items-center">
                      <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                        {typeof priceImpactAdd === 'number' ? priceImpactAdd < 0 ? 'Slippage' : 'Bonus' : 'Price impact'}
                      </div>
                      <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                    </div>
                  </Tooltip>
                  <div className="flex items-center text-xs 3xl:text-xl font-semibold">
                    {priceImpactAdd === true && !priceImpactAddResponse ?
                      <Spinner width={10} height={10} /> :
                      <span className={`${isNumber(priceImpactAdd) && !isZero(priceImpactAdd) ? priceImpactAdd < 0 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500' : ''}`}>
                        {isNumber(priceImpactAdd) || priceImpactAddResponse ?
                          <NumberDisplay
                            value={priceImpactAdd}
                            suffix=" %"
                            noTooltip={true}
                            className="whitespace-nowrap"
                          /> :
                          <span>-</span>
                        }
                      </span>
                    }
                  </div>
                </div>
              </div>
              <div className="flex items-end">
                {!valid_amount ?
                  <button disabled={true} className="w-full bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed rounded flex items-center justify-center space-x-1.5 py-3 sm:py-4 px-2 sm:px-3">
                    <span className="text-slate-400 dark:text-slate-500 text-base 3xl:text-2xl">
                      Enter amount
                    </span>
                  </button> :
                  provider && chain && wrong_chain ?
                    <Wallet
                      connectChainId={chain_id}
                      className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base 3xl:text-2xl font-medium space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                    >
                      <span>Switch to</span>
                      {image && (
                        <Image
                          src={image}
                          width={28}
                          height={28}
                          className="3xl:w-8 3xl:h-8 rounded-full"
                        />
                      )}
                      <span className="font-medium">
                        {name}
                      </span>
                    </Wallet> :
                    response ?
                      toArray(response).filter(d => d.status !== 'success').map((d, i) => {
                        const { status, message, tx_hash } = { ...d }

                        let color
                        switch (status) {
                          case 'success':
                            color = 'bg-green-500 dark:bg-green-400'
                            break
                          case 'failed':
                            color = 'bg-red-500 dark:bg-red-400'
                            break
                          default:
                            break
                        }
                        const closeButton = color && (
                          <button onClick={() => reset()} className={`${color} rounded-full flex items-center justify-center text-white p-1`}>
                            <MdClose size={14} />
                          </button>
                        )

                        return (
                          <Alert
                            key={i}
                            status={status}
                            icon={status === 'pending' && (
                              <div className="mr-3">
                                <Spinner name="Watch" width={16} height={16} color="white" />
                              </div>
                            )}
                            closeDisabled={true}
                            className="p-3"
                          >
                            <div className="flex items-center justify-between space-x-2">
                              <span className="leading-5 break-words text-sm 3xl:text-xl font-medium">
                                {ellipse(normalizeMessage(message, status), 128)}
                              </span>
                              <div className="flex items-center space-x-1">
                                {url && tx_hash && (
                                  <a
                                    href={`${url}${transaction_path?.replace('{tx}', tx_hash)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <TiArrowRight size={20} className="transform -rotate-45" />
                                  </a>
                                )}
                                {status === 'failed' && <Copy value={message} className="cursor-pointer text-slate-200 hover:text-white" />}
                                {closeButton}
                              </div>
                            </div>
                          </Alert>
                        )
                      }) :
                      provider ?
                        <button
                          disabled={disabled || !valid_amount}
                          onClick={() => call(pool_data)}
                          className={`w-full ${disabled || !valid_amount ? calling || approving ? 'bg-blue-400 dark:bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded text-base 3xl:text-2xl text-center py-3 sm:py-4 px-2 sm:px-3`}
                        >
                          <span className="flex items-center justify-center space-x-1.5">
                            {(calling || approving) && <div><Spinner width={20} height={20} color="white" /></div>}
                            <span>
                              {calling ?
                                approving ?
                                  approveProcessing ? 'Approving' : 'Please Approve' :
                                  callProcessing ?
                                    'Depositing' :
                                    typeof approving === 'boolean' ? 'Please Confirm' : 'Checking Approval' :
                                !valid_amount ? 'Enter amount' : 'Supply'
                              }
                            </span>
                          </span>
                        </button> :
                        <Wallet
                          connectChainId={chain_id}
                          buttonConnectTitle="Connect Wallet"
                          className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base 3xl:text-2xl font-medium text-center py-3 sm:py-4 px-2 sm:px-3"
                        >
                          <span>Connect Wallet</span>
                        </Wallet>
                }
              </div>
            </> :
            <>
              <div className="space-y-6 py-2 px-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between space-x-2">
                    <span className="text-xs 3xl:text-lg font-medium">
                      Withdraw %
                    </span>
                    <div className="flex items-center space-x-1">
                      <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs 3xl:text-lg font-medium">
                        LP Token Balance:
                      </div>
                      {provider && (
                        <div className="flex items-center justify-center">
                          {isNumber(lpTokenBalance) ?
                            <NumberDisplay
                              value={lpTokenBalance}
                              className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-lg"
                            /> :
                            !user_pool_data && !position_loading ?
                              <span className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-lg">
                                0
                              </span> :
                              <Spinner name="RotatingSquare" width={16} height={16} />
                          }
                        </div>
                      )}
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
                        value={isNumber(withdrawPercent) ? withdrawPercent : ''}
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
                                _amount = Number(value) === 100 ? lpTokenBalance.toString() : toFixedNumber(lpTokenBalance).mulUnsafe(toFixedNumber(value)).divUnsafe(toFixedNumber('100')).toString()
                              }
                            } catch (error) {
                              _amount = '0'
                            }
                            setAmount(_amount)
                          }
                        }
                        onWheel={e => e.target.blur()}
                        onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                        className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-slate-400 dark:text-slate-500 text-base 3xl:text-2xl font-medium text-right`}
                      />
                      <span className="text-slate-400 dark:text-slate-500 3xl:text-2xl">
                        %
                      </span>
                    </div>
                    {isNumber(amount) && isNumber(lpTokenBalance) && BigInt(parseUnits(amount)) > BigInt(parseUnits(lpTokenBalance)) && (
                      <div className="flex items-center justify-end text-red-600 dark:text-yellow-400 space-x-1 sm:mx-0">
                        <BiMessageError size={16} className="min-w-max 3xl:w-5 3xl:h-5" />
                        <span className="text-xs 3xl:text-lg font-medium">
                          Not enough {symbol}
                        </span>
                      </div>
                    )}
                  </div>
                  {isNumber(lpTokenBalance) && BigInt(parseUnits(lpTokenBalance)) > 0 && (
                    <div className="flex items-center justify-end space-x-2.5">
                      {[0.25, 0.5, 0.75, 1.0].map((d, i) => (
                        <div
                          key={i}
                          onClick={
                            () => {
                              setWithdrawPercent(d * 100)
                              let _amount
                              try {
                                _amount = d === 1 ? lpTokenBalance.toString() : toFixedNumber(lpTokenBalance).mulUnsafe(toFixedNumber(d)).toString()
                              } catch (error) {
                                _amount = '0'
                              }
                              setAmount(_amount)
                            }
                          }
                          className={`${disabled || !isNumber(lpTokenBalance) ? 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-blue-400 dark:text-slate-200 font-semibold' : toFixedNumber(lpTokenBalance).mulUnsafe(toFixedNumber(d)).toString() === amount ? 'bg-slate-300 dark:bg-slate-700 cursor-pointer text-blue-600 dark:text-white font-semibold' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-800 cursor-pointer text-blue-400 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white 3xl:text-xl font-medium'} rounded text-xs py-0.5 px-1.5`}
                        >
                          {d * 100} %
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {x_asset_data && y_asset_data && (
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                      {WITHDRAW_OPTIONS.map((d, i) => {
                        const { value } = { ...d }
                        let { title } = { ...d }
                        title = title.replace('{x}', x_asset_data.symbol).replace('{y}', y_asset_data.symbol)
                        const selected = value === withdrawOption
                        return (
                          <div
                            key={i}
                            onClick={
                              () => {
                                if (!disabled) {
                                  setWithdrawOption(value)
                                }
                              }
                            }
                            className={`${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} inline-flex items-center space-x-2`}
                          >
                            <input
                              type="radio"
                              value={value}
                              checked={selected}
                              onChange={() => {}}
                              className={`w-4 3xl:w-5 h-4 3xl:h-5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} text-blue-500 mt-0.5`}
                            />
                            <span className={`${selected ? 'font-bold' : 'text-slate-400 dark:text-slate-500 font-medium'} 3xl:text-xl`}>
                              {title}
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
                          <div className="flex items-center space-x-1">
                            <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                              Balance:
                            </div>
                            <button disabled={disabled} className="cursor-default">
                              <Balance
                                chainId={chain_id}
                                asset={asset}
                                contractAddress={x_asset_data.contract_address}
                                decimals={x_asset_data.decimals}
                                symbol={x_asset_data.symbol}
                                className="text-xs 3xl:text-xl"
                              />
                            </button>
                          </div>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-800 space-y-0.5 py-2.5 px-3">
                          <div className="flex items-center justify-between space-x-2">
                            {x_url ?
                              <a
                                href={x_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-max flex items-center space-x-1.5"
                              >
                                {x_asset_data.image && (
                                  <Image
                                    src={x_asset_data.image}
                                    width={20}
                                    height={20}
                                    className="3xl:w-6 3xl:h-6 rounded-full"
                                  />
                                )}
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
                                value={isNumber(x_remove_amount) ? x_remove_amount : ''}
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
                                      value = numberToFixed(value, x_decimals)
                                    }
                                    if (amount) {
                                      if (Number(value) > amount) {
                                        value = numberToFixed(amount, x_decimals)
                                      }
                                    }
                                    else {
                                      value = '0'
                                    }
                                    setRemoveAmounts([value, amount - Number(value)].map((v, i) => isNumber(v) ? removeDecimal(numberToFixed(Number(v), i === 0 ? x_decimals : y_decimals)) : ''))
                                  }
                                }
                                onWheel={e => e.target.blur()}
                                onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                                className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base 3xl:text-2xl font-medium text-right`}
                              /> :
                              isNumber(x_remove_amount) ?
                                <NumberDisplay
                                  value={x_remove_amount}
                                  className="w-fit bg-transparent text-slate-500 dark:text-slate-500 text-base 3xl:text-2xl font-medium text-right"
                                /> :
                                position_loading && isNumber(amount) && <div><Spinner /></div>
                            }
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between space-x-2">
                          <span className="text-slate-600 dark:text-slate-500 text-xs 3xl:text-xl font-medium" />
                          <div className="flex items-center space-x-1">
                            <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                              Balance:
                            </div>
                            <button disabled={disabled} className="cursor-default">
                              <Balance
                                chainId={chain_id}
                                asset={asset}
                                contractAddress={y_asset_data.contract_address}
                                decimals={y_asset_data.decimals}
                                symbol={y_asset_data.symbol}
                                className="text-xs 3xl:text-xl"
                              />
                            </button>
                          </div>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-800 space-y-0.5 py-2.5 px-3">
                          <div className="flex items-center justify-between space-x-2">
                            {y_url ?
                              <a
                                href={y_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-max flex items-center space-x-1.5"
                              >
                                {y_asset_data.image && (
                                  <Image
                                    src={y_asset_data.image}
                                    width={20}
                                    height={20}
                                    className="3xl:w-6 3xl:h-6 rounded-full"
                                  />
                                )}
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
                                value={isNumber(y_remove_amount) ? y_remove_amount : ''}
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
                                      value = numberToFixed(value, y_decimals)
                                    }
                                    if (amount) {
                                      if (Number(value) > amount) {
                                        value = numberToFixed(amount, y_decimals)
                                      }
                                    }
                                    else {
                                      value = '0'
                                    }
                                    setRemoveAmounts([amount - Number(value), value].map((v, i) => isNumber(v) ? removeDecimal(numberToFixed(Number(a), i === 0 ? x_decimals : y_decimals)) : ''))
                                  }
                                }
                                onWheel={e => e.target.blur()}
                                onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                                className={`w-full bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 text-base 3xl:text-2xl font-medium text-right`}
                              /> :
                              isNumber(y_remove_amount) ?
                                <NumberDisplay
                                  value={y_remove_amount}
                                  className="w-fit bg-transparent text-slate-500 dark:text-slate-500 text-base 3xl:text-2xl font-medium text-right"
                                /> :
                                position_loading && isNumber(amount) && <div><Spinner /></div>
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between space-x-1">
                        <Tooltip
                          placement="top"
                          content="The adjusted amount you are withdrawing for LP tokens above or below current market prices."
                          className="w-80"
                        >
                          <div className="flex items-center">
                            <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                              Slippage
                            </div>
                            <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                          </div>
                        </Tooltip>
                        <div className="flex items-center text-xs 3xl:text-xl font-semibold">
                          {priceImpactRemove === true && !priceImpactRemoveResponse ?
                            <Spinner width={10} height={10} /> :
                            <span className={`${isNumber(priceImpactRemove) && !isZero(priceImpactRemove) ? priceImpactRemove < 0 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500' : ''}`}>
                              {isNumber(priceImpactRemove) || priceImpactRemoveResponse ?
                                <NumberDisplay
                                  value={priceImpactRemove}
                                  suffix=" %"
                                  noTooltip={true}
                                  className="whitespace-nowrap"
                                /> :
                                <span>-</span>
                              }
                            </span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-end">
                {!valid_amount ?
                  <button disabled={true} className="w-full bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed rounded flex items-center justify-center space-x-1.5 py-3 sm:py-4 px-2 sm:px-3">
                    <span className="text-slate-400 dark:text-slate-500 text-base 3xl:text-2xl">
                      Enter amount
                    </span>
                  </button> :
                  provider && wrong_chain ?
                    <Wallet
                      connectChainId={chain_id}
                      className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base 3xl:text-2xl font-medium space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                    >
                      <span>Switch to</span>
                      {image && (
                        <Image
                          src={image}
                          width={28}
                          height={28}
                          className="3xl:w-8 3xl:h-8 rounded-full"
                        />
                      )}
                      <span className="font-medium">
                        {name}
                      </span>
                    </Wallet> :
                    response ?
                      toArray(response).filter(d => d.status !== 'success').map((d, i) => {
                        const { status, message, tx_hash } = { ...d }

                        let color
                        switch (status) {
                          case 'success':
                            color = 'bg-green-500 dark:bg-green-400'
                            break
                          case 'failed':
                            color = 'bg-red-500 dark:bg-red-400'
                            break
                          default:
                            break
                        }
                        const closeButton = color && (
                          <button onClick={() => reset()} className={`${color} rounded-full flex items-center justify-center text-white p-1`}>
                            <MdClose size={14} />
                          </button>
                        )

                        return (
                          <Alert
                            key={i}
                            status={status}
                            icon={status === 'pending' && (
                              <div className="mr-2.5">
                                <Spinner name="Watch" width={16} height={16} color="white" />
                              </div>
                            )}
                            closeDisabled={true}
                            className="p-3"
                          >
                            <div className="flex items-center justify-between space-x-2">
                              <span className="leading-5 break-words text-sm 3xl:text-xl font-medium">
                                {ellipse(normalizeMessage(message, status), 128)}
                              </span>
                              <div className="flex items-center space-x-1">
                                {url && tx_hash && (
                                  <a
                                    href={`${url}${transaction_path?.replace('{tx}', tx_hash)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <TiArrowRight size={20} className="transform -rotate-45" />
                                  </a>
                                )}
                                {status === 'failed' && message && <Copy value={message} className="cursor-pointer text-slate-200 hover:text-white" />}
                                {closeButton}
                              </div>
                            </div>
                          </Alert>
                        )
                      }) :
                      provider ?
                        <button
                          disabled={disabled || !valid_amount}
                          onClick={() => call(pool_data)}
                          className={`w-full ${disabled || !valid_amount ? calling || approving ? 'bg-blue-400 dark:bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded text-base 3xl:text-2xl text-center py-3 sm:py-4 px-2 sm:px-3`}
                        >
                          <span className="flex items-center justify-center space-x-1.5">
                            {(calling || approving) && <div><Spinner width={20} height={20} color="white" /></div>}
                            <span>
                              {calling ?
                                approving ?
                                  approveProcessing ? 'Approving' : 'Please Approve' :
                                  callProcessing ?
                                    'Withdrawing' :
                                    typeof approving === 'boolean' ? 'Please Confirm' : 'Checking Approval' :
                                !valid_amount ? 'Enter amount' : 'Withdraw'
                              }
                            </span>
                          </span>
                        </button> :
                        <Wallet
                          connectChainId={chain_id}
                          buttonConnectTitle="Connect Wallet"
                          className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base 3xl:text-2xl font-medium text-center py-3 sm:py-4 px-2 sm:px-3"
                        >
                          <span>Connect Wallet</span>
                        </Wallet>
                }
              </div>
            </>
          }
          {toArray(responses).length > 0 && (
            <div className="flex flex-col space-y-1">
              {toArray(responses).map((d, i) => {
                const { message, tx_hash } = { ...d }
                return (
                  <AlertNotification
                    key={i}
                    animate={{ mount: { y: 0 }, unmount: { y: 32 } }}
                    dismissible={{ onClose: () => setResponses(responses.filter(d => d.tx_hash !== tx_hash)) }}
                    className="alert-box flex"
                  >
                    <div className="flex items-start justify-between space-x-2">
                      <span className="min-w-fit leading-5 break-words text-sm 3xl:text-xl font-medium">
                        {ellipse(split(message, 'normal', ' ').join(' '), 128)}
                      </span>
                      <div className="flex items-center space-x-1">
                        {url && tx_hash && (
                          <a
                            href={`${url}${transaction_path?.replace('{tx}', tx_hash)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <TiArrowRight size={24} className="transform -rotate-45" />
                          </a>
                        )}
                      </div>
                    </div>
                  </AlertNotification>
                )
              })}
            </div>
          )}
          {(mintable || wrappable || wrapped) && (
            <Faucet
              tokenId={asset}
              contractData={_x_asset_data}
              titleClassName={wrong_chain ? 'text-slate-400 dark:text-slate-600' : ''}
              className="w-full max-w-lg bg-transparent flex flex-col items-center justify-center space-y-2 mx-auto"
            />
          )}
        </div>
      </div>
      {process.env.NEXT_PUBLIC_LP_GUIDE && (
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
            <BsArrowRight size={10} className="3xl:w-4 3xl:h-4 text-blue-500 dark:text-white" />
          </a>
        </div>
      )}
    </div>
  )
}
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { Tooltip } from '@material-tailwind/react'
import { DebounceInput } from 'react-debounce-input'
import _ from 'lodash'
import moment from 'moment'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { HiSwitchVertical } from 'react-icons/hi'
import { BiEditAlt, BiCheckCircle, BiInfoCircle } from 'react-icons/bi'

import Options from './options'
import WarningSlippage from '../bridge/warning/slippage'
import Spinner from '../spinner'
import NumberDisplay from '../number'
import Alert from '../alert'
import Balance from '../balance'
import Copy from '../copy'
import Image from '../image'
import Wallet from '../wallet'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import { NETWORK, WRAPPED_PREFIX, GAS_LIMIT_ADJUSTMENT, DEFAULT_PERCENT_SWAP_SLIPPAGE } from '../../lib/config'
import { getChainData, getAssetData, getContractData, getPoolData, getBalanceData } from '../../lib/object'
import { toBigNumber, toFixedNumber, formatUnits, parseUnits, isNumber, isZero } from '../../lib/number'
import { split, toArray, numberToFixed, ellipse, equalsIgnoreCase, getPath, getQueryParams, sleep, normalizeMessage, parseError } from '../../lib/utils'
import { POOLS_DATA, BALANCES_DATA, GET_BALANCES_DATA } from '../../reducers/types'

const DEFAULT_OPTIONS = {
  infiniteApprove: true,
  slippage: DEFAULT_PERCENT_SWAP_SLIPPAGE,
}

export default () => {
  const dispatch = useDispatch()
  const { preferences, chains, pool_assets, pools, rpc_providers, dev, wallet, balances } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, pool_assets: state.pool_assets, pools: state.pools, rpc_providers: state.rpc_providers, dev: state.dev, wallet: state.wallet, balances: state.balances }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { pool_assets_data } = { ...pool_assets }
  const { pools_data } = { ...pools }
  const { rpcs } = { ...rpc_providers }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { provider, ethereum_provider, signer, address } = { ...wallet_data }
  const wallet_chain_id = wallet_data?.chain_id
  const { balances_data } = { ...balances }

  const router = useRouter()
  const { asPath } = { ...router }

  const [swap, setSwap] = useState({})
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [buttonDirection, setButtonDirection] = useState(1)
  const [slippageEditing, setSlippageEditing] = useState(false)

  const [swapAmount, setSwapAmount] = useState(null)
  const [calculateSwapResponse, setCalculateSwapResponse] = useState(null)
  const [priceImpact, setPriceImpact] = useState(null)

  const [approving, setApproving] = useState(null)
  const [approveProcessing, setApproveProcessing] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [calling, setCalling] = useState(null)
  const [callProcessing, setCallProcessing] = useState(null)
  const [callResponse, setCallResponse] = useState(null)

  const [pair, setPair] = useState(null)
  const [pairTrigger, setPairTrigger] = useState(null)
  const [balanceTrigger, setBalanceTrigger] = useState(null)

  // get swap from path
  useEffect(
    () => {
      if (pool_assets_data) {
        let updated = false
        const path = getPath(asPath)
        const params = getQueryParams(asPath)
        if (path.includes('on-')) {
          const { amount, from } = { ...params }
          const paths = split(path.replace('/swap/', ''), 'normal', '-')
          const chain = paths[paths.indexOf('on') + 1]
          const asset = _.head(paths) !== 'on' ? _.head(paths) : NETWORK === 'testnet' ? 'eth' : 'usdc'
          const chain_data = getChainData(chain, chains_data, { must_have_pools: true })
          const asset_data = getAssetData(asset, pool_assets_data)

          if (chain_data) {
            updated = swap.chain !== chain
            swap.chain = chain
          }
          if (asset_data) {
            updated = swap.asset !== asset
            swap.asset = asset
          }
          if (swap.chain) {
            if (isNumber(amount) && !isZero(amount)) {
              updated = swap.amount !== amount
              swap.amount = amount
            }
            if (from) {
              updated = swap.origin !== 'y'
              swap.origin = 'y'
            }
          }
        }

        if (updated) {
          setSwap(swap)
        }
      }
    },
    [chains_data, pool_assets_data, asPath],
  )

  // set swap to path
  useEffect(
    () => {
      const params = { ...getQueryParams(asPath) }
      if (swap) {
        const { chain, asset, amount, origin } = { ...swap }
        const chain_data = getChainData(chain, chains_data, { must_have_pools: true })
        const { chain_id } = { ...chain_data }
        if (chain_data) {
          params.chain = chain
          if (asset && getAssetData(asset, pool_assets_data, { chain_id })) {
            params.asset = asset
          }
        }
        else if (!chain) {
          params.chain = getChainData(wallet_chain_id, chains_data, { must_have_pools: true })?.id || getChainData(undefined, chains_data, { must_have_pools: true, get_head: true })?.id
        }
        if (params.chain && params.asset) {
          if (isNumber(amount) && !isZero(amount)) {
            params.amount = amount
          }
          if (origin === 'y' && local?.symbol && getAssetData(asset, pool_assets_data, { chain_id, symbol: local.symbol })) {
            params.from = local.symbol
          }
        }
        else if (params.chain && !asset) {
          const { chain_id } = { ...getChainData(params.chain, chains_data) }
          params.asset = getAssetData(undefined, pool_assets_data, { chain_id, get_head: true })?.id
        }
      }

      if (Object.keys(params).length > 0) {
        const { chain, asset } = { ...params }
        delete params.chain
        delete params.asset
        if (chain && asset) {
          router.push(`/swap/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`, undefined, { shallow: true })
          setBalanceTrigger(moment().valueOf())
        }
      }
      setApproveResponse(null)
      setCallResponse(null)
    },
    [pool_assets_data, address, swap],
  )

  // update balances
  useEffect(
    () => {
      const { id } = { ...getChainData(wallet_chain_id, chains_data) }
      const path = getPath(asPath)
      if (id && !path.includes('on-')) {
        const { chain } = { ...getQueryParams(asPath) }
        if (!chain && getChainData(id, chains_data, { must_have_pools: true, get_head: true })) {
          setSwap({ ...swap, chain: id })
        }
        getBalances(id)
      }
    },
    [chains_data, wallet_chain_id, asPath],
  )

  // update balances
  useEffect(
    () => {
      dispatch({ type: BALANCES_DATA, value: null })
      if (address) {
        const { chain } = { ...swap }
        getBalances(chain)
      }
      else {
        reset('address')
      }
    },
    [address],
  )

  // update balances
  useEffect(
    () => {
      const getData = () => {
        const { status } = { ...approveResponse }
        if (address && !calling && status !== 'pending') {
          const { chain } = { ...swap }
          getBalances(chain)
        }
      }

      getData()
      const interval = setInterval(() => getData(), 0.25 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [rpcs],
  )

  // update balances
  useEffect(
    () => {
      if (pools_data) {
        _.uniq(toArray(pools_data.map(d => d.chain_data?.id))).forEach(c => getBalances(c))
      }
    },
    [pools_data],
  )

  // get pair
  useEffect(
    () => {
      const getData = async () => {
        const { chain, asset, amount } = { ...swap }
        if (sdk && chain) {
          let failed
          let _pair
          if (isNumber(amount)) {
            setSwapAmount(true)
          }
          else if (isNumber(swapAmount)) {
            setSwapAmount(null)
          }

          const chain_changed = !equalsIgnoreCase(chain, pair?.chain_data?.id)
          const asset_changed = !equalsIgnoreCase(asset, pair?.asset_data?.id)
          if (chain_changed || asset_changed || !pair?.updated_at || moment().diff(moment(pair.updated_at), 'seconds') > 30) {
            try {
              if (pair === undefined || pair?.error || chain_changed || asset_changed) {
                setPair(getPoolData([chain, asset].join('_'), pools_data) || null)
              }

              const chain_data = getChainData(chain, chains_data)
              const { id, chain_id, domain_id } = { ...chain_data }
              const asset_data = getAssetData(asset, pool_assets_data)
              const { contracts } = { ...asset_data }
              const contract_data = getContractData(chain_id, contracts)
              const { contract_address, is_pool } = { ...contract_data }
              if (is_pool) {
                console.log('[/swap]', '[getPool]', { domain_id, contract_address })
              }
              const pool = is_pool && _.cloneDeep(await sdk.sdkPool.getPool(domain_id, contract_address))
              if (is_pool) {
                console.log('[/swap]', '[pool]', { domain_id, contract_address, pool })
              }
              const { lpTokenAddress, adopted, local } = { ...pool }

              if (adopted) {
                const { balance, decimals } = { ...adopted }
                adopted.balance = formatUnits(balance, decimals)
                pool.adopted = adopted
              }
              if (local) {
                const { balance, decimals } = { ...local }
                local.balance = formatUnits(balance, decimals)
                pool.local = local
              }

              let supply
              let rate
              if (lpTokenAddress) {
                console.log('[/swap]', '[getTokenSupply]', { domain_id, lpTokenAddress })
                try {
                  supply = await sdk.sdkPool.getTokenSupply(domain_id, lpTokenAddress)
                  supply = formatUnits(supply)
                  console.log('[/swap]', '[LPTokenSupply]', { domain_id, lpTokenAddress, supply })
                } catch (error) {
                  console.log('[/swap]', '[getTokenSupply error]', { domain_id, lpTokenAddress }, error)
                }
              }
              if (pool) {
                console.log('[/swap]', '[getVirtualPrice]', { domain_id, contract_address })
                try {
                  rate = await sdk.sdkPool.getVirtualPrice(domain_id, contract_address)
                  rate = formatUnits(rate)
                  console.log('[/swap]', '[virtualPrice]', { domain_id, contract_address, rate })
                } catch (error) {
                  console.log('[/swap]', '[getVirtualPrice error]', { domain_id, contract_address }, error)
                }
              }

              _pair = (pool ?
                toArray(pool).map(d => {
                  const { symbol } = { ...d }
                  const symbols = split(symbol, 'normal', '-')
                  const asset_data = getAssetData(undefined, pool_assets_data, { chain_id, symbols })
                  return { ...d, chain_data, asset_data, symbols }
                }) :
                toArray(pair)
              ).find(d => equalsIgnoreCase(d.domainId, domain_id) && equalsIgnoreCase(d.asset_data?.id, asset))
              _pair = _pair && {
                ..._pair,
                id: [chain, asset].join('_'),
                contract_data,
                supply: supply || _pair.supply,
                rate,
                updated_at: moment().valueOf(),
              }

              setPair(is_pool ? _pair : undefined)
              if (is_pool && _pair) {
                dispatch({ type: POOLS_DATA, value: _pair })
              }
            } catch (error) {
              console.log('[/swap]', '[getPair error]', swap, error)
              setPair({ error })
              calculateSwap(null)
              failed = true
            }
          }
          else {
            _pair = pair
          }

          if (!failed) {
            calculateSwap(_pair)
          }
        }
      }
      getData()
    },
    [sdk, swap, pairTrigger],
  )

  const reset = async origin => {
    const reset_swap = !['address', 'user_rejected'].includes(origin)
    if (reset_swap) {
      setSwap({ ...swap, amount: null })
    }

    setOptions(DEFAULT_OPTIONS)
    setCalculateSwapResponse(null)

    setApproving(null)
    setApproveProcessing(null)
    setApproveResponse(null)

    setCalling(null)
    setCallProcessing(null)
    setCallResponse(null)

    setPairTrigger(moment().valueOf())
    setBalanceTrigger(moment().valueOf())

    const { chain } = { ...swap }
    getBalances(chain)
  }

  const getBalances = chain => dispatch({ type: GET_BALANCES_DATA, value: { chain } })

  const call = async () => {
    setCalculateSwapResponse(null)
    setApproving(null)
    setCalling(true)

    let success = false
    let failed = false
    if (sdk) {
      let { amount, origin } = { ...swap }
      origin = origin || 'x'
      const { chain_data, asset_data, contract_data, domainId, adopted, local, symbols } = { ...pair }
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

      const _decimals = (origin === 'x' ? x_asset_data : y_asset_data)?.decimals || 18
      const recv_decimals = (origin === 'x' ? y_asset_data : x_asset_data)?.decimals || 18

      let minDy = 0
      if (!isNumber(amount) || isZero(amount)) {
        failed = true
        setApproving(false)
      }
      else {
        minDy = numberToFixed(Number(amount) * Number(numberToFixed((100 - (isNumber(slippage) ? slippage : DEFAULT_PERCENT_SWAP_SLIPPAGE)) / 100, recv_decimals)), recv_decimals)
        amount = parseUnits(amount, _decimals)
      }
      minDy = parseUnits(minDy, recv_decimals)
      if (!failed) {
        try {
          const request = await sdk.sdkBase.approveIfNeeded(domainId, (origin === 'x' ? x_asset_data : y_asset_data)?.contract_address, amount, infiniteApprove)
          if (request) {
            setApproving(true)
            const response = await signer.sendTransaction(request)
            const { hash } = { ...response }
            setApproveResponse({
              status: 'pending',
              message: `Waiting for ${(origin === 'x' ? x_asset_data : y_asset_data)?.symbol} approval`,
              tx_hash: hash,
            })

            setApproveProcessing(true)
            const receipt = await signer.provider.waitForTransaction(hash)
            const { status } = { ...receipt }
            failed = !status
            setApproveResponse(!failed ? null : { status: 'failed', message: `Failed to approve ${(origin === 'x' ? x_asset_data : y_asset_data)?.symbol}`, tx_hash: hash })
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
        try {
          console.log('[/swap]', '[swap]', { domainId, contract_address, from: (origin === 'x' ? x_asset_data : y_asset_data)?.contract_address, to: (origin === 'x' ? y_asset_data : x_asset_data)?.contract_address, amount, minDy, deadline })
          const request = await sdk.sdkPool.swap(domainId, contract_address, (origin === 'x' ? x_asset_data : y_asset_data)?.contract_address, (origin === 'x' ? y_asset_data : x_asset_data)?.contract_address, amount, minDy, deadline)
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
            const receipt = await signer.provider.waitForTransaction(hash)
            const { status } = { ...receipt }
            failed = !status
            const _symbol = (origin === 'x' ? symbols : _.reverse(_.cloneDeep(symbols))).join('/')
            setCallResponse({
              status: failed ? 'failed' : 'success',
              message: failed ? `Failed to swap ${_symbol}` : `Swap ${_symbol} successful`,
              tx_hash: hash,
            })
            success = true
          }
        } catch (error) {
          const response = parseError(error)
          const { code } = { ...response }
          let { message } = { ...response }
          if (message?.includes('cannot estimate gas')) {
            message = 'Slippage exceeded. Please try increasing slippage tolerance and resubmitting your transfer.'
          }
          else if (message?.includes('dy < minDy')) {
            message = 'Exceeded slippage tolerance. Please increase tolerance and try again.'
          }
          switch (code) {
            case 'user_rejected':
              reset(code)
              break
            default:
              setCallResponse({ status: 'failed', ...response, message })
              break
          }
          failed = !success
        }
      }
    }

    setCallProcessing(false)
    setCalling(false)

    if (sdk && address && success) {
      await sleep(1 * 1000)
      setPairTrigger(moment().valueOf())
      setBalanceTrigger(moment().valueOf())
    }
  }

  const calculateSwap = async _pair => {
    setCalculateSwapResponse(null)
    if (_pair && isNumber(swap?.amount)) {
      let { amount, origin } = { ...swap }
      origin = origin || 'x'
      const { asset_data, contract_data, domainId, lpTokenAddress, adopted, local } = { ..._pair }
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

      if (Number(amount) <= 0) {
        setSwapAmount('0')
      }
      else {
        if (!(equalsIgnoreCase(domainId, pair?.domainId) && equalsIgnoreCase(lpTokenAddress, pair?.lpTokenAddress))) {
          setSwapAmount(true)
          setPriceImpact(true)
        }

        try {
          const _decimals = (origin === 'x' ? x_asset_data : y_asset_data)?.decimals || 18
          const recv_decimals = (origin === 'x' ? y_asset_data : x_asset_data)?.decimals || 18
          amount = parseUnits(amount, _decimals)
          calculateSwapPriceImpact(domainId, amount, (origin === 'x' ? x_asset_data : y_asset_data)?.contract_address, (origin === 'x' ? y_asset_data : x_asset_data)?.contract_address)

          console.log('[/swap]', '[getPoolTokenIndex]', { domainId, contract_address, tokenAddress: (origin === 'x' ? x_asset_data : y_asset_data)?.contract_address })
          const tokenIndexFrom = await sdk.sdkPool.getPoolTokenIndex(domainId, contract_address, (origin === 'x' ? x_asset_data : y_asset_data)?.contract_address)
          console.log('[/swap]', '[getPoolTokenIndex]', { domainId, contract_address, tokenAddress: (origin === 'x' ? y_asset_data : x_asset_data)?.contract_address })
          const tokenIndexTo = await sdk.sdkPool.getPoolTokenIndex(domainId, contract_address, (origin === 'x' ? y_asset_data : x_asset_data)?.contract_address)

          console.log('[/swap]', '[calculateSwap]', { domainId, contract_address, tokenIndexFrom, tokenIndexTo, amount })
          const _amount = await sdk.sdkPool.calculateSwap(domainId, contract_address, tokenIndexFrom, tokenIndexTo, amount)
          console.log('[/swap]', '[amountToReceive]', { domainId, contract_address, tokenIndexFrom, tokenIndexTo, amount: _amount })
          setSwapAmount(formatUnits(_amount, recv_decimals))
        } catch (error) {
          const response = parseError(error)
          console.log('[/swap]', '[calculateSwap]', error)
          setCalculateSwapResponse({ status: 'failed', ...response })
          setSwapAmount(null)
        }
      }
    }
    else {
      setSwapAmount(null)
      setPriceImpact(null)
    }
  }

  const calculateSwapPriceImpact = async (domainId, amount, x_contract_address, y_contract_address) => {
    console.log('[/swap]', '[calculateSwapPriceImpact]', { domainId, amount, x_contract_address, y_contract_address })
    const priceImpact = await sdk.sdkPool.calculateSwapPriceImpact(domainId, amount, x_contract_address, y_contract_address)
    console.log('[/swap]', '[swapPriceImpact]', { domainId, amount, x_contract_address, y_contract_address, priceImpact })
    setPriceImpact(formatUnits(priceImpact) * 100)
  }

  const { chain, asset, amount } = { ...swap }
  let { origin } = { ...swap }
  origin = origin || 'x'
  const chain_data = getChainData(chain, chains_data)
  const { chain_id, name, image, explorer, color } = { ...chain_data }
  const { url, transaction_path } = { ...explorer }
  const { slippage } = { ...options }
  const { asset_data, contract_data, adopted, local, rate } = { ...pair }
  const { contract_address } = { ...contract_data }

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

  const _decimals = (origin === 'x' ? x_asset_data : y_asset_data)?.decimals || 18
  const x_balance_amount = x_asset_data && getBalanceData(chain_id, x_asset_data.contract_address, balances_data)?.amount
  const y_balance_amount = y_asset_data && getBalanceData(chain_id, y_asset_data.contract_address, balances_data)?.amount

  const valid_amount = isNumber(amount) && !isZero(amount) && BigInt(parseUnits(amount, _decimals)) <= BigInt(parseUnits(origin === 'x' ? x_balance_amount : y_balance_amount, _decimals))
  const disabled = swapAmount === true || approving || calling
  const response = callResponse || approveResponse || calculateSwapResponse
  const wrong_chain = chain_data && wallet_chain_id !== chain_id && !callResponse
  const is_walletconnect = ethereum_provider?.constructor?.name === 'WalletConnectProvider'
  const boxShadow = color && `${color}${theme === 'light' ? '44' : '33'} 0px 16px 128px 64px`

  return (
    <div className="children grid grid-cols-1 lg:grid-cols-8 items-start gap-4 my-4 3xl:mt-24">
      <div className="hidden lg:block col-span-0 lg:col-span-2" />
      <div className="col-span-1 lg:col-span-4 flex flex-col items-center justify-center my-4 sm:my-6 mx-1 sm:mx-4">
        <div
          className="w-full max-w-md 3xl:max-w-xl bg-white dark:bg-slate-900 rounded border dark:border-slate-700 space-y-8 3xl:space-y-10 pt-5 sm:pt-6 3xl:pt-8 pb-6 sm:pb-7 3xl:pb-10 px-4 sm:px-6 3xl:px-8"
          style={chain && boxShadow ? { boxShadow, WebkitBoxShadow: boxShadow, MozBoxShadow: boxShadow } : undefined}
        >
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center">
              <h1 className="text-xl 3xl:text-2xl font-semibold">
                Swap on
              </h1>
              <SelectChain
                value={chain || getChainData(undefined, chains_data, { must_have_pools: true, get_head: true })?.id}
                onSelect={c => setSwap({ ...swap, chain: c })}
                isPool={true}
                className="w-fit flex items-center justify-center space-x-1.5 sm:space-x-2 mt-0.25 3xl:mt-0"
              />
            </div>
            <Options
              disabled={disabled}
              applied={!_.isEqual(Object.fromEntries(Object.entries(options).filter(([k, v]) => !['slippage'].includes(k))), Object.fromEntries(Object.entries(DEFAULT_OPTIONS).filter(([k, v]) => !['slippage'].includes(k))))}
              initialData={options}
              onChange={o => setOptions(o)}
            />
          </div>
          <div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between space-x-2">
                <span className="text-slate-600 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                  Pay with
                </span>
                {chain_data && asset && (origin === 'x' ? x_asset_data : y_asset_data) && (
                  <div className="flex items-center space-x-1">
                    <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                      Balance:
                    </div>
                    <button
                      disabled={disabled}
                      onClick={
                        () => {
                          const amount = origin === 'x' ? x_balance_amount : y_balance_amount
                          if (isNumber(amount)) {
                            setSwap({ ...swap, amount })
                            setSwapAmount(true)
                          }
                        }
                      }
                    >
                      <Balance
                        chainId={chain_id}
                        asset={asset}
                        contractAddress={(origin === 'x' ? x_asset_data : y_asset_data).contract_address}
                        decimals={(origin === 'x' ? x_asset_data : y_asset_data).decimals}
                        symbol={(origin === 'x' ? x_asset_data : y_asset_data).symbol}
                        trigger={balanceTrigger}
                      />
                    </button>
                  </div>
                )}
              </div>
              <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-700 py-2.5 px-3">
                <div className="flex items-center justify-between space-x-2">
                  <SelectAsset
                    disabled={disabled}
                    value={asset}
                    onSelect={
                      (a, c) => {
                        setSwap({ ...swap, asset: a, amount: null, origin: [x_asset_data?.contract_address, y_asset_data?.contract_address].findIndex(_c => equalsIgnoreCase(_c, c)) > -1 ? origin === 'x' ? equalsIgnoreCase(c, y_asset_data?.contract_address) ? 'y' : origin : equalsIgnoreCase(c, x_asset_data?.contract_address) ? 'x' : origin : origin })
                        getBalances(chain)
                      }
                    }
                    chain={chain}
                    isPool={true}
                    data={origin === 'x' ? x_asset_data : y_asset_data}
                  />
                  <DebounceInput
                    debounceTimeout={750}
                    size="small"
                    type="number"
                    placeholder="0.00"
                    disabled={(disabled && swapAmount !== true) || !asset || !pair}
                    value={isNumber(amount) ? amount : ''}
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
                          value = numberToFixed(value, _decimals)
                        }
                        setSwap({ ...swap, amount: value })
                        setSwapAmount(true)
                      }
                    }
                    onWheel={e => e.target.blur()}
                    onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                    className={`w-36 sm:w-48 bg-transparent ${disabled ? 'cursor-not-allowed' : ''} rounded border-0 focus:ring-0 sm:text-lg 3xl:text-2xl font-semibold text-right py-1.5 3xl:py-3`}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center mt-2 3xl:mt-4 mb-0.5 3xl:mb-2">
              <button
                disabled={disabled || !pair}
                onClick={
                  () => {
                    if (!disabled) {
                      setSwap({ ...swap, origin: origin === 'x' ? 'y' : 'x', amount: null })
                      setSwapAmount(null)
                      setButtonDirection(buttonDirection * -1)
                      getBalances(chain)
                    }
                  }
                }
                className={`bg-slate-100 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 ${disabled ? 'cursor-not-allowed' : ''} rounded-full sm:border dark:border-slate-800 flex items-center justify-center p-1.5 sm:p-4`}
              >
                <HiSwitchVertical size={28} style={buttonDirection < 0 ? { transform: 'scaleX(-1)' } : undefined} />
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between space-x-2">
                <span className="text-slate-600 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                  You Receive
                </span>
                {chain_data && asset && (origin === 'x' ? y_asset_data : x_asset_data) && (
                  <div className="flex items-center space-x-1">
                    <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                      Balance:
                    </div>
                    <button disabled={disabled} className="cursor-default">
                      <Balance
                        chainId={chain_id}
                        asset={asset}
                        contractAddress={(origin === 'x' ? y_asset_data : x_asset_data).contract_address}
                        decimals={(origin === 'x' ? y_asset_data : x_asset_data).decimals}
                        symbol={(origin === 'x' ? y_asset_data : x_asset_data).symbol}
                        trigger={balanceTrigger}
                      />
                    </button>
                  </div>
                )}
              </div>
              <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-800 py-2.5 px-3">
                <div className="flex items-center justify-between space-x-2">
                  <SelectAsset
                    disabled={disabled}
                    value={asset}
                    onSelect={
                      (a, c) => {
                        setSwap({ ...swap, asset: a, amount: null, origin: [x_asset_data?.contract_address, y_asset_data?.contract_address].findIndex(_c => equalsIgnoreCase(_c, c)) > -1 ? origin === 'x' ? equalsIgnoreCase(c, x_asset_data?.contract_address) ? 'y' : origin : equalsIgnoreCase(c, y_asset_data?.contract_address) ? 'x' : origin : origin })
                        getBalances(chain)
                      }
                    }
                    chain={chain}
                    isPool={true}
                    data={origin === 'x' ? y_asset_data : x_asset_data}
                  />
                  {swapAmount === true ?
                    <div className="w-36 sm:w-48 flex items-center justify-end py-1.5">
                      <div><Spinner width={20} height={20} /></div>
                    </div> :
                    <NumberDisplay
                      value={isNumber(swapAmount) && Number(swapAmount) >= 0 ? swapAmount : '0.00'}
                      className={`w-36 sm:w-48 bg-transparent ${isNumber(amount) && !isZero(amount) ? '' : 'text-slate-500 dark:text-slate-500'} sm:text-lg 3xl:text-2xl font-semibold text-right py-1.5`}
                    />
                  }
                </div>
              </div>
            </div>
          </div>
          {chain && asset && pair && !pair.error && Number(amount) > 0 && (
            <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-700 space-y-2.5 py-3.5 px-3">
              <div className="flex items-center justify-between space-x-1">
                <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                  Rate
                </div>
                <NumberDisplay
                  value={rate}
                  noTooltip={true}
                  className="whitespace-nowrap text-sm 3xl:text-xl font-semibold"
                />
              </div>
              <div className="flex flex-col space-y-0.5">
                <div className="flex items-start justify-between space-x-1">
                  <Tooltip content="The maximum percentage you are willing to lose due to market changes.">
                    <div className="flex items-center">
                      <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                        Slippage Tolerance
                      </div>
                      <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                    </div>
                  </Tooltip>
                  <div className="flex flex-col sm:items-end space-y-1.5">
                    {slippageEditing ?
                      <>
                        <div className="flex items-center justify-end space-x-1.5">
                          <DebounceInput
                            debounceTimeout={750}
                            size="small"
                            type="number"
                            placeholder="0.00"
                            value={isNumber(slippage) ? slippage : ''}
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
                                value = value <= 0 ? 0.01 : value > 100 ? DEFAULT_PERCENT_SWAP_SLIPPAGE : value
                                setOptions({ ...options, slippage: isNumber(value) ? parseFloat(numberToFixed(value, 2)) : value })
                              }
                            }
                            onWheel={e => e.target.blur()}
                            onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                            className="w-20 bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 rounded border-0 focus:ring-0 text-sm 3xl:text-xl font-semibold text-right py-1 px-2"
                          />
                          <button
                            onClick={() => setSlippageEditing(false)}
                            className="bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white"
                          >
                            <BiCheckCircle size={16} className="3xl:w-5 3xl:h-5" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-1.5 -mr-1.5">
                          {[3.0, 1.0, 0.5].map((s, i) => (
                            <div
                              key={i}
                              onClick={
                                () => {
                                  setOptions({ ...options, slippage: s })
                                  setSlippageEditing(false)
                                }
                              }
                              className={`${slippage === s ? 'bg-slate-200 dark:bg-slate-700 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium hover:font-semibold'} rounded cursor-pointer text-xs 3xl:text-xl py-1 px-1.5`}
                            >
                              {s} %
                            </div>
                          ))}
                        </div>
                      </> :
                      <div className="flex items-center space-x-1.5">
                        <NumberDisplay
                          value={slippage}
                          suffix="%"
                          className="whitespace-nowrap text-sm 3xl:text-xl font-semibold"
                        />
                        <button
                          disabled={disabled}
                          onClick={
                            () => {
                              if (!disabled) {
                                setSlippageEditing(true)
                              }
                            }
                          }
                          className="rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white mt-0.5"
                        >
                          <BiEditAlt size={16} className="3xl:w-5 3xl:h-5" />
                        </button>
                      </div>
                    }
                  </div>
                </div>
                <WarningSlippage value={slippage} />
              </div>
              {isNumber(priceImpact) && (
                <div className="flex items-center justify-between space-x-1">
                  <Tooltip content="Price impact">
                    <div className="flex items-center">
                      <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm 3xl:text-xl font-medium">
                        Price Impact
                      </div>
                      <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                    </div>
                  </Tooltip>
                  <NumberDisplay
                    value={priceImpact}
                    suffix="%"
                    noTooltip={true}
                    className="whitespace-nowrap text-sm 3xl:text-xl font-semibold"
                  />
                </div>
              )}
            </div>
          )}
          {provider && wrong_chain ?
            <Wallet
              connectChainId={chain_id}
              className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base 3xl:text-2xl font-medium space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
            >
              <span>{is_walletconnect ? 'Reconnect' : 'Switch'} to</span>
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
            chain && asset && isNumber(origin === 'x' ? x_balance_amount : y_balance_amount) && (isNumber(amount) || provider) ?
              !calling && !callResponse && isNumber(amount) && (Number(amount) < 0 || !valid_amount) ?
                <Alert status="failed" closeDisabled={true}>
                  <span>{Number(amount) < 0 ? 'The amount cannot be equal to or less than 0.' : 'Insufficient Balance'}</span>
                </Alert> :
                !(callResponse || calculateSwapResponse) ?
                  <button
                    disabled={disabled || !pair || !valid_amount}
                    onClick={
                      () => {
                        setSlippageEditing(false)
                        call()
                      }
                    }
                    className={`w-full ${disabled || !pair || !valid_amount ? calling || approving ? 'bg-blue-400 dark:bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded text-base 3xl:text-2xl text-center py-3 sm:py-4 px-2 sm:px-3`}
                  >
                    <span className="flex items-center justify-center space-x-1.5">
                      {disabled && <div><Spinner width={20} height={20} color="white" /></div>}
                      <span>
                        {calling ?
                          approving ?
                            approveProcessing ? 'Approving' : 'Please Approve' :
                            callProcessing ?
                              'Swapping' :
                              typeof approving === 'boolean' ? 'Please Confirm' : 'Checking Approval' :
                          swapAmount === true ?
                            'Calculating' :
                            isNumber(amount) && !isZero(amount) ? 'Swap' : 'Enter amount'
                        }
                      </span>
                    </span>
                  </button> :
                  toArray(response).map((d, i) => {
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
                            <Spinner name="Watch" width={20} height={20} color="white" />
                          </div>
                        )}
                        closeDisabled={true}
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
                            {status === 'failed' && message && !calculateSwapResponse && <Copy value={message} className="cursor-pointer text-slate-200 hover:text-white" />}
                            {closeButton}
                          </div>
                        </div>
                      </Alert>
                    )
                  }) :
              provider ?
                <button disabled={true} className="w-full bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed rounded text-slate-400 dark:text-slate-500 text-base 3xl:text-2xl text-center py-3 sm:py-4 px-2 sm:px-3">
                  <span className="flex items-center justify-center space-x-1.5">
                    {!asset ?
                      'Swap' :
                      pair === undefined ?
                        `Route doesn't exist` :
                        pair ?
                          pair.error ?
                            <div className="max-w-fit break-words text-red-600 dark:text-red-400 text-sm text-left">
                              {pair.error.message}
                            </div> :
                            'Enter amount' :
                          <>
                            <div><Spinner width={20} height={20} /></div>
                            <span>Fetching pair information ...</span>
                          </>
                    }
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
      </div>
    </div>
  )
}
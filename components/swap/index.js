import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, Contract, FixedNumber, constants, utils } from 'ethers'
import { TailSpin, Watch } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { TiArrowRight } from 'react-icons/ti'
import { MdSwapVert, MdClose } from 'react-icons/md'
import { BiMessageError, BiMessageCheck, BiMessageDetail, BiEditAlt, BiCheckCircle } from 'react-icons/bi'

import Announcement from '../announcement'
import Options from './options'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import Info from './info'
import Balance from '../balance'
import Image from '../image'
import Wallet from '../wallet'
import Alert from '../alerts'
import Copy from '../copy'
import { chainName } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { params_to_obj, number_format, ellipse, equals_ignore_case, sleep } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

const GAS_LIMIT_ADJUSTMENT = Number(process.env.NEXT_PUBLIC_GAS_LIMIT_ADJUSTMENT) || 1
const DEFAULT_SWAP_SLIPPAGE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_DEFAULT_SWAP_SLIPPAGE_PERCENTAGE) || 3
const DEFAULT_OPTIONS = {
  infiniteApprove: false,
  slippage: DEFAULT_SWAP_SLIPPAGE_PERCENTAGE,
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
  const { chain_id, provider, web3_provider, address, signer } = { ...wallet_data }
  const { balances_data } = { ...balances }

  const router = useRouter()
  const { asPath } = { ...router }

  const [swap, setSwap] = useState({})
  const [swapAmount, setSwapAmount] = useState(null)
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [controller, setController] = useState(null)

  const [approving, setApproving] = useState(null)
  const [approveProcessing, setApproveProcessing] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [calling, setCalling] = useState(null)
  const [callProcessing, setCallProcessing] = useState(null)
  const [callResponse, setCallResponse] = useState(null)

  const [pair, setPair] = useState(null)
  const [pairTrigger, setPairTrigger] = useState(null)

  // get swap from path
  useEffect(() => {
    let updated = false
    const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
    let path = !asPath ? '/' : asPath.toLowerCase()
    path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path
    if (path.includes('on-')) {
      const paths = path.replace('/swap/', '').split('-')
      const chain = paths[paths.indexOf('on') + 1]
      const chain_data = chains_data?.find(c => c?.id === chain)
      const asset = paths[0] !== 'on' ? paths[0] : null
      const asset_data = pool_assets_data?.find(a => a?.id === asset || equals_ignore_case(a?.symbol, asset))
      if (chain_data) {
        swap.chain = chain
        updated = true
      }
      if (asset_data) {
        swap.asset = asset
        updated = true
      }
      if (params?.amount) {
        swap.amount = Number(params.amount)
        updated = true
      }
    }
    if (updated) {
      setSwap(swap)
      // setPairTrigger(moment().valueOf())
    }
  }, [asPath, chains_data, pool_assets_data])

  // set swap to path
  useEffect(() => {
    const params = {}
    if (swap) {
      const {
        chain,
        asset,
        amount,
      } = { ...swap }
      if (chains_data?.findIndex(c => !c?.disabled && c?.id === chain) > -1) {
        params.chain = chain
        if (asset && pool_assets_data?.findIndex(a => a?.id === asset && a.contracts?.findIndex(c => c?.chain_id === chains_data.find(_c => _c?.id === chain)?.chain_id) > -1) > -1) {
          params.asset = asset
        }
      }
      if (params.chain && params.asset && amount) {
        params.amount = amount
      }
    }
    if (Object.keys(params).length > 0) {
      const {
        chain,
        asset,
        amount,
      } = { ...params }
      delete params.chain
      delete params.asset
      router.push(`/swap/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`, undefined, { shallow: true })
    }
    setApproveResponse(null)
    setCallResponse(null)
  }, [address, swap])

  // update balances
  useEffect(() => {
    const {
      chain,
    } = { ...swap }
    const _chain = chains_data?.find(c => c?.chain_id === chain_id)?.id
    if (asPath && _chain && !chain) {
      const params = params_to_obj(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      if (!params?.chain && !asPath.includes('on-') && chains_data?.findIndex(c => !c?.disabled && c?.id === _chain) > -1) {
        setSwap({
          ...swap,
          chain: _chain,
        })
      }
      getBalances(_chain)
    }
  }, [asPath, chain_id, chains_data])

  // update balances
  useEffect(() => {
    dispatch({
      type: BALANCES_DATA,
      value: null,
    })
    if (address) {
      const {
        chain,
      } = { ...swap }
      getBalances(chain)
    }
    else {
      reset('address')
    }
  }, [address])

  // update balances
  useEffect(() => {
    const getData = () => {
      if (address && !calling && !['pending'].includes(approveResponse?.status)) {
        const {
          chain,
        } = { ...swap }
        getBalances(chain)
      }
    }
    getData()
    const interval = setInterval(() => getData(), 0.25 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [rpcs])

  // update balances
  useEffect(() => {
    if (pools_data) {
      const chains = _.uniq(pools_data.map(p => p?.chain_data?.id).filter(c => c))
      chains.forEach(c => getBalances(c))
    }
  }, [pools_data])

  // get pair
  useEffect(() => {
    const getData = async () => {
      if (sdk && address && swap?.chain) {
        try {
          if (pair === undefined) {
            setPair(null)
          }
          const {
            chain,
            asset,
            amount,
          } = { ...swap }

          if (typeof amount === 'number') {
            setSwapAmount(true)
          }
          else if (typeof swapAmount === 'number') {
            setSwapAmount(null)
          }

          const chain_data = chains_data.find(c => c?.id === chain)
          const {
            chain_id,
            domain_id,
          } = { ...chain_data }
          const asset_data = pool_assets_data.find(a => a?.id === asset)
          const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_id)
          const {
            contract_address,
          } = { ...contract_data }
          const pool = await sdk.nxtpSdkPool.getPool(
            domain_id,
            contract_address,
          )

          const canonicals = pool &&
            await sdk.nxtpSdkPool.getCanonicalFromLocal(
              domain_id,
              contract_address,
            )

          const canonicalDomain = canonicals?.[0],
            canonicalId = canonicals?.[1]

          const rate = pool && await sdk.nxtpSdkPool.getVirtualPrice(
            domain_id,
            canonicalId,
          )

         let _pair = (pool ?
            [pool].map(p => {
              const {
                symbol,
              } = { ...p }
              const symbols = symbol?.split('-') || []
              const asset_data = pool_assets_data.find(a => symbols.findIndex(s => equals_ignore_case(s, a?.symbol)) > -1 || a?.contracts?.findIndex(c => c?.chain_id === chain_id && symbols.findIndex(s => equals_ignore_case(s, c?.symbol)) > -1) > -1)
              return {
                ...p,
                chain_data,
                asset_data,
                symbols,
              }
            }) :
            [pair] || []
          ).find(p => equals_ignore_case(p?.domainId, domain_id) && equals_ignore_case(p?.asset_data?.id, asset))

          _pair = _pair && {
            ..._pair,
            contract_data,
            rate: Number(utils.formatUnits(BigNumber.from(rate || '0'), _.last(_pair.decimals) || 18)),
          }

          setPair(_pair)
          calculateSwap(_pair)
        } catch (error) {
          setPair(undefined)
          calculateSwap(null)
        }
      }
    }
    getData()
  }, [sdk, address, swap, pairTrigger])

  const getBalances = chain => {
    const getBalance = async (chain_id, contract_data) => {
      const {
        contract_address,
        decimals,
      } = { ...contract_data }
      const rpc = rpcs?.[chain_id]
      let balance
      if (rpc && contract_address) {
        if (contract_address === constants.AddressZero) {
          balance = await rpc.getBalance(address)
        }
        else {
          const contract = new Contract(contract_address, ['function balanceOf(address owner) view returns (uint256)'], rpc)
          balance = await contract.balanceOf(address)
        }
      }
      dispatch({
        type: BALANCES_DATA,
        value: {
          [`${chain_id}`]: [{
            ...contract_data,
            amount: balance && Number(utils.formatUnits(balance, decimals || 18)),
          }],
        },
      })
    }
    const {
      chain_id,
      domain_id,
    } = { ...chains_data?.find(c => c?.id === chain) }
    const contracts = _.uniqBy(_.concat(
      pool_assets_data?.map(a => {
        return {
          ...a,
          ...a?.contracts?.find(c => c?.chain_id === chain_id),
        }
      }) || [],
      pools_data?.filter(p => equals_ignore_case(p?.domainId, domain_id)).flatMap(p => p?.tokens?.map((t, i) => {
        return {
          chain_id,
          contract_address: t,
          decimals: p.decimals?.[i],
          symbol: p.symbols?.[i],
        }
      }) || []) || [],
    ).filter(a => a?.contract_address).map(a => {
      const {
        contract_address,
      } = {  ...a }
      return {
        ...a,
        contract_address: contract_address.toLowerCase(),
      }
    }), 'contract_address')
    contracts.forEach(c => getBalance(chain_id, c))
  }

  const reset = async origin => {
    const reset_swap = origin !== 'address'
    if (reset_swap) {
      setSwap({
        ...swap,
        amount: null,
      })
    }
    setOptions(DEFAULT_OPTIONS)

    setApproving(null)
    setApproveProcessing(null)
    setApproveResponse(null)

    setCalling(null)
    setCallProcessing(null)
    setCallResponse(null)

    setPairTrigger(moment().valueOf())

    const {
      chain,
    } = { ...swap }
    getBalances(chain)
  }

  const call = async () => {
    setApproving(null)
    setCalling(true)
    let success = false
    if (sdk) {
      let {
        amount,
        origin,
      } = { ...swap }
      origin = origin || 'x'

      const {
        chain_data,
        asset_data,
        contract_data,
        domainId,
        tokens,
        decimals,
        symbol,
        symbols,
      } = { ...pair }
      const x_asset_data = tokens?.[0] && {
        ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
        ...(
          equals_ignore_case(tokens[0], contract_data?.contract_address) ?
            contract_data :
            {
              chain_id,
              contract_address: tokens[0],
              decimals: decimals?.[0],
              symbol: symbols?.[0],
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
              symbol: symbols?.[1],
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
      if (!(amount)) {
        failed = true
        setApproving(false)
      }
      else {
        amount = utils.parseUnits(amount.toString(), (origin === 'x' ? x_asset_data : y_asset_data)?.decimals || 18).toString()
      }
      const minDy = 0
      if (!failed) {
        try {
          const approve_request = await sdk.nxtpSdkBase.approveIfNeeded(
            domainId,
            (origin === 'x' ? x_asset_data : y_asset_data)?.contract_address,
            amount,
            infiniteApprove,
          )
          if (approve_request) {
            setApproving(true)
            const approve_response = await signer.sendTransaction(approve_request)
            const tx_hash = approve_response?.hash
            setApproveResponse({
              status: 'pending',
              message: `Wait for ${(origin === 'x' ? x_asset_data : y_asset_data)?.symbol} approval`,
              tx_hash,
            })
            setApproveProcessing(true)
            const approve_receipt = await signer.provider.waitForTransaction(tx_hash)
            setApproveResponse(approve_receipt?.status ?
              null : {
                status: 'failed',
                message: `Failed to approve ${(origin === 'x' ? x_asset_data : y_asset_data)?.symbol}`,
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
      if (!failed) {
        try {
          console.log('[getCanonicalFromLocal]', {
            domainId,
            tokenAddress: contract_data?.contract_address,
          })

          const canonicals = await sdk.nxtpSdkPool.getCanonicalFromLocal(
            domainId,
            contract_data?.contract_address,
          )

          const canonicalDomain = canonicals?.[0],
            canonicalId = canonicals?.[1]

          console.log('[Swap]', {
            domainId,
            canonicalId,
            from: (origin === 'x' ? x_asset_data : y_asset_data)?.contract_address,
            to: (origin === 'x' ? y_asset_data : x_asset_data)?.contract_address,
            amount,
            minDy,
            deadline,
          })

          const swap_request = await sdk.nxtpSdkPool.swap(
            domainId,
            canonicalId,
            (origin === 'x' ? x_asset_data : y_asset_data)?.contract_address,
            (origin === 'x' ? y_asset_data : x_asset_data)?.contract_address,
            amount,
            minDy,
            deadline,
          )

          if (swap_request) {
            let gasLimit = await signer.estimateGas(swap_request)
            if (gasLimit) {
              gasLimit = FixedNumber.fromString(gasLimit.toString())
                .mulUnsafe(FixedNumber.fromString(GAS_LIMIT_ADJUSTMENT.toString()))
                .round(0).toString().replace('.0', '')
              swap_request.gasLimit = gasLimit
            }
            const swap_response = await signer.sendTransaction(swap_request)
            const tx_hash = swap_response?.hash
            setCallProcessing(true)
            const swap_receipt = await signer.provider.waitForTransaction(tx_hash)
            failed = !swap_receipt?.status
            const _symbol = (origin === 'x' ? symbols : _.reverse(_.cloneDeep(symbols))).join('/')
            setCallResponse({
              status: failed ? 'failed' : 'success',
              message: failed ? `Failed to swap ${_symbol}` : `Swap ${_symbol} successful`,
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
    }
    setCallProcessing(false)
    setCalling(false)
    if (sdk && address && success) {
      await sleep(1 * 1000)
      setPairTrigger(moment().valueOf())
    }
  }

  const calculateSwap = async _pair => {
    if (_pair && typeof swap?.amount === 'number') {
      if (swap.amount <= 0) {
        setSwapAmount(0)
      }
      else {
        let {
          amount,
          origin,
        } = { ...swap }
        origin = origin || 'x'
        const {
          asset_data,
          contract_data,
          domainId,
          lpTokenAddress,
          tokens,
          decimals,
          symbols,
        } = { ..._pair }
        const x_asset_data = tokens?.[0] && {
          ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
          ...(
            equals_ignore_case(tokens[0], contract_data?.contract_address) ?
              contract_data :
              {
                chain_id,
                contract_address: tokens[0],
                decimals: decimals?.[0],
                symbol: symbols?.[0],
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
                symbol: symbols?.[1],
              }
          ),
        }

        if (!(equals_ignore_case(domainId, pair?.domainId) && equals_ignore_case(lpTokenAddress, pair?.lpTokenAddress))) {
          setSwapAmount(true)
        }

        try {
          console.log('[getCanonicalFromLocal]', {
            domainId,
            tokenAddress: contract_data?.contract_address,
          })

          const canonicals = await sdk.nxtpSdkPool.getCanonicalFromLocal(
            domainId,
            contract_data?.contract_address,
          )

          const canonicalDomain = canonicals?.[0],
            canonicalId = canonicals?.[1]

          console.log('[getPoolTokenIndex]', {
            domainId,
            canonicalId,
            tokenAddress: (origin === 'x' ? x_asset_data : y_asset_data)?.contract_address,
          })

          const tokenIndexFrom = await sdk.nxtpSdkPool.getPoolTokenIndex(
            domainId,
            canonicalId,
            (origin === 'x' ? x_asset_data : y_asset_data)?.contract_address,
          )

          console.log('[getPoolTokenIndex]', {
            domainId,
            canonicalId,
            tokenAddress: (origin === 'x' ? y_asset_data : x_asset_data)?.contract_address,
          })

          const tokenIndexTo = await sdk.nxtpSdkPool.getPoolTokenIndex(
            domainId,
            canonicalId,
            (origin === 'x' ? y_asset_data : x_asset_data)?.contract_address,
          )
 
          amount = utils.parseUnits(amount.toString(), (origin === 'x' ? x_asset_data : y_asset_data)?.decimals || 18).toString()
 
          console.log('[calculateSwap]', {
            domainId,
            canonicalId,
            tokenIndexFrom,
            tokenIndexTo,
            amount,
          })
 
          const _amount = await sdk.nxtpSdkPool.calculateSwap(
            domainId,
            canonicalId,
            tokenIndexFrom,
            tokenIndexTo,
            amount,
          )
 
          setSwapAmount(Number(utils.formatUnits(BigNumber.from(_amount || '0'), (origin === 'x' ? y_asset_data : x_asset_data)?.decimals || 18)))
        } catch (error) {
          setSwapAmount(null)
        }
      }
    }
    else {
      setSwapAmount(null)
    }
  }

  const {
    chain,
    asset,
    amount,
  } = { ...swap }
  let {
    origin,
  } = { ...swap }
  origin = origin || 'x'
  const chain_data = chains_data?.find(c => c?.id === chain)
  const _chain_id = chain_data?.chain_id

  const {
    slippage,
  } = { ...options }

  const {
    asset_data,
    contract_data,
    tokens,
    decimals,
    symbol,
    symbols,
  } = { ...pair }
  const x_asset_data = tokens?.[0] && {
    ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
    ...(
      equals_ignore_case(tokens[0], contract_data?.contract_address) ?
        contract_data :
        {
          chain_id: _chain_id,
          contract_address: tokens[0],
          decimals: decimals?.[0],
          symbol: symbols?.[0],
        }
    ),
  }
  const x_balance = x_asset_data && balances_data?.[_chain_id]?.find(b => equals_ignore_case(b?.contract_address, x_asset_data.contract_address))
  const x_balance_amount = x_balance && Number(x_balance.amount)
  const y_asset_data = tokens?.[1] && {
    ...Object.fromEntries(Object.entries({ ...asset_data }).filter(([k, v]) => !['contracts'].includes(k))),
    ...(
      equals_ignore_case(tokens[1], contract_data?.contract_address) ?
        contract_data :
        {
          chain_id: _chain_id,
          contract_address: tokens[1],
          decimals: decimals?.[1],
          symbol: symbols?.[1],
        }
    ),
  }
  const y_balance = y_asset_data && balances_data?.[_chain_id]?.find(b => equals_ignore_case(b?.contract_address, y_asset_data.contract_address))
  const y_balance_amount = y_balance && Number(y_balance.amount)

  const valid_amount = amount && amount <= (origin === 'x' ? x_balance_amount : y_balance_amount)

  const wrong_chain = chain_data && chain_id !== _chain_id && !callResponse
  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  const disabled = calling || approving

  return (
    <div className="mb-4">
      <div className="flex justify-center">
        <div className="mt-4 sm:mt-8">
          <Announcement />
        </div>
        <div className="w-full flex flex-col space-y-4 my-2 sm:my-4 mx-1 sm:mx-4">
          <div className="flex items-center justify-between space-x-2">
            <h1 className="text-2xl font-bold">
              Swap
            </h1>
            <Options
              disabled={disabled}
              applied={!_.isEqual(
                Object.fromEntries(Object.entries(options).filter(([k, v]) => ![].includes(k))),
                Object.fromEntries(Object.entries(DEFAULT_OPTIONS).filter(([k, v]) => ![].includes(k))),
              )}
              initialData={options}
              onChange={o => setOptions(o)}
            />
          </div>
          <div className={`${valid_amount ? 'border-2 border-blue-400 dark:border-blue-800 shadow-xl shadow-blue-200 dark:shadow-blue-600' : 'shadow dark:shadow-slate-400'} rounded-2xl flex flex-col items-center space-y-6 py-8 px-6`}>
            <div className="w-full space-y-5">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 sm:space-y-0 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 dark:text-slate-600 text-sm font-bold">
                    From
                  </span>
                  {web3_provider && (origin === 'x' ? x_asset_data : y_asset_data) && (
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        Balance:
                      </span>
                      <Balance
                        chainId={_chain_id}
                        asset={asset}
                        contractAddress={(origin === 'x' ? x_asset_data : y_asset_data).contract_address}
                        symbol={(origin === 'x' ? x_asset_data : y_asset_data).symbol}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="w-full flex items-center justify-between sm:justify-start space-x-2 sm:space-x-4">
                    <SelectChain
                      disabled={disabled}
                      value={chain}
                      onSelect={c => {
                        console.log('[Swap]', {
                          swap: {
                            ...swap,
                            chain: c,
                            amount: null,
                          },
                        })

                        setSwap({
                          ...swap,
                          chain: c,
                          amount: null,
                        })

                        getBalances(c)
                      }}
                      origin=""
                    />
                    <SelectAsset
                      disabled={disabled}
                      value={asset}
                      onSelect={a => {
                        console.log('[Swap]', {
                          swap: {
                            ...swap,
                            asset: a,
                            amount: null,
                          },
                        })

                        setSwap({
                          ...swap,
                          asset: a,
                          amount: null,
                        })

                        getBalances(chain)
                      }}
                      chain={chain}
                      origin=""
                      is_pool={true}
                      data={origin === 'x' ? x_asset_data : y_asset_data}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="w-full flex items-center justify-between space-x-3">
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

                          console.log('[Swap]', {
                            swap: {
                              ...swap,
                              amount: value && !isNaN(value) ? Number(value) : value,
                            },
                          })

                          setSwap({
                            ...swap,
                            amount: value && !isNaN(value) ? Number(value) : value,
                          })
                        }}
                        onWheel={e => e.target.blur()}
                        onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                        className={`w-full bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl text-lg font-semibold text-right py-2 px-3`}
                      />
                      <div
                        onClick={() => {
                          console.log('[Swap]', {
                            swap: {
                              ...swap,
                              amount: origin === 'x' ? x_balance_amount : y_balance_amount,
                            },
                          })

                          setSwap({
                            ...swap,
                            amount: origin === 'x' ? x_balance_amount : y_balance_amount,
                          })
                        }}
                        className={`${disabled || typeof (origin === 'x' ? x_balance_amount : y_balance_amount) !== 'number' ? 'pointer-events-none cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-white cursor-pointer'} bg-slate-100 dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-500 text-blue-400 dark:text-slate-200 text-base font-semibold py-0.5 px-2.5`}
                      >
                        Max
                      </div>
                    </div>
                    {typeof amount === 'number' && typeof (origin === 'x' ? x_balance_amount : y_balance_amount) === 'number' && amount > (origin === 'x' ? x_balance_amount : y_balance_amount) && (
                      <div className="flex items-center text-red-600 dark:text-yellow-400 space-x-1 sm:mx-2">
                        <BiMessageError
                          size={16}
                          className="min-w-max"
                        />
                        <span className="text-xs font-medium">
                          Not enough {(origin === 'x' ? x_asset_data : y_asset_data)?.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <button
                  disabled={disabled}
                  onClick={() => {
                    console.log('[Swap]', {
                      swap: {
                        ...swap,
                        origin: origin === 'x' ? 'y' : 'x',
                        amount: null,
                      },
                    })

                    setSwap({
                      ...swap,
                      origin: origin === 'x' ? 'y' : 'x',
                      amount: null,
                    })
                    getBalances(chain)
                  }}
                  className={`transform hover:rotate-180 hover:animate-spin-one-time transition duration-300 ease-in-out ${disabled ? 'cursor-not-allowed' : ''} rounded-full shadow dark:shadow-slate-500 dark:hover:shadow-white flex items-center justify-center p-2.5`}
                >
                  <MdSwapVert size={32} />
                </button>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 sm:space-y-0 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 dark:text-slate-600 text-sm font-bold">
                    To
                  </span>
                  {web3_provider && (origin === 'x' ? y_asset_data : x_asset_data) && (
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        Balance:
                      </span>
                      <Balance
                        chainId={_chain_id}
                        asset={asset}
                        contractAddress={(origin === 'x' ? y_asset_data : x_asset_data).contract_address}
                        symbol={(origin === 'x' ? y_asset_data : x_asset_data).symbol}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="w-full flex items-center justify-between sm:justify-start space-x-2 sm:space-x-4">
                    <div className="w-48 sm:h-16 min-w-max flex items-center justify-center space-x-1.5 py-2 px-3">
                      {chain_data?.image && (
                        <Image
                          src={chain_data.image}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      <span className="text-sm sm:text-base font-semibold">
                        {chain_data ?
                          chainName(chain_data) :
                          <span className="text-slate-400 dark:text-slate-500">
                            To Chain
                          </span>
                        }
                      </span>
                    </div>
                    <div className="w-48 sm:h-16 min-w-max flex items-center justify-center space-x-1.5 py-2 px-3">
                      {(origin === 'x' ? y_asset_data : x_asset_data)?.image && (
                        <Image
                          src={(origin === 'x' ? y_asset_data : x_asset_data).image}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      <span className="text-sm sm:text-base font-semibold">
                        {(origin === 'x' ? y_asset_data : x_asset_data)?.symbol ?
                          (origin === 'x' ? y_asset_data : x_asset_data).symbol :
                          <span className="text-slate-400 dark:text-slate-500">
                            To Token
                          </span>
                        }
                      </span>
                    </div>
                  </div>
                  <div className="w-72 h-11 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-end text-lg font-semibold text-right py-2 px-3">
                    {typeof swapAmount === 'number' ?
                      number_format(
                        swapAmount,
                        '0,0.00000000',
                        true,
                      ) :
                      swapAmount ?
                        <TailSpin
                          color="white"
                          width="20"
                          height="20"
                        /> :
                        null
                    }
                  </div>
                </div>
              </div>
              {chain && asset && (
                pair === undefined ?
                  <div className="text-slate-400 dark:text-slate-600 text-lg italic text-center sm:ml-3">
                    Route not supported
                  </div> :
                  <Info
                    data={pair}
                    amount_received={swapAmount}
                    asset_data={origin === 'x' ? y_asset_data : x_asset_data}
                  />
              )}
            </div>
            <div className="w-full max-w-4xl">
              {web3_provider && wrong_chain ?
                <Wallet
                  connectChainId={_chain_id}
                  className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl flex items-center justify-center text-white text-base sm:text-lg space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                >
                  <span className="mr-1.5 sm:mr-2">
                    {is_walletconnect ? 'Reconnect' : 'Switch'} to
                  </span>
                  {chain_data?.image && (
                    <Image
                      src={chain_data.image}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <span className="font-semibold">
                    {chain_data?.name}
                  </span>
                </Wallet> :
                callResponse || approveResponse ?
                  [callResponse || approveResponse].map((r, i) => (
                    <Alert
                      key={i}
                      color={`${r.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : r.status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                      icon={r.status === 'failed' ?
                        <BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> :
                        r.status === 'success' ?
                          <BiMessageCheck className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> :
                          r.status === 'pending' ?
                            <div className="mr-3">
                              <Watch
                                color="white"
                                width="20"
                                height="20"
                              />
                            </div> :
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
                          {chain_data?.explorer?.url && r.tx_hash && (
                            <a
                              href={`${chain_data.explorer.url}${chain_data.explorer.transaction_path?.replace('{tx}', r.tx_hash)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <TiArrowRight
                                size={20}
                                className="transform -rotate-45"
                              />
                            </a>
                          )}
                          {r.status === 'failed' ?
                            <button
                              onClick={() => reset()}
                              className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                            >
                              <MdClose size={20} />
                            </button> :
                            r.status === 'success' ?
                              <button
                                onClick={() => reset()}
                                className="bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center text-white p-1"
                              >
                                <MdClose size={20} />
                              </button> :
                              null
                          }
                        </div>
                      </div>
                    </Alert>
                  )) :
                  web3_provider ?
                    <button
                      disabled={disabled || !pair || !valid_amount}
                      onClick={() => call()}
                      className={`w-full ${disabled || !pair || !valid_amount ? calling || approving ? 'bg-blue-400 dark:bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-900 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded-xl text-base sm:text-lg text-center py-3 sm:py-4 px-2 sm:px-3`}
                    >
                      <span className="flex items-center justify-center space-x-1.5">
                        {(calling || approving) && (
                          <TailSpin
                            color="white"
                            width="20"
                            height="20"
                          />
                        )}
                        <span>
                          {calling ?
                            approving ?
                              approveProcessing ?
                                'Approving' :
                                'Please Approve' :
                              callProcessing ?
                                'Swapping' :
                                typeof approving === 'boolean' ?
                                  'Please Confirm' :
                                  'Checking Approval' :
                            'Swap'
                          }
                        </span>
                      </span>
                    </button> :
                    <Wallet
                      connectChainId={_chain_id}
                      buttonConnectTitle="Connect Wallet"
                      className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-white text-base sm:text-lg text-center sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                    >
                      <span>
                        Connect Wallet
                      </span>
                    </Wallet>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
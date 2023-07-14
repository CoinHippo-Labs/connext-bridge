import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { XTransferErrorStatus } from '@connext/nxtp-utils'
import { DebounceInput } from 'react-debounce-input'
import { constants } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
import _ from 'lodash'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { BiX, BiEditAlt, BiCheckCircle } from 'react-icons/bi'

import WarningSlippage from '../bridge/warning/slippage'
import Spinner from '../spinner'
import Alert from '../alert'
import Image from '../image'
import NumberDisplay from '../number'
import Copy from '../copy'
import Modal from '../modal'
import Wallet from '../wallet'
import { RELAYER_FEE_ASSET_TYPES, PERCENT_ROUTER_FEE, GAS_LIMIT_ADJUSTMENT, DEFAULT_PERCENT_BRIDGE_SLIPPAGE } from '../../lib/config'
import { getChainData, getAssetData, getContractData } from '../../lib/object'
import { toBigNumber, toFixedNumber, formatUnits, parseUnits, isNumber } from '../../lib/number'
import { toArray, includesStringList, numberToFixed, ellipse, equalsIgnoreCase, normalizeMessage, parseError } from '../../lib/utils'
import { LATEST_BUMPED_TRANSFERS_DATA } from '../../reducers/types'

export default (
  {
    forceDisabled = false,
    initialHidden = true,
    transferData,
    buttonTitle,
    onTransferBumped,
    onSlippageUpdated,
  },
) => {
  const dispatch = useDispatch()
  const { chains, assets, gas_tokens_price, dev, wallet } = useSelector(state => ({ chains: state.chains, assets: state.assets, gas_tokens_price: state.gas_tokens_price, dev: state.dev, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { gas_tokens_price_data } = { ...gas_tokens_price }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { chain_id, ethereum_provider, signer, address } = { ...wallet_data }

  const [hidden, setHidden] = useState(initialHidden)
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [newSlippage, setNewSlippage] = useState(null)
  const [slippageEditing, setSlippageEditing] = useState(false)
  const [relayerFeeAssetType, setRelayerFeeAssetType] = useState(_.head(RELAYER_FEE_ASSET_TYPES))
  const [newRelayerFee, setNewRelayerFee] = useState(null)
  const [estimatedValues, setEstimatedValues] = useState(undefined)
  const [estimateResponse, setEstimateResponse] = useState(null)

  const [updating, setUpdating] = useState(null)
  const [updateProcessing, setUpdateProcessing] = useState(null)
  const [updateResponse, setUpdateResponse] = useState(null)

  useEffect(
    () => {
      if (!_.isEqual(transferData, data)) {
        setData(transferData)
      }
      else if (data && !loaded) {
        const { origin_transacting_asset, origin_transacting_amount, relayer_fees } = { ...data }
        switch (error_status) {
          case XTransferErrorStatus.LowSlippage:
            calculateAmountReceived(origin_transacting_amount)
            break
          case XTransferErrorStatus.LowRelayerFee:
            setRelayerFeeAssetType(relayer_fees?.[origin_transacting_asset] ? 'transacting' : 'native')
            estimate()
            break
          default:
            break
        }
        setLoaded(true)
      }
    },
    [transferData, data, loaded],
  )

  useEffect(
    () => {
      switch (error_status) {
        case XTransferErrorStatus.LowRelayerFee:
          estimate()
          break
        default:
          break
      }
    },
    [loaded, relayerFeeAssetType],
  )

  useEffect(
    () => {
      const { origin_domain, origin_transacting_asset } = { ...data }
      const { chain_id } = { ...getChainData(origin_domain, chains_data) }
      const source_asset_data = getAssetData(undefined, assets_data, { chain_id, contract_address: origin_transacting_asset })
      const { allow_paying_gas } = { ...source_asset_data }
      if (source_asset_data && !allow_paying_gas) {
        setRelayerFeeAssetType('native')
      }
    },
    [data, chains_data, assets_data],
  )

  const { transfer_id, error_status, origin_domain, origin_transacting_asset, origin_transacting_amount, destination_domain, destination_transacting_asset, destination_local_asset, slippage, relayer_fees, receive_local } = { ...data }
  let { relayer_fee } = { ...data }

  const source_chain_data = getChainData(origin_domain, chains_data)
  const source_asset_data = getAssetData(undefined, assets_data, { chain_id: source_chain_data?.chain_id, contract_address: origin_transacting_asset })
  let source_contract_data = getContractData(source_chain_data?.chain_id, source_asset_data?.contracts)
  const _source_contract_data = _.cloneDeep(source_contract_data)
  // next asset
  if (source_contract_data?.next_asset && equalsIgnoreCase(source_contract_data.next_asset.contract_address, origin_transacting_asset)) {
    source_contract_data = { ...source_contract_data, ...source_contract_data.next_asset }
    delete source_contract_data.next_asset
  }
  // native asset
  if (!source_contract_data && equalsIgnoreCase(ZeroAddress, origin_transacting_asset)) {
    const { chain_id, native_token } = { ...source_chain_data }
    const { symbol } = { ...native_token }
    const { contracts } = { ...getAssetData(symbol, assets_data) }
    source_contract_data = { ...getContractData(chain_id, contracts), ...native_token, contract_address: origin_transacting_asset }
  }
  const source_symbol = source_contract_data?.symbol || source_asset_data?.symbol
  const source_decimals = source_contract_data?.decimals || 18
  const source_asset_image = source_contract_data?.image || source_asset_data?.image
  const source_gas = source_chain_data?.native_token
  const source_gas_decimals = source_gas?.decimals || 18
  const source_amount = formatUnits(origin_transacting_amount, source_decimals)

  const destination_chain_data = getChainData(destination_domain, chains_data)
  const _asset_data = getAssetData(source_asset_data?.id, assets_data, { chain_id: destination_chain_data?.chain_id })
  const _contract_data = getContractData(destination_chain_data?.chain_id, _asset_data?.contracts)
  const destination_asset_data = getAssetData(undefined, assets_data, { chain_id: destination_chain_data?.chain_id, contract_addresses: [destination_transacting_asset, _asset_data ? (receive_local ? _contract_data?.next_asset : _contract_data)?.contract_address : destination_local_asset] })
  let destination_contract_data = getContractData(destination_chain_data?.chain_id, destination_asset_data?.contracts)
  const _destination_contract_data = _.cloneDeep(destination_contract_data)
  // next asset
  if (destination_contract_data?.next_asset && (equalsIgnoreCase(destination_contract_data.next_asset.contract_address, destination_transacting_asset) || receive_local)) {
    destination_contract_data = { ...destination_contract_data, ...destination_contract_data.next_asset }
    delete destination_contract_data.next_asset
  }
  // native asset
  if (!destination_contract_data && equalsIgnoreCase(ZeroAddress, destination_transacting_asset)) {
    const { chain_id, native_token } = { ...destination_chain_data }
    const { symbol } = { ...native_token }
    const { contracts } = { ...getAssetData(symbol, assets_data) }
    destination_contract_data = { ...getContractData(chain_id, contracts), ...native_token, contract_address: destination_transacting_asset }
  }
  const destination_symbol = destination_contract_data?.symbol || destination_asset_data?.symbol
  const destination_decimals = destination_contract_data?.decimals || 18
  const destination_asset_image = destination_contract_data?.image || destination_asset_data?.image

  const _slippage = slippage / 100
  const estimatedSlippage = estimatedValues?.destinationSlippage && estimatedValues.originSlippage ? Number(numberToFixed((Number(estimatedValues.destinationSlippage) + Number(estimatedValues.originSlippage)) * 100, 2)) : null

  const gas_token_data = toArray(gas_tokens_price_data).find(d => equalsIgnoreCase(d.asset_id, source_gas?.symbol))
  const relayer_fee_decimals = relayerFeeAssetType === 'transacting' ? source_decimals : source_gas_decimals
  relayer_fee = relayer_fees ?
    numberToFixed(
      _.sum(Object.entries(relayer_fees).map(([k, v]) =>
        formatUnits(v, k === ZeroAddress ? source_gas_decimals : source_decimals) * (
          relayerFeeAssetType === 'transacting' ?
            k === ZeroAddress ? gas_token_data?.price / (origin_transacting_asset === ZeroAddress ? gas_token_data : source_asset_data)?.price : 1 :
            k === ZeroAddress ? 1 : (origin_transacting_asset === ZeroAddress ? gas_token_data : source_asset_data)?.price / gas_token_data?.price
        )
      )),
      relayer_fee_decimals,
    ) :
    formatUnits(relayer_fee || '0', source_gas_decimals)
  const relayerFeeToBump = relayer_fee && newRelayerFee ? numberToFixed(toFixedNumber(newRelayerFee).subUnsafe(toFixedNumber(relayer_fee)).toString(), relayer_fee_decimals) : null
  if (error_status === XTransferErrorStatus.LowRelayerFee) {
    console.log('[action required]', '[debug]', '[relayerFee]', { relayerFeeAssetType, relayer_fees, relayer_fee, newRelayerFee, relayerFeeToBump })
  }

  const reset = () => {
    setHidden(true)
    setData(null)
    setLoaded(false)
    setNewSlippage(null)
    setSlippageEditing(false)
    setRelayerFeeAssetType(source_asset_data?.allow_paying_gas ? _.head(RELAYER_FEE_ASSET_TYPES) : 'native')
    setNewRelayerFee(null)
    setEstimatedValues(undefined)
    setUpdating(null)
    setUpdateProcessing(null)
    setUpdateResponse(null)
  }

  const estimate = async () => {
    if (!updateResponse) {
      if ((source_contract_data || destination_contract_data) && isNumber(source_amount)) {
        if (sdk) {
          setNewRelayerFee(null)
          setUpdating(null)
          setUpdateResponse(null)

          try {
            const { native_token } = { ...source_chain_data }
            const { gas_price } = { ...destination_chain_data }
            let { decimals } = { ...native_token }
            decimals = decimals || 18

            const params = {
              originDomain: source_chain_data?.domain_id,
              destinationDomain: destination_chain_data?.domain_id,
              isHighPriority: true,
              priceIn: relayerFeeAssetType === 'transacting' ? 'usd' : 'native',
              destinationGasPrice: gas_price,
            }
            try {
              console.log('[action required]', '[estimateRelayerFee]', params)
              const response = await sdk.sdkBase.estimateRelayerFee(params)
              let relayerFee = formatUnits(response, decimals)
              const { price } = { ...(origin_transacting_asset === ZeroAddress ? gas_token_data : source_asset_data) }
              if (isNumber(relayerFee)) {
                relayerFee = params.priceIn === 'usd' && price > 0 ? numberToFixed(relayerFee / price, decimals) : relayerFee.toString()
              }
              console.log('[action required]', '[relayerFee]', { params, response, relayerFee })
              setNewRelayerFee(relayerFee)
            } catch (error) {
              const response = parseError(error)
              console.log('[action required]', '[estimateRelayerFee error]', params, error)
              setEstimateResponse({ status: 'failed', ...response })
            }
          } catch (error) {}
        }
      }
      else {
        setNewRelayerFee(null)
      }
    }
  }

  const calculateAmountReceived = async _amount => {
    if (sdk) {
      const originDomain = source_chain_data?.domain_id
      const destinationDomain = destination_chain_data?.domain_id
      const originTokenAddress = (equalsIgnoreCase(source_contract_data?.contract_address, ZeroAddress) ? _source_contract_data : source_contract_data)?.contract_address
      let destinationTokenAddress = _destination_contract_data?.contract_address
      const isNextAsset = typeof receive_local === 'boolean' ? receive_local : equalsIgnoreCase(destination_contract_data?.contract_address, _destination_contract_data?.next_asset?.contract_address)
      if (isNextAsset) {
        destinationTokenAddress = _destination_contract_data?.next_asset?.contract_address || destinationTokenAddress
      }
      const amount = parseUnits(_amount, source_decimals)

      let manual
      let _estimatedValues
      try {
        setEstimatedValues(null)
        setEstimateResponse(null)
        if (BigInt(amount) > 0) {
          console.log('[action required]', '[calculateAmountReceived]', { originDomain, destinationDomain, originTokenAddress, destinationTokenAddress, amount, isNextAsset })
          const response = await sdk.sdkBase.calculateAmountReceived(originDomain, destinationDomain, originTokenAddress, amount, isNextAsset)
          console.log('[action required]', '[amountReceived]', { originDomain, destinationDomain, originTokenAddress, destinationTokenAddress, amount, isNextAsset, response })
          _estimatedValues = Object.fromEntries(
            Object.entries({ ...response }).map(([k, v]) => {
              try {
                v = formatUnits(v, ['amountReceived'].includes(k) ? (isNextAsset && _destination_contract_data?.next_asset ? _destination_contract_data.next_asset : destination_contract_data)?.decimals || 18 : source_decimals)
              } catch (error) {}
              return [k, v]
            })
          )
          setEstimatedValues(_estimatedValues)
        }
        else {
          manual = true
        }
      } catch (error) {
        const response = parseError(error)
        console.log('[action required]', '[calculateAmountReceived error]', { originDomain, destinationDomain, originTokenAddress, destinationTokenAddress, amount, isNextAsset }, error)
        const { message } = { ...response }
        if (includesStringList(message, ['reverted', 'invalid BigNumber value'])) {
          manual = true
        }
        else {
          setEstimateResponse({ status: 'failed', ...response })
        }
      }

      if (manual) {
        const routerFee = parseFloat(numberToFixed(_amount * PERCENT_ROUTER_FEE / 100, source_decimals))
        _estimatedValues = {
          amountReceived: _amount - routerFee,
          routerFee,
          destinationSlippage: '0',
          originSlippage: '0',
          isNextAsset: typeof receive_local === 'boolean' ? receive_local : false,
        }
        setEstimatedValues(_estimatedValues)
      }

      const _newSlippage = _estimatedValues?.destinationSlippage && _estimatedValues.originSlippage ? Number(numberToFixed((Number(_estimatedValues.destinationSlippage) + Number(_estimatedValues.originSlippage)) * 100, 2)) : null
      setNewSlippage(_newSlippage > 0 ? _newSlippage : DEFAULT_PERCENT_BRIDGE_SLIPPAGE)
    }
  }

  const update = async () => {
    setUpdating(true)

    if (sdk && signer) {
      let failed
      let params
      switch (error_status) {
        case XTransferErrorStatus.LowSlippage:
          try {
            params = {
              domainId: destination_domain,
              transferId: transfer_id,
              slippage: numberToFixed(newSlippage, 2) * 100,
            }
            console.log('[action required]', '[updateSlippage]', { params })
            const request = await sdk.sdkBase.updateSlippage(params)
            if (request) {
              try {
                const gasLimit = await signer.estimateGas(request)
                if (gasLimit) {
                  request.gasLimit = toBigNumber(toFixedNumber(gasLimit).mulUnsafe(toFixedNumber(GAS_LIMIT_ADJUSTMENT)))
                }
              } catch (error) {}
              const response = await signer.sendTransaction(request)
              const { hash } = { ...response }

              setUpdateProcessing(true)
              const receipt = await signer.provider.waitForTransaction(hash)
              const { transactionHash, status } = { ...receipt }
              failed = !status
              setUpdateResponse({
                status: failed ? 'failed' : 'success',
                message: failed ? 'Failed to send transaction' : 'Update slippage successful',
                tx_hash: hash,
              })

              if (!failed && onSlippageUpdated) {
                onSlippageUpdated(params.slippage)
              }
            }
          } catch (error) {
            const response = parseError(error)
            console.log('[action required]', '[updateSlippage error]', params, error)
            const { code } = { ...response }
            switch (code) {
              case 'user_rejected':
                break
              default:
                setUpdateResponse({ status: 'failed', ...response })
                break
            }
            failed = true
          }
          break
        case XTransferErrorStatus.LowRelayerFee:
          try {
            const relayerFeeToBump = relayer_fee && newRelayerFee ? numberToFixed(toFixedNumber(newRelayerFee).subUnsafe(toFixedNumber(relayer_fee)).toString(), relayer_fee_decimals) : null
            params = {
              domainId: origin_domain,
              transferId: transfer_id,
              asset: relayerFeeAssetType === 'transacting' ? origin_transacting_asset : ZeroAddress,
              relayerFee: parseUnits(relayerFeeToBump, relayer_fee_decimals),
            }
            try {
              if (relayerFeeAssetType === 'transacting') {
                const domain_id = params.domainId
                const contract_address = (equalsIgnoreCase(source_contract_data?.contract_address, ZeroAddress) ? _source_contract_data : source_contract_data)?.contract_address
                const amount = params.relayerFee
                const infinite_approve = false
    
                console.log('[action required]', '[approveIfNeeded before bumpTransfer]', { domain_id, contract_address, amount, infinite_approve })
                const request = await sdk.sdkBase.approveIfNeeded(domain_id, contract_address, amount, infinite_approve)
                if (request) {
                  const response = await signer.sendTransaction(request)
                  const { hash } = { ...response }
                  setUpdateResponse({ status: 'pending', message: 'Waiting for token approval', tx_hash: hash })

                  const receipt = await signer.provider.waitForTransaction(hash)
                  const { status } = { ...receipt }
                  failed = !status
                  setUpdateResponse(!failed ? null : { status: 'failed', message: 'Failed to approve', tx_hash: hash })
                }
              }
            } catch (error) {}

            if (!failed) {
              console.log('[action required]', '[bumpTransfer]', params)
              const request = await sdk.sdkBase.bumpTransfer(params)
              if (request) {
                try {
                  const gasLimit = await signer.estimateGas(request)
                  if (gasLimit) {
                    request.gasLimit = toBigNumber(toFixedNumber(gasLimit).mulUnsafe(toFixedNumber(GAS_LIMIT_ADJUSTMENT)))
                  }
                } catch (error) {}
                const response = await signer.sendTransaction(request)
                const { hash } = { ...response }

                setUpdateProcessing(true)
                const receipt = await signer.provider.waitForTransaction(hash)
                const { transactionHash, status } = { ...receipt }
                failed = !status
                setUpdateResponse({
                  status: failed ? 'failed' : 'success',
                  message: failed ? 'Failed to send transaction' : 'Bump transfer successful',
                  tx_hash: hash,
                })

                if (!failed && onTransferBumped) {
                  dispatch({ type: LATEST_BUMPED_TRANSFERS_DATA, value: transfer_id })
                  onTransferBumped({
                    relayer_fee: params.relayerFee,
                    relayer_fees: {
                      [params.asset]: params.relayerFee,
                    },
                  })
                }
              }
            }
          } catch (error) {
            const response = parseError(error)
            console.log('[action required]', '[bumpTransfer error]', params, error)
            const { code } = { ...response }
            let { message } = { ...response }
            if (message?.includes('insufficient funds')) {
              message = 'Insufficient Balance'
            }
            switch (code) {
              case 'user_rejected':
                break
              default:
                setUpdateResponse({ status: 'failed', ...response, message })
                break
            }
            failed = true
          }
          break
        default:
          break
      }
    }

    setUpdateProcessing(false)
    setUpdating(false)
  }

  const chain_data = error_status === XTransferErrorStatus.LowSlippage ? destination_chain_data : source_chain_data
  const { explorer } = { ...chain_data }
  const { url, transaction_path } = { ...explorer }

  const disabled = forceDisabled || updating
  const wrong_chain = chain_id !== chain_data?.chain_id && !updateResponse
  const is_walletconnect = ethereum_provider?.constructor?.name === 'WalletConnectProvider'

  return data && buttonTitle && (
    <Modal
      hidden={hidden || ![XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.LowSlippage].includes(error_status)}
      disabled={disabled}
      onClick={() => setHidden(false)}
      buttonTitle={buttonTitle}
      buttonClassName="rounded flex items-center justify-center"
      title={
        <div className="flex items-center justify-between">
          <span className="normal-case">
            Action Required: {error_status === XTransferErrorStatus.LowSlippage ? 'Slippage exceeded' : error_status === XTransferErrorStatus.LowRelayerFee ? 'Relayer fee insufficient' : error_status}
          </span>
          <div
            onClick={() => reset()}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-full p-2"
          >
            <BiX size={18} />
          </div>
        </div>
      }
      body={
        <div className="space-y-8 mt-4">
          {error_status === XTransferErrorStatus.LowSlippage ?
            <>
              <div className="space-y-3">
                <div className="text-slate-600 dark:text-slate-400 text-sm">
                  Your slippage tolerance is too low for this transfer to complete under current market conditions.
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">
                  You may increase your slippage tolerance below. If you take no action, the transfer will continue to retry with your current slippage tolerance.
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between space-x-1">
                  <div className="whitespace-nowrap text-slate-800 dark:text-slate-200 text-sm font-medium">
                    Current slippage tolerance
                  </div>
                  <NumberDisplay
                    value={_slippage}
                    suffix=" %"
                    className="whitespace-nowrap text-slate-800 dark:text-slate-200 text-sm font-semibold"
                  />
                </div>
                <div className="flex flex-col space-y-0.5">
                  <div className="flex items-start justify-between space-x-1">
                    <div className="whitespace-nowrap text-slate-800 dark:text-slate-200 text-sm font-medium">
                      New slippage tolerance (recommended)
                    </div>
                    <div className="flex flex-col sm:items-end space-y-1.5">
                      {slippageEditing ?
                        <>
                          <div className="flex items-center justify-end space-x-1.5">
                            <DebounceInput
                              debounceTimeout={750}
                              size="small"
                              type="number"
                              placeholder="0.00"
                              value={typeof newSlippage === 'number' && newSlippage >= 0 ? newSlippage : ''}
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
                                  value = value <= 0 || value > 100 ? DEFAULT_PERCENT_BRIDGE_SLIPPAGE : value
                                  setNewSlippage(value && isNumber(value) ? parseFloat(numberToFixed(Number(value), 2)) : value)
                                }
                              }
                              onWheel={e => e.target.blur()}
                              onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                              className="w-20 bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 rounded border-0 focus:ring-0 text-sm font-semibold text-right py-1 px-2"
                            />
                            <button
                              onClick={() => setSlippageEditing(false)}
                              className="bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white"
                            >
                              <BiCheckCircle size={16} />
                            </button>
                          </div>
                          <div className="flex items-center space-x-1.5 -mr-1.5">
                            {[3.0, 1.0, 0.5].map((s, i) => (
                              <div
                                key={i}
                                onClick={
                                  () => {
                                    setNewSlippage(s)
                                    setSlippageEditing(false)
                                  }
                                }
                                className={`${newSlippage === s ? 'bg-slate-200 dark:bg-slate-700 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium hover:font-semibold'} rounded cursor-pointer text-xs py-1 px-1.5`}
                              >
                                {s} %
                              </div>
                            ))}
                          </div>
                        </> :
                        <div className="flex items-center space-x-1.5">
                          {!newSlippage && !estimateResponse ?
                            <div><Spinner width={20} height={20} /></div> :
                            <>
                              <NumberDisplay
                                value={newSlippage}
                                suffix=" %"
                                className="whitespace-nowrap text-sm font-semibold"
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
                                <BiEditAlt size={16} />
                              </button>
                            </>
                          }
                        </div>
                      }
                    </div>
                  </div>
                  <WarningSlippage value={newSlippage} estimatedValue={estimatedSlippage} />
                </div>
              </div>
            </> :
            error_status === XTransferErrorStatus.LowRelayerFee ?
              <>
                <div className="space-y-3">
                  <div className="text-slate-600 dark:text-slate-400 text-sm">
                    The destination gas paid to complete this trade is currently too low.
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 text-sm">
                    You may bump the amount of gas below for the relayer to execute your transfer. If you take no action, the transfer will continue to retry with the current amount.
                  </div>
                </div>
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between space-x-1">
                    <div className="whitespace-nowrap text-slate-800 dark:text-slate-200 text-sm font-medium">
                      Current relayer fee
                    </div>
                    {Object.keys({ ...relayer_fees }).length > 0 ?
                      <div className="flex flex-col space-y-2">
                        {Object.entries(relayer_fees).map(([k, v]) => {
                          return (
                            <span key={k} className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold space-x-1.5">
                              <NumberDisplay value={formatUnits(v || '0', k === ZeroAddress ? source_gas_decimals : source_decimals)} className="text-sm" />
                              <span>{k === ZeroAddress ? source_gas?.symbol : source_symbol}</span>
                            </span>
                          )
                        })}
                      </div> :
                      <span className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold space-x-1.5">
                        <NumberDisplay value={relayer_fee} className="text-sm" />
                        <span>{source_gas?.symbol}</span>
                      </span>
                    }
                  </div>
                  <div className="flex items-center justify-between space-x-1">
                    <div className="whitespace-nowrap text-slate-800 dark:text-slate-200 text-sm font-medium">
                      Additional required relayer fee
                    </div>
                    {!newRelayerFee && !estimateResponse ?
                      <Oval
                        width="20"
                        height="20"
                        color={loaderColor(theme)}
                      /> :
                      <span className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold space-x-1.5">
                        <NumberDisplay value={Number(relayerFeeToBump) > 0 ? relayerFeeToBump : 0} className="text-sm" />
                        <span>{relayerFeeAssetType === 'transacting' ? source_symbol : source_gas?.symbol}</span>
                      </span>
                    }
                  </div>
                </div>
              </> :
              null
          }
          {ethereum_provider && (wrong_chain || isNumber(error_status === XTransferErrorStatus.LowSlippage ? newSlippage : error_status === XTransferErrorStatus.LowRelayerFee ? newRelayerFee : null)) ?
            wrong_chain ?
              <Wallet
                connectChainId={chain_data?.chain_id}
                className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base font-medium space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
              >
                <span>{is_walletconnect ? 'Reconnect' : 'Switch'} to</span>
                {chain_data?.image && (
                  <Image
                    src={chain_data.image}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                )}
                <span className="font-semibold">
                  {chain_data?.name}
                </span>
              </Wallet> :
              !updateResponse && !updating && isNumber(error_status === XTransferErrorStatus.LowSlippage ? newSlippage : error_status === XTransferErrorStatus.LowRelayerFee ? newRelayerFee : null) && (error_status === XTransferErrorStatus.LowSlippage ? newSlippage <= _slippage : error_status === XTransferErrorStatus.LowRelayerFee ? !newRelayerFee : null) ?
                <Alert status="failed" closeDisabled={true}>
                  <span>
                    {error_status === XTransferErrorStatus.LowSlippage && newSlippage <= _slippage ?
                      'New amount must be higher than existing slippage tolerance' :
                      error_status === XTransferErrorStatus.LowRelayerFee && !newRelayerFee ?
                        'Cannot estimate the relayer fee at the moment. Please try again later.' :
                        ''
                    }
                  </span>
                </Alert> :
                !updateResponse && !estimateResponse ?
                  error_status === XTransferErrorStatus.LowRelayerFee && relayer_fee && newRelayerFee && Number(relayerFeeToBump) <= 0 ?
                    <Alert closeDisabled={true}>
                      <div className="flex items-center justify-center">
                        <span className="break-all text-sm font-medium text-center">
                          Waiting for bump ...
                        </span>
                      </div>
                    </Alert> :
                    <button
                      disabled={disabled}
                      onClick={
                        () => {
                          setSlippageEditing(false)
                          update()
                        }
                      }
                      className={`w-full ${disabled ? 'bg-blue-400 dark:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'} rounded flex items-center justify-center text-white text-base py-3 sm:py-4 px-2 sm:px-3`}
                    >
                      <span className={`flex items-center justify-center ${updating && updateProcessing ? 'space-x-3 ml-1.5' : 'space-x-3'}`}>
                        {disabled && <div><Spinner width={20} height={20} color="white" /></div>}
                        <span>{updating ? updateProcessing ? 'Update in progress ...' : 'Please Confirm' : 'Apply'}</span>
                      </span>
                    </button> :
                  toArray(updateResponse || estimateResponse).map((d, i) => {
                    const { status, message, tx_hash } = { ...d }
                    return (
                      <Alert key={i} status={status} closeDisabled={true}>
                        <div className="flex items-center justify-between space-x-2">
                          <span className="break-all text-sm font-medium">
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
                                  <MdClose size={14} />
                                </button>
                              </> :
                              status === 'success' ?
                                <button
                                  onClick={() => reset()}
                                  className="bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center text-white p-1"
                                >
                                  <MdClose size={14} />
                                </button> :
                                null
                            }
                          </div>
                        </div>
                      </Alert>
                    )
                  }) :
            ethereum_provider ?
              <button
                disabled={true}
                className="w-full bg-slate-100 dark:bg-slate-800 cursor-not-allowed rounded text-slate-400 dark:text-slate-500 text-base text-center py-3 sm:py-4 px-2 sm:px-3"
              >
                <span>Apply</span>
              </button> :
              <Wallet
                connectChainId={chain_data?.chain_id}
                buttonConnectTitle="Connect Wallet"
                className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base font-medium text-center sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
              >
                <span>Connect Wallet</span>
              </Wallet>
          }
        </div>
      }
      noCancelOnClickOutside={true}
      noButtons={true}
      onClose={() => reset()}
      modalClassName="max-w-md"
    />
  )
}
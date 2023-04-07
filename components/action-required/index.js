import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { FixedNumber, constants, utils } from 'ethers'
import { XTransferErrorStatus } from '@connext/nxtp-utils'
import { TailSpin, Oval } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { BiX, BiMessageError, BiMessageCheck, BiMessageDetail, BiEditAlt, BiCheckCircle } from 'react-icons/bi'
import { IoWarning } from 'react-icons/io5'

import Alert from '../alerts'
import Copy from '../copy'
import DecimalsFormat from '../decimals-format'
import Image from '../image'
import Modal from '../modals'
import Wallet from '../wallet'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { split, toArray, includesStringList, ellipse, equalsIgnoreCase, loaderColor, errorPatterns, parseError } from '../../lib/utils'
import { LATEST_BUMPED_TRANSFERS_DATA } from '../../reducers/types'

const is_staging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' || process.env.NEXT_PUBLIC_APP_URL?.includes('staging')
const ROUTER_FEE_PERCENT = Number(process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT)
const GAS_LIMIT_ADJUSTMENT = Number(process.env.NEXT_PUBLIC_GAS_LIMIT_ADJUSTMENT)
const DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE)
const RELAYER_FEE_ASSET_TYPES = ['native', 'transacting']

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
  const {
    preferences,
    chains,
    assets,
    gas_tokens_price,
    dev,
    wallet,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        gas_tokens_price: state.gas_tokens_price,
        dev: state.dev,
        wallet: state.wallet,
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
    assets_data,
  } = { ...assets }
  const {
    gas_tokens_price_data,
  } = { ...gas_tokens_price }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    sdk,
  } = { ...dev }
  const {
    chain_id,
    provider,
    browser_provider,
    signer,
    address,
  } = { ...wallet_data }

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
        const {
          origin_transacting_amount,
        } = { ...data }

        switch (error_status) {
          case XTransferErrorStatus.LowSlippage:
            calculateAmountReceived(origin_transacting_amount)
            break
          case XTransferErrorStatus.LowRelayerFee:
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

  const {
    transfer_id,
    error_status,
    origin_domain,
    origin_transacting_asset,
    origin_transacting_amount,
    origin_bridged_asset,
    destination_domain,
    destination_transacting_asset,
    destination_transacting_amount,
    destination_local_asset,
    slippage,
    receive_local,
    relayer_fees,
  } = { ...data }
  let {
    relayer_fee,
  } = { ...data }

  const source_chain_data = getChain(origin_domain, chains_data)

  const {
    explorer,
  } = { ...source_chain_data }

  const {
    url,
    transaction_path,
  } = { ...explorer }

  const source_asset_data = getAsset(null, assets_data, source_chain_data?.chain_id, origin_transacting_asset)

  let source_contract_data = getContract(source_chain_data?.chain_id, source_asset_data?.contracts)
  const _source_contract_data = _.cloneDeep(source_contract_data)
  // next asset
  if (source_contract_data?.next_asset && equalsIgnoreCase(source_contract_data.next_asset.contract_address, origin_transacting_asset)) {
    source_contract_data = {
      ...source_contract_data,
      ...source_contract_data.next_asset,
    }

    delete source_contract_data.next_asset
  }
  // native asset
  if (!source_contract_data && equalsIgnoreCase(constants.AddressZero, origin_transacting_asset)) {
    const {
      nativeCurrency,
    } = { ..._.head(source_chain_data?.provider_params) }

    const {
      symbol,
    } = { ...nativeCurrency }

    const _source_asset_data = getAsset(symbol, assets_data)

    source_contract_data = {
      ...getContract(source_chain_data?.chain_id, _source_asset_data?.contracts),
      ...nativeCurrency,
      contract_address: origin_transacting_asset,
    }
  }

  const source_symbol = source_contract_data?.symbol || source_asset_data?.symbol
  const source_decimals = source_contract_data?.decimals || 18
  const source_asset_image = source_contract_data?.image || source_asset_data?.image
  const source_gas_native_token = _.head(source_chain_data?.provider_params)?.nativeCurrency
  const source_gas_decimals = source_gas_native_token?.decimals || 18
  const source_amount =
    origin_transacting_amount &&
    Number(
      utils.formatUnits(
        BigInt(origin_transacting_amount).toString(),
        source_decimals,
      )
    )

  const destination_chain_data = getChain(destination_domain, chains_data)
  const _asset_data = getAsset(source_asset_data?.id, assets_data, destination_chain_data?.chain_id)
  const _contract_data = getContract(destination_chain_data?.chain_id, _asset_data?.contracts)
  const destination_asset_data = getAsset(null, assets_data, destination_chain_data?.chain_id, [destination_transacting_asset, _asset_data ? receive_local ? _contract_data?.next_asset?.contract_address : _contract_data?.contract_address : destination_local_asset])

  let destination_contract_data = getContract(destination_chain_data?.chain_id, destination_asset_data?.contracts)
  const _destination_contract_data = _.cloneDeep(destination_contract_data)
  // next asset
  if (destination_contract_data?.next_asset && (equalsIgnoreCase(destination_contract_data.next_asset.contract_address, destination_transacting_asset) || receive_local)) {
    destination_contract_data = {
      ...destination_contract_data,
      ...destination_contract_data.next_asset,
    }

    delete destination_contract_data.next_asset
  }
  // native asset
  if (!destination_contract_data && equalsIgnoreCase(constants.AddressZero, destination_transacting_asset)) {
    const {
      nativeCurrency,
    } = { ..._.head(destination_chain_data?.provider_params) }

    const {
      symbol,
    } = { ...nativeCurrency }

    const _destination_asset_data = getAsset(symbol, assets_data)

    destination_contract_data = {
      ...getContract(destination_chain_data?.chain_id, _destination_asset_data?.contracts),
      ...nativeCurrency,
      contract_address: destination_transacting_asset,
    }
  }

  const destination_symbol = destination_contract_data?.symbol || destination_asset_data?.symbol
  const destination_decimals = destination_contract_data?.decimals || 18
  const destination_asset_image = destination_contract_data?.image || destination_asset_data?.image
  const destination_amount =
    destination_transacting_amount ?
      Number(
        utils.formatUnits(
          BigInt(destination_transacting_amount).toString(),
          destination_decimals,
        )
      ) :
      source_amount * (1 - ROUTER_FEE_PERCENT / 100)

  const _slippage = slippage / 100

  const estimated_slippage =
    estimatedValues?.destinationSlippage && estimatedValues?.originSlippage ?
      Number(((Number(estimatedValues.destinationSlippage) + Number(estimatedValues.originSlippage)) * 100).toFixed(2)) :
      null

  const gas_token_data = toArray(gas_tokens_price_data).find(d => equalsIgnoreCase(d?.symbol, source_gas_native_token?.symbol))

  const {
    price,
  } = { ...gas_token_data }

  relayer_fee =
    relayer_fees ?
      _.sum(
        Object.entries(relayer_fees)
          .map(([k, v]) =>
            Number(utils.formatUnits(v, k === constants.AddressZero ? source_gas_decimals : source_decimals)) *
            (relayerFeeAssetType === 'transacting' ?
              k === constants.AddressZero ? price / source_asset_data?.price : 1 :
              k === constants.AddressZero ? 1 : source_asset_data?.price / price
            )
          )
      )
      .toFixed(relayerFeeAssetType === 'transacting' ? source_decimals : source_gas_decimals) :
      utils.formatUnits(relayer_fee || '0', source_gas_decimals)

  const relayer_fee_to_bump = relayer_fee && newRelayerFee ? Number(newRelayerFee) - Number(relayer_fee) : null

  if (error_status === XTransferErrorStatus.LowRelayerFee) {
    console.log(
      '[debug]',
      '[relayerFee]',
      {
        relayerFeeAssetType,
        relayer_fees,
        relayer_fee,
        newRelayerFee,
        relayer_fee_to_bump,
      },
    )
  }

  const reset = () => {
    setHidden(true)
    setData(null)
    setLoaded(false)
    setNewSlippage(null)
    setSlippageEditing(false)
    setRelayerFeeAssetType(_.head(RELAYER_FEE_ASSET_TYPES))
    setNewRelayerFee(null)
    setEstimatedValues(undefined)
    setUpdating(null)
    setUpdateProcessing(null)
    setUpdateResponse(null)
  }

  const estimate = async () => {
    if (!updateResponse) {
      if (
        (source_contract_data || destination_contract_data) &&
        ['string', 'number'].includes(typeof source_amount) && ![''].includes(source_amount) && !isNaN(source_amount)
      ) {
        if (sdk) {
          setNewRelayerFee(null)
          setUpdating(null)
          setUpdateResponse(null)

          try {
            const {
              provider_params,
            } = { ...source_chain_data }

            const {
              nativeCurrency,
            } = { ..._.head(provider_params) }

            let {
              decimals,
            } = { ...nativeCurrency }

            decimals = decimals || 18

            const params = {
              originDomain: source_chain_data?.domain_id,
              destinationDomain: destination_chain_data?.domain_id,
              isHighPriority: true,
              priceIn: ['transacting'].includes(relayerFeeAssetType) ? 'usd' : 'native',
            }

            try {
              console.log(
                '[action required]',
                '[estimateRelayerFee]',
                params,
              )

              const response = await sdk.sdkBase.estimateRelayerFee(params)

              let relayerFee = response && utils.formatUnits(response, decimals)

              if (relayerFee && params.priceIn === 'usd') {
                const {
                  price,
                } = { ...source_asset_data }

                if (price) {
                  relayerFee = (Number(relayerFee) / price).toFixed(decimals)
                }
              }

              console.log(
                '[action required]',
                '[relayerFee]',
                {
                  params,
                  response,
                  relayerFee,
                },
              )

              setNewRelayerFee(relayerFee)
            } catch (error) {
              const response = parseError(error)

              console.log(
                '[action required]',
                '[estimateRelayerFee error]',
                params,
                {
                  error,
                },
              )

              setEstimateResponse(
                {
                  status: 'failed',
                  ...response,
                }
              )
            }
          } catch (error) {}
        }
      }
      else {
        setNewRelayerFee(null)
      }
    }
  }

  const calculateAmountReceived = async (
    _amount,
  ) => {
    if (sdk) {
      const originDomain = source_chain_data?.domain_id
      const destinationDomain = destination_chain_data?.domain_id

      const originTokenAddress = (equalsIgnoreCase(source_contract_data?.contract_address, constants.AddressZero) ? _source_contract_data : source_contract_data)?.contract_address
      let destinationTokenAddress = _destination_contract_data?.contract_address

      const isNextAsset =
        typeof receive_local === 'boolean' ?
          receive_local :
          equalsIgnoreCase(
            destination_contract_data?.contract_address,
            _destination_contract_data?.next_asset?.contract_address,
          )

      if (isNextAsset) {
        destinationTokenAddress = _destination_contract_data?.next_asset?.contract_address || destinationTokenAddress
      }

      const amount =
        utils.parseUnits(
          (_amount || 0).toString(),
          source_decimals,
        )
        .toBigInt()

      let manual, _estimatedValues

      try {
        setEstimatedValues(null)
        setEstimateResponse(null)

        if (amount > 0) {
          console.log(
            '[action required]',
            '[calculateAmountReceived]',
            {
              originDomain,
              destinationDomain,
              originTokenAddress,
              destinationTokenAddress,
              amount,
              isNextAsset,
            },
          )

          const response = await sdk.sdkBase.calculateAmountReceived(originDomain, destinationDomain, originTokenAddress, amount.toString(), isNextAsset)

          console.log(
            '[action required]',
            '[amountReceived]',
            {
              originDomain,
              destinationDomain,
              originTokenAddress,
              destinationTokenAddress,
              amount,
              isNextAsset,
              ...response,
            },
          )

          _estimatedValues =
            Object.fromEntries(
              Object.entries({ ...response })
                .map(([k, v]) => {
                  try {
                    v =
                      utils.formatUnits(
                        v,
                        ['amountReceived'].includes(k) ?
                          (isNextAsset && _destination_contract_data?.next_asset ?
                            _destination_contract_data?.next_asset?.decimals :
                            destination_contract_data?.decimals
                          ) || 18 :
                          source_decimals,
                      )
                  } catch (error) {}

                  return (
                    [
                      k,
                      v,
                    ]
                  )
                })
            )

          setEstimatedValues(_estimatedValues)
        }
        else {
          manual = true
        }
      } catch (error) {
        const response = parseError(error)

        console.log(
          '[action required]',
          '[calculateAmountReceived error]',
          {
            originDomain,
            destinationDomain,
            originTokenAddress,
            destinationTokenAddress,
            amount,
            isNextAsset,
            error,
          },
        )

        const {
          message,
        } = { ...response }

        if (includesStringList(message, ['reverted', 'invalid BigNumber value'])) {
          manual = true
        }
        else {
          setEstimateResponse(
            {
              status: 'failed',
              ...response,
            }
          )
        }
      }

      if (manual) {
        const routerFee = parseFloat((Number(_amount) * ROUTER_FEE_PERCENT / 100).toFixed(source_decimals))

        _estimatedValues =
          {
            amountReceived: Number(_amount) - routerFee,
            routerFee,
            destinationSlippage: '0',
            originSlippage: '0',
            isNextAsset: typeof receive_local === 'boolean' ? receive_local : false,
          }

        setEstimatedValues(_estimatedValues)
      }

      const _newSlippage =
        _estimatedValues?.destinationSlippage && _estimatedValues?.originSlippage ?
          Number(((Number(_estimatedValues.destinationSlippage) + Number(_estimatedValues.originSlippage)) * 100).toFixed(2)) :
          null

      setNewSlippage(!_newSlippage || _newSlippage < 0 ? DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE : _newSlippage)
    }
  }

  const update = async () => {
    setUpdating(true)

    if (sdk && signer) {
      let failed, params

      switch (error_status) {
        case XTransferErrorStatus.LowSlippage:
          try {
            const newSlippageInBps = newSlippage * 100

            params = {
              domainId: destination_domain,
              transferId: transfer_id,
              slippage: newSlippageInBps.toString(),
            }

            console.log(
              '[updateSlippage]',
              {
                params,
              },
            )

            const request = await sdk.sdkBase.updateSlippage(params)

            if (request) {
              try {
                let gasLimit = await signer.estimateGas(request)

                if (gasLimit) {
                  gasLimit =
                    FixedNumber.fromString(gasLimit.toString())
                      .mulUnsafe(
                        FixedNumber.fromString(GAS_LIMIT_ADJUSTMENT.toString())
                      )
                      .round(0)
                      .toString()
                      .replace('.0', '')

                  request.gasLimit = gasLimit
                }
              } catch (error) {}

              const response = await signer.sendTransaction(request)

              const {
                hash,
              } = { ...response }

              setUpdateProcessing(true)

              const receipt = await signer.provider.waitForTransaction(hash)

              const {
                transactionHash,
                status,
              } = { ...receipt }

              failed = !status

              setUpdateResponse(
                {
                  status: failed ? 'failed' : 'success',
                  message: failed ? 'Failed to send transaction' : 'Update slippage successful',
                  tx_hash: hash,
                }
              )

              if (!failed && onSlippageUpdated) {
                onSlippageUpdated(params.slippage)
              }
            }
          } catch (error) {
            const response = parseError(error)

            console.log(
              '[updateSlippage error]',
              {
                params,
                error,
              },
            )

            const {
              code,
            } = { ...response }

            switch (code) {
              case 'user_rejected':
                break
              default:
                setUpdateResponse(
                  {
                    status: 'failed',
                    ...response,
                  }
                )
                break
            }

            failed = true
          }
          break
        case XTransferErrorStatus.LowRelayerFee:
          try {
            const relayer_fee_to_bump = relayer_fee && newRelayerFee ? (Number(newRelayerFee) - Number(relayer_fee)).toFixed(18) : null

            params = {
              domainId: origin_domain,
              transferId: transfer_id,
              asset: ['transacting'].includes(relayerFeeAssetType) ? origin_transacting_asset : constants.AddressZero,
              relayerFee: utils.parseEther(relayer_fee_to_bump || '0').toString(),
            }

            console.log(
              '[bumpTransfer]',
              {
                params,
              },
            )

            const request = await sdk.sdkBase.bumpTransfer(params)

            if (request) {
              try {
                let gasLimit = await signer.estimateGas(request)

                if (gasLimit) {
                  gasLimit =
                    FixedNumber.fromString(gasLimit.toString())
                      .mulUnsafe(
                        FixedNumber.fromString(GAS_LIMIT_ADJUSTMENT.toString())
                      )
                      .round(0)
                      .toString()
                      .replace('.0', '')

                  request.gasLimit = gasLimit
                }
              } catch (error) {}

              const response = await signer.sendTransaction(request)

              const {
                hash,
              } = { ...response }

              setUpdateProcessing(true)

              const receipt = await signer.provider.waitForTransaction(hash)

              const {
                transactionHash,
                status,
              } = { ...receipt }

              failed = !status

              setUpdateResponse(
                {
                  status: failed ? 'failed' : 'success',
                  message: failed ? 'Failed to send transaction' : 'Bump transfer successful',
                  tx_hash: hash,
                }
              )

              if (!failed && onTransferBumped) {
                dispatch(
                  {
                    type: LATEST_BUMPED_TRANSFERS_DATA,
                    value: transfer_id,
                  }
                )

                onTransferBumped(
                  {
                    relayer_fee: params.relayerFee,
                    relayer_fees: {
                      [params.asset]: params.relayerFee,
                    },
                  }
                )
              }
            }
          } catch (error) {
            const response = parseError(error)

            console.log(
              '[bumpTransfer error]',
              {
                params,
                error,
              },
            )

            const {
              code,
            } = { ...response }
            let {
              message,
            } = { ...response }

            if (message?.includes('insufficient funds')) {
              message = 'Insufficient Balance'
            }

            switch (code) {
              case 'user_rejected':
                break
              default:
                setUpdateResponse(
                  {
                    status: 'failed',
                    ...response,
                    message,
                  }
                )
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

  const disabled = forceDisabled || updating

  const chain_data = error_status === XTransferErrorStatus.LowSlippage ? destination_chain_data : source_chain_data

  const wrong_chain = chain_id !== chain_data?.chain_id && !updateResponse

  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  return (
    data && buttonTitle &&
    // (error_status !== XTransferErrorStatus.LowRelayerFee || relayer_fee_to_bump > 0) &&
    (
      <Modal
        hidden={hidden || ![XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.LowSlippage].includes(error_status)}
        disabled={disabled}
        onClick={() => setHidden(false)}
        buttonTitle={buttonTitle}
        buttonClassName="rounded flex items-center justify-center"
        title={
          <div className="flex items-center justify-between">
            <span className="normal-case">
              Action Required: {
                error_status === XTransferErrorStatus.LowSlippage ?
                  'Slippage exceeded' :
                  error_status === XTransferErrorStatus.LowRelayerFee ?
                    'Relayer fee insufficient' :
                    error_status
              }
            </span>
            <div
              onClick={() => reset()}
              className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-full p-2"
            >
              <BiX
                size={18}
              />
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
                    <span className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold space-x-1.5">
                      <DecimalsFormat
                        value={_slippage}
                        suffix="%"
                        className="text-sm"
                      />
                    </span>
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

                                      if (!isNaN(value)) {
                                        value = Number(value)
                                      }
                                    }

                                    value =
                                      value <= 0 || value > 100 ?
                                        DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE :
                                        value

                                    setNewSlippage(
                                      value && !isNaN(value) ?
                                        parseFloat(Number(value).toFixed(2)) :
                                        value
                                    )
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
                                <BiCheckCircle
                                  size={16}
                                />
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
                              <Oval
                                width="20"
                                height="20"
                                color={loaderColor(theme)}
                              /> :
                              <>
                                <DecimalsFormat
                                  value={newSlippage}
                                  suffix="%"
                                  className="text-sm font-semibold"
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
                                  <BiEditAlt
                                    size={16}
                                  />
                                </button>
                              </>
                            }
                          </div>
                        }
                      </div>
                    </div>
                    {
                      typeof newSlippage === 'number' && (estimated_slippage > newSlippage || newSlippage < 0.2 || newSlippage > 5.0) &&
                      (
                        <div className="flex items-start space-x-1">
                          <IoWarning
                            size={14}
                            className="min-w-max text-yellow-500 dark:text-yellow-400 mt-0.5"
                          />
                          <div className="text-yellow-500 dark:text-yellow-400 text-xs">
                            {estimated_slippage > newSlippage ?
                              <>
                                Slippage tolerance is too low
                                <br />
                                (use a larger amount or set tolerance higher)
                              </> :
                              newSlippage < 0.2 ?
                                'Your transfer may not complete due to low slippage tolerance.' :
                                'Your transfer may be frontrun due to high slippage tolerance.'
                            }
                          </div>
                        </div>
                      )
                    }
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
                          {Object.entries(relayer_fees)
                            .map(([k, v]) => {
                              return (
                                <span
                                  key={k}
                                  className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold space-x-1.5"
                                >
                                  <DecimalsFormat
                                    value={utils.formatUnits(v || '0', k === constants.AddressZero ? source_gas_decimals : source_decimals)}
                                    className="text-sm"
                                  />
                                  <span>
                                    {k === constants.AddressZero ? source_gas_native_token?.symbol : source_symbol}
                                  </span>
                                </span>
                              )
                            })
                          }
                        </div> :
                        <span className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold space-x-1.5">
                          <DecimalsFormat
                            value={relayer_fee}
                            className="text-sm"
                          />
                          <span>
                            {source_gas_native_token?.symbol}
                          </span>
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
                          <DecimalsFormat
                            value={relayer_fee_to_bump && relayer_fee_to_bump > 0 ? relayer_fee_to_bump : 0}
                            className="text-sm"
                          />
                          {is_staging || true ?
                            <select
                              disabled={disabled}
                              value={relayerFeeAssetType}
                              onChange={e => setRelayerFeeAssetType(e.target.value)}
                              className="bg-slate-100 dark:bg-slate-800 rounded border-0 focus:ring-0"
                            >
                              {RELAYER_FEE_ASSET_TYPES.map((t, i) => {
                                return (
                                  <option
                                    key={i}
                                    title={`${t} asset`}
                                    value={t}
                                  >
                                    {t === 'transacting' ? source_symbol : source_gas_native_token?.symbol}
                                  </option>
                                )
                              })}
                            </select> :
                            <span>
                              {relayerFeeAssetType === 'transacting' ? source_symbol : source_gas_native_token?.symbol}
                            </span>
                          }
                        </span>
                      }
                    </div>
                  </div>
                </> :
                null
            }
            {
              browser_provider &&
              (
                (
                  ['string', 'number'].includes(typeof (error_status === XTransferErrorStatus.LowSlippage ? newSlippage : error_status === XTransferErrorStatus.LowRelayerFee ? newRelayerFee : null)) &&
                  ![''].includes(error_status === XTransferErrorStatus.LowSlippage ? newSlippage : error_status === XTransferErrorStatus.LowRelayerFee ? newRelayerFee : null)
                ) ||
                wrong_chain
              ) ?
                wrong_chain ?
                  <Wallet
                    connectChainId={chain_data?.chain_id}
                    className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base font-medium space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                  >
                    <span className="mr-1.5 sm:mr-2">
                      {is_walletconnect ? 'Reconnect' : 'Switch'} to
                    </span>
                    {
                      chain_data?.image &&
                      (
                        <Image
                          src={chain_data.image}
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      )
                    }
                    <span className="font-semibold">
                      {chain_data?.name}
                    </span>
                  </Wallet> :
                  !updateResponse && !updating &&
                  ['string', 'number'].includes(typeof (error_status === XTransferErrorStatus.LowSlippage ? newSlippage : error_status === XTransferErrorStatus.LowRelayerFee ? newRelayerFee : null)) &&
                  ![''].includes(error_status === XTransferErrorStatus.LowSlippage ? newSlippage : error_status === XTransferErrorStatus.LowRelayerFee ? newRelayerFee : null) &&
                  (error_status === XTransferErrorStatus.LowSlippage ? newSlippage <= _slippage : error_status === XTransferErrorStatus.LowRelayerFee ? !newRelayerFee : null) ?
                    <Alert
                      color="bg-red-400 dark:bg-red-500 text-white text-sm font-medium"
                      icon={
                        <BiMessageError
                          className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                        />
                      }
                      closeDisabled={true}
                      rounded={true}
                      className="rounded p-4.5"
                    >
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
                      error_status === XTransferErrorStatus.LowRelayerFee && relayer_fee && newRelayerFee && relayer_fee_to_bump <= 0 ?
                        <Alert
                          color="bg-blue-400 dark:bg-blue-500 text-white text-base"
                          icon={null}
                          closeDisabled={true}
                          rounded={true}
                          className="rounded p-4.5"
                        >
                          <div className="flex items-center justify-center space-x-2">
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
                          className={
                            `w-full ${
                              disabled ?
                                'bg-blue-400 dark:bg-blue-500' :
                                'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                            } rounded flex items-center justify-center text-white text-base py-3 sm:py-4 px-2 sm:px-3`
                          }
                        >
                          <span className={`flex items-center justify-center ${updating && updateProcessing ? 'space-x-3 ml-1.5' : 'space-x-3'}`}>
                            {
                              disabled &&
                              (
                                <TailSpin
                                  width="20"
                                  height="20"
                                  color="white"
                                />
                              )
                            }
                            <span>
                              {updating ? updateProcessing ? 'Update in progress ...' : 'Please Confirm' : 'Apply'}
                            </span>
                          </span>
                        </button> :
                      (updateResponse || estimateResponse) &&
                      toArray(updateResponse || estimateResponse)
                        .map((r, i) => {
                          const {
                            status,
                            message,
                            code,
                            tx_hash,
                          } = { ...r }

                          return (
                            <Alert
                              key={i}
                              color={
                                `${
                                  status === 'failed' ?
                                    'bg-red-400 dark:bg-red-500' :
                                    status === 'success' ?
                                      'bg-green-400 dark:bg-green-500' :
                                      'bg-blue-400 dark:bg-blue-500'
                                } text-white text-base`
                              }
                              icon={
                                status === 'failed' ?
                                  <BiMessageError
                                    className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                  /> :
                                  status === 'success' ?
                                    <BiMessageCheck
                                      className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                    /> :
                                    <BiMessageDetail
                                      className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                    />
                              }
                              closeDisabled={true}
                              rounded={true}
                              className="rounded p-4.5"
                            >
                              <div className="flex items-center justify-between space-x-2">
                                <span className="break-all text-sm font-medium">
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
                                        href={`${url}${transaction_path?.replace('{tx}', r.tx_hash)}`}
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
                    disabled={true}
                    className="w-full bg-slate-100 dark:bg-slate-800 cursor-not-allowed rounded text-slate-400 dark:text-slate-500 text-base text-center py-3 sm:py-4 px-2 sm:px-3"
                  >
                    Apply
                  </button> :
                  <Wallet
                    connectChainId={chain_data?.chain_id}
                    buttonConnectTitle="Connect Wallet"
                    className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base font-medium text-center sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                  >
                    <span>
                      Connect Wallet
                    </span>
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
  )
}
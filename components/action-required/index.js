import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { BigNumber, FixedNumber, constants, utils } from 'ethers'
import { XTransferErrorStatus } from '@connext/nxtp-utils'
import { TailSpin, Oval } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { BiX, BiMessageError, BiMessageCheck, BiMessageDetail, BiEditAlt, BiCheckCircle } from 'react-icons/bi'
import { IoWarning } from 'react-icons/io5'

import Modal from '../modals'
import Image from '../image'
import Wallet from '../wallet'
import Alert from '../alerts'
import Copy from '../copy'
import DecimalsFormat from '../decimals-format'
import { number_format, ellipse, equals_ignore_case, loader_color, error_patterns } from '../../lib/utils'

const ROUTER_FEE_PERCENT =
  Number(
    process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT
  ) ||
  0.05

const GAS_LIMIT_ADJUSTMENT =
  Number(
    process.env.NEXT_PUBLIC_GAS_LIMIT_ADJUSTMENT
  ) ||
  1

const DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE =
  Number(
    process.env.NEXT_PUBLIC_DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE
  ) ||
  3

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
  const {
    preferences,
    chains,
    assets,
    dev,
    wallet,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
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
    wallet_data,
  } = { ...wallet }
  const {
    sdk,
  } = { ...dev }
  const {
    chain_id,
    provider,
    web3_provider,
    address,
    signer,
  } = { ...wallet_data }

  const [hidden, setHidden] = useState(initialHidden)
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [newSlippage, setNewSlippage] = useState(null)
  const [slippageEditing, setSlippageEditing] = useState(false)
  const [newRelayerFee, setNewRelayerFee] = useState(null)
  const [estimatedValues, setEstimatedValues] = useState(undefined)
  const [estimateResponse, setEstimateResponse] = useState(null)

  const [updating, setUpdating] = useState(null)
  const [updateProcessing, setUpdateProcessing] = useState(null)
  const [updateResponse, setUpdateResponse] = useState(null)

  useEffect(
    () => {
      if (
        !_.isEqual(
          transferData,
          data,
        )
      ) {
        setData(transferData)
      }
      else if (
        data &&
        !loaded
      ) {
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

  const reset = () => {
    setHidden(true)
    setData(null)
    setLoaded(false)
    setNewSlippage(null)
    setSlippageEditing(false)
    setNewRelayerFee(null)
    setEstimatedValues(undefined)
    setUpdating(null)
    setUpdateProcessing(null)
    setUpdateResponse(null)
  }

  const estimate = async () => {
    if (!updateResponse) {
      if (
        (
          source_contract_data ||
          destination_contract_data
        ) &&
        [
          'string',
          'number',
        ]
        .includes(typeof source_amount) &&
        ![
          '',
        ]
        .includes(source_amount) &&
        !isNaN(source_amount)
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
            const {
              decimals,
            } = { ...nativeCurrency }

            const params = {
              originDomain: source_chain_data?.domain_id,
              destinationDomain: destination_chain_data?.domain_id,
              isHighPriority: true,
            }

            try {
              console.log(
                '[action required]',
                '[estimateRelayerFee]',
                params,
              )

              const response =
                await sdk.sdkBase
                  .estimateRelayerFee(
                    params,
                  )

              const gasFee =
                response &&
                utils.formatUnits(
                  response,
                  decimals ||
                  18,
                )

              console.log(
                '[action required]',
                '[relayerFee]',
                {
                  params,
                  response,
                  gasFee,
                },
              )

              setNewRelayerFee(gasFee)
            } catch (error) {
              const message =
                error?.reason ||
                error?.data?.message ||
                error?.message

              console.log(
                '[action required]',
                '[estimateRelayerFee error]',
                params,
                error,
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

              setEstimateResponse(
                {
                  status: 'failed',
                  message,
                  code,
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

      const originTokenAddress =
        (
          equals_ignore_case(
            source_contract_data?.contract_address,
            constants.AddressZero,
          ) ?
            _source_contract_data :
            source_contract_data
        )?.contract_address

      let destinationTokenAddress = _destination_contract_data?.contract_address

      const amount =
        utils.parseUnits(
          (
            _amount ||
            0
          )
          .toString(),
          source_decimals,
        )

      const isNextAsset =
        typeof receive_local === 'boolean' ?
          receive_local :
          equals_ignore_case(
            destination_contract_data?.contract_address,
            _destination_contract_data?.next_asset?.contract_address,
          )

      if (isNextAsset) {
        destinationTokenAddress =
          _destination_contract_data?.next_asset?.contract_address ||
          destinationTokenAddress
      }

      let manual,
        _estimatedValues

      try {
        setEstimatedValues(null)
        setEstimateResponse(null)

        if (
          amount
            .gt(
              BigNumber.from(
                '0'
              )
            )
        ) {
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

          const response =
            await sdk.sdkPool
              .calculateAmountReceived(
                originDomain,
                destinationDomain,
                originTokenAddress,
                amount,
                isNextAsset,
              )

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
                  return [
                    k,
                    utils.formatUnits(
                      v,
                      [
                        'amountReceived',
                      ]
                      .includes(k) ?
                        (
                          isNextAsset &&
                          _destination_contract_data?.next_asset ?
                            _destination_contract_data?.next_asset?.decimals :
                            destination_contract_data?.decimals
                        ) ||
                        18 :
                        source_decimals,
                    ),
                  ]
                })
            )

          setEstimatedValues(_estimatedValues)
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

        if (
          [
            'reverted',
            'invalid BigNumber value',
          ].findIndex(s =>
            message?.includes(s)
          ) > -1
        ) {
          manual = true
        }
        else {
          setEstimateResponse(
            {
              status: 'failed',
              message,
              code,
            }
          )
        }
      }

      if (manual) {
        const routerFee =
          parseFloat(
            (
              Number(_amount) *
              ROUTER_FEE_PERCENT /
              100
            )
            .toFixed(source_decimals)
          )

        _estimatedValues =
          {
            amountReceived: Number(_amount) - routerFee,
            routerFee,
            destinationSlippage: '0',
            originSlippage: '0',
            isNextAsset:
              typeof receive_local === 'boolean' ?
                receive_local :
                false,
          }

        setEstimatedValues(_estimatedValues)
      }

      const _newSlippage =
        _estimatedValues?.destinationSlippage &&
        _estimatedValues?.originSlippage ?
          Number(
            (
              (
                Number(_estimatedValues.destinationSlippage) +
                Number(_estimatedValues.originSlippage)
              ) * 100
            )
            .toFixed(2)
          ) :
          null

      setNewSlippage(
        !_newSlippage ||
        _newSlippage < 0 ?
          DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE :
          _newSlippage
      )
    }
  }

  const update = async () => {
    setUpdating(true)

    if (
      sdk &&
      signer
    ) {
      let failed,
        params

      switch (error_status) {
        case XTransferErrorStatus.LowSlippage:
          try {
            const newSlippageInBps = newSlippage * 100

            params = {
              domainId: origin_domain,
              transferId: transfer_id,
              slippage: newSlippageInBps.toString(),
            }

            console.log(
              '[updateSlippage]',
              {
                params,
              },
            )

            const request =
              await sdk.sdkBase
                .updateSlippage(
                  params,
                )

            if (request) {
              try {
                let gasLimit =
                  await signer
                    .estimateGas(
                      request,
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

                  request.gasLimit = gasLimit
                }
              } catch (error) {}

              const response =
                await signer
                  .sendTransaction(
                    request,
                  )

              const {
                hash,
              } = { ...response }

              setUpdateProcessing(true)

              const receipt =
                await signer.provider
                  .waitForTransaction(
                    hash,
                  )

              const {
                transactionHash,
                status,
              } = { ...receipt }

              failed = !status

              setUpdateResponse(
                {
                  status:
                    failed ?
                      'failed' :
                      'success',
                  message:
                    failed ?
                      'Failed to send transaction' :
                      'Update slippage successful',
                  tx_hash: hash,
                }
              )

              if (
                !failed &&
                onSlippageUpdated
              ) {
                onSlippageUpdated(
                  params.slippage,
                )
              }
            }
          } catch (error) {
            let message = 
              error?.reason ||
              error?.data?.message ||
              error?.message

            console.log(
              '[updateSlippage error]',
              {
                params,
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
                break
              default:
                setUpdateResponse(
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
          break
        case XTransferErrorStatus.LowRelayerFee:
          try {
            params = {
              domainId: origin_domain,
              transferId: transfer_id,
              relayerFee:
                utils.parseUnits(
                  (
                    newRelayerFee ||
                    0
                  )
                  .toString(),
                  18,
                )
                .toString(),
            }

            console.log(
              '[bumpTransfer]',
              {
                params,
              },
            )

            const request =
              await sdk.sdkBase
                .bumpTransfer(
                  params,
                )

            if (request) {
              try {
                let gasLimit =
                  await signer
                    .estimateGas(
                      request,
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

                  request.gasLimit = gasLimit
                }
              } catch (error) {}

              const response =
                await signer
                  .sendTransaction(
                    request,
                  )

              const {
                hash,
              } = { ...response }

              setUpdateProcessing(true)

              const receipt =
                await signer.provider
                  .waitForTransaction(
                    hash,
                  )

              const {
                transactionHash,
                status,
              } = { ...receipt }

              failed = !status

              setUpdateResponse(
                {
                  status:
                    failed ?
                      'failed' :
                      'success',
                  message:
                    failed ?
                      'Failed to send transaction' :
                      'Bump transfer successful',
                  tx_hash: hash,
                }
              )

              if (
                !failed &&
                onTransferBumped
              ) {
                onTransferBumped(
                  params.relayerFee,
                )
              }
            }
          } catch (error) {
            let message = 
              error?.reason ||
              error?.data?.message ||
              error?.message

            console.log(
              '[bumpTransfer error]',
              {
                params,
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
                    message,
                    code,
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

  const {
    transfer_id,
    error_status,
    origin_chain,
    origin_domain,
    origin_transacting_asset,
    origin_transacting_amount,
    origin_bridged_asset,
    origin_bridged_amount,
    destination_chain,
    destination_domain,
    destination_transacting_asset,
    destination_transacting_amount,
    destination_local_asset,
    destination_local_amount,
    slippage,
    receive_local,
    to,
  } = { ...data }
  let {
    relayer_fee,
  } = { ...data }

  const source_chain_data = (chains_data || [])
    .find(c =>
      c?.chain_id === Number(origin_chain) ||
      c?.domain_id === origin_domain
    )

  const {
    explorer,
  } = { ...source_chain_data }
  const {
    url,
    transaction_path,
  } = { ...explorer }

  const source_asset_data = (assets_data || [])
    .find(a =>
      (a?.contracts || [])
        .findIndex(c =>
          c?.chain_id === source_chain_data?.chain_id &&
          [
            origin_transacting_asset,
            origin_bridged_asset,
          ].findIndex(_a =>
            [
              c?.next_asset?.contract_address,
              c?.contract_address,
            ]
            .filter(__a => __a)
            .findIndex(__a =>
              equals_ignore_case(
                __a,
                _a,
              )
            ) > -1
          ) > -1
        ) > -1
    )

  let source_contract_data = (source_asset_data?.contracts || [])
    .find(c =>
      c?.chain_id === source_chain_data?.chain_id
    )

  const _source_contract_data = _.cloneDeep(source_contract_data)

  if (
    source_contract_data?.next_asset &&
    equals_ignore_case(
      source_contract_data.next_asset.contract_address,
      origin_transacting_asset,
    )
  ) {
    source_contract_data = {
      ...source_contract_data,
      ...source_contract_data.next_asset,
    }

    delete source_contract_data.next_asset
  }

  if (
    !source_contract_data &&
    equals_ignore_case(
      origin_transacting_asset,
      constants.AddressZero,
    )
  ) {
    const {
      nativeCurrency,
    } = {
      ...(
        _.head(source_chain_data?.provider_params)
      ),
    }
    const {
      symbol,
    } = { ...nativeCurrency }

    const _source_asset_data = (assets_data || [])
      .find(a =>
        [
          a?.id,
          a?.symbol,
        ].findIndex(s =>
          equals_ignore_case(
            s,
            symbol,
          )
        ) > -1
      )

    source_contract_data = {
      ...(
        (_source_asset_data?.contracts || [])
          .find(c =>
            c?.chain_id === source_chain_data?.chain_id,
          )
      ),
      contract_address: origin_transacting_asset,
      ...nativeCurrency,
    }
  }

  const source_symbol =
    source_contract_data?.symbol ||
    source_asset_data?.symbol

  const source_decimals =
    source_contract_data?.decimals ||
    18

  const source_gas_native_token = _.head(source_chain_data?.provider_params)?.nativeCurrency

  const source_asset_image =
    source_contract_data?.image ||
    source_asset_data?.image

  const source_amount =
    _.head(
      [
        origin_transacting_amount,
      ]
      .map(a =>
        [
          'number',
          'string',
        ]
        .includes(typeof a) &&
        Number(
          utils.formatUnits(
            BigNumber.from(
              BigInt(a)
                .toString()
            ),
            source_decimals,
          )
        )
      )
      .filter(a =>
        typeof a === 'number'
      )
    )

  const destination_chain_data = (chains_data || [])
    .find(c =>
      c?.chain_id === Number(destination_chain) ||
      c?.domain_id === destination_domain
    )

  const destination_asset_data = (assets_data || [])
    .find(a =>
      (a?.contracts || [])
        .findIndex(c =>
          c?.chain_id === destination_chain_data?.chain_id &&
          [
            destination_transacting_asset,
            equals_ignore_case(
              source_asset_data?.id,
              a?.id,
            ) ?
              receive_local ?
                c?.next_asset?.contract_address :
                c?.contract_address :
              destination_local_asset,
          ].findIndex(_a =>
            [
              c?.next_asset?.contract_address,
              c?.contract_address,
            ]
            .filter(__a => __a)
            .findIndex(__a =>
              equals_ignore_case(
                __a,
                _a,
              )
            ) > -1
          ) > -1
        ) > -1
    )

  const _destination_contract_data = _.cloneDeep(destination_contract_data)

  let destination_contract_data = (destination_asset_data?.contracts || [])
    .find(c =>
      c?.chain_id === destination_chain_data?.chain_id
    )

  if (
    destination_contract_data?.next_asset &&
    (
      equals_ignore_case(
        destination_contract_data.next_asset.contract_address,
        destination_transacting_asset,
      ) ||
      receive_local
    )
  ) {
    destination_contract_data = {
      ...destination_contract_data,
      ...destination_contract_data.next_asset,
    }

    delete destination_contract_data.next_asset
  }

  if (
    !destination_contract_data &&
    equals_ignore_case(
      destination_transacting_asset,
      constants.AddressZero,
    )
  ) {
    const {
      nativeCurrency,
    } = {
      ...(
        _.head(destination_chain_data?.provider_params)
      ),
    }
    const {
      symbol,
    } = { ...nativeCurrency }

    const _destination_asset_data = (assets_data || [])
      .find(a =>
        [
          a?.id,
          a?.symbol,
        ].findIndex(s =>
          equals_ignore_case(
            s,
            symbol,
          )
        ) > -1
      )

    destination_contract_data = {
      ...(
        (_destination_asset_data?.contracts || [])
          .find(c =>
            c?.chain_id === destination_chain_data?.chain_id,
          )
      ),
      contract_address: destination_transacting_asset,
      ...nativeCurrency,
    }
  }

  const destination_symbol =
    destination_contract_data?.symbol ||
    destination_asset_data?.symbol

  const destination_decimals =
    destination_contract_data?.decimals ||
    18

  const destination_asset_image =
    destination_contract_data?.image ||
    destination_asset_data?.image

  const destination_amount =
    _.head(
      [
        destination_transacting_amount,
      ]
      .map(a =>
        [
          'number',
          'string',
        ]
        .includes(typeof a) &&
        Number(
          utils.formatUnits(
            BigNumber.from(
              BigInt(a)
                .toString()
            ),
            destination_decimals,
          )
        )
      )
      .filter(a =>
        typeof a === 'number'
      )
    ) ||
    (
      source_amount *
      (
        1 -
        ROUTER_FEE_PERCENT / 100
      )
    )

  const _slippage = slippage / 100

  const estimated_slippage =
    estimatedValues?.destinationSlippage &&
    estimatedValues?.originSlippage ?
      (
        Number(estimatedValues.destinationSlippage) +
        Number(estimatedValues.originSlippage)
      ) * 100 :
      null

  relayer_fee =
    utils.formatUnits(
      BigNumber.from(
        relayer_fee ||
        '0'
      ),
      source_gas_native_token?.decimals ||
      18,
    )

  const disabled =
    forceDisabled ||
    updating

  const wrong_chain =
    source_chain_data &&
    chain_id !== source_chain_data.chain_id &&
    !updateResponse

  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  return (
    data &&
    buttonTitle &&
    (
      <Modal
        hidden={hidden}
        disabled={disabled}
        onClick={() => setHidden(false)}
        buttonTitle={buttonTitle}
        buttonClassName={`${disabled ? ''/*'cursor-not-allowed'*/ : ''} rounded flex items-center justify-center`}
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
            {
              error_status === XTransferErrorStatus.LowSlippage ?
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
                      {
                        <span className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold space-x-1.5">
                          <DecimalsFormat
                            value={
                              Number(_slippage) >= 1000 ?
                                number_format(
                                  _slippage,
                                  '0,0.000000000000',
                                  true,
                                ) :
                                Number(_slippage) <= 0 ?
                                  '0' :
                                  _slippage
                            }
                            suffix="%"
                            className="text-sm"
                          />
                        </span>
                      }
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
                                  value={
                                    typeof newSlippage === 'number' &&
                                    newSlippage >= 0 ?
                                      newSlippage :
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
                                        DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE :
                                        value

                                    setNewSlippage(
                                      value &&
                                      !isNaN(value) ?
                                        parseFloat(
                                          Number(value)
                                            .toFixed(2)
                                        ) :
                                        value
                                    )
                                  }}
                                  onWheel={e => e.target.blur()}
                                  onKeyDown={e =>
                                    [
                                      'e',
                                      'E',
                                      '-',
                                    ]
                                    .includes(e.key) &&
                                    e.preventDefault()
                                  }
                                  className={`w-20 bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 rounded border-0 focus:ring-0 text-sm font-semibold text-right py-1 px-2`}
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
                                {
                                  [
                                    3.0,
                                    1.0,
                                    0.5,
                                  ]
                                  .map((s, i) => (
                                    <div
                                      key={i}
                                      onClick={() => {
                                        setNewSlippage(s)
                                        setSlippageEditing(false)
                                      }}
                                      className={`${newSlippage === s ? 'bg-slate-200 dark:bg-slate-700 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium hover:font-semibold'} rounded cursor-pointer text-xs py-1 px-1.5`}
                                    >
                                      {s} %
                                    </div>
                                  ))
                                }
                              </div>
                            </> :
                            <div className="flex items-center space-x-1.5">
                              {
                                !newSlippage &&
                                !estimateResponse ?
                                  <Oval
                                    color={loader_color(theme)}
                                    width="20"
                                    height="20"
                                  /> :
                                  <>
                                    <span className="text-sm font-semibold">
                                      {number_format(
                                        newSlippage,
                                        '0,0.00',
                                      )}%
                                    </span>
                                    <button
                                      disabled={disabled}
                                      onClick={() => {
                                        if (!disabled) {
                                          setSlippageEditing(true)
                                        }
                                      }}
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
                        typeof newSlippage === 'number' &&
                        (
                          estimated_slippage > newSlippage ||
                          newSlippage < 0.2 ||
                          newSlippage > 5.0
                        ) &&
                        (
                          <div className="flex items-start space-x-1">
                            <IoWarning
                              size={14}
                              className="min-w-max text-yellow-500 dark:text-yellow-400 mt-0.5"
                            />
                            <div className="text-yellow-500 dark:text-yellow-400 text-xs">
                              {
                                estimated_slippage > newSlippage ?
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
                        {
                          <span className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold space-x-1.5">
                            <DecimalsFormat
                              value={
                                Number(relayer_fee) >= 1000 ?
                                  number_format(
                                    relayer_fee,
                                    '0,0.000000000000',
                                    true,
                                  ) :
                                  Number(relayer_fee) <= 0 ?
                                    '0' :
                                    relayer_fee
                              }
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
                          New relayer fee
                        </div>
                        {
                          !newRelayerFee &&
                          !estimateResponse ?
                            <Oval
                              color={loader_color(theme)}
                              width="20"
                              height="20"
                            /> :
                            <span className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold space-x-1.5">
                              <DecimalsFormat
                                value={
                                  Number(newRelayerFee) >= 1000 ?
                                    number_format(
                                      newRelayerFee,
                                      '0,0.000000000000',
                                      true,
                                    ) :
                                    Number(newRelayerFee) <= 0 ?
                                      '0' :
                                      newRelayerFee
                                }
                                className="text-sm"
                              />
                              <span>
                                {source_gas_native_token?.symbol}
                              </span>
                            </span>
                        }
                      </div>
                    </div>
                  </> :
                  null
            }
            {
              web3_provider &&
              (
                (
                  [
                    'string',
                    'number',
                  ]
                  .includes(
                    typeof (
                      error_status === XTransferErrorStatus.LowSlippage ?
                        newSlippage :
                        error_status === XTransferErrorStatus.LowRelayerFee ?
                          newRelayerFee :
                          null
                    )
                  ) &&
                  ![
                    '',
                  ]
                  .includes(
                    error_status === XTransferErrorStatus.LowSlippage ?
                      newSlippage :
                      error_status === XTransferErrorStatus.LowRelayerFee ?
                        newRelayerFee :
                        null
                  )
                ) ||
                (
                  web3_provider &&
                  wrong_chain
                )
              ) ?
                web3_provider &&
                wrong_chain ?
                  <Wallet
                    connectChainId={source_chain_data?.chain_id}
                    className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded flex items-center justify-center text-white text-base font-medium space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                  >
                    <span className="mr-1.5 sm:mr-2">
                      {is_walletconnect ?
                        'Reconnect' :
                        'Switch'
                      } to
                    </span>
                    {
                      source_chain_data?.image &&
                      (
                        <Image
                          src={source_chain_data.image}
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      )
                    }
                    <span className="font-semibold">
                      {source_chain_data?.name}
                    </span>
                  </Wallet> :
                  !updateResponse &&
                  !updating &&
                  [
                    'string',
                    'number',
                  ]
                  .includes(
                    typeof (
                      error_status === XTransferErrorStatus.LowSlippage ?
                        newSlippage :
                        error_status === XTransferErrorStatus.LowRelayerFee ?
                          newRelayerFee :
                          null
                    )
                  ) &&
                  ![
                    '',
                  ]
                  .includes(
                    error_status === XTransferErrorStatus.LowSlippage ?
                      newSlippage :
                      error_status === XTransferErrorStatus.LowRelayerFee ?
                        newRelayerFee :
                        null
                  ) &&
                  (
                    error_status === XTransferErrorStatus.LowSlippage ?
                      newSlippage <= _slippage :
                      error_status === XTransferErrorStatus.LowRelayerFee ?
                        !newRelayerFee :
                        null
                  ) ?
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
                        {
                          error_status === XTransferErrorStatus.LowSlippage &&
                          newSlippage <= _slippage ?
                            'New amount must be higher than existing slippage tolerance' :
                            error_status === XTransferErrorStatus.LowRelayerFee &&
                            !newRelayerFee ?
                              'Cannot estimate the relayer fee at the moment. Please try again later.' :
                              ''
                        }
                      </span>
                    </Alert> :
                    !updateResponse &&
                    !estimateResponse ?
                      error_status === XTransferErrorStatus.LowRelayerFee &&
                      relayer_fee &&
                      newRelayerFee &&
                      relayer_fee > newRelayerFee ?
                        <Alert
                          color="bg-green-400 dark:bg-green-500 text-white text-base"
                          icon={
                            <BiMessageCheck
                              className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                            />
                          }
                          closeDisabled={true}
                          rounded={true}
                          className="rounded p-4.5"
                        >
                          <div className="flex items-center justify-between space-x-2">
                            <span className="break-all text-sm font-medium">
                              Processing ...
                            </span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => reset()}
                                className="bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center text-white p-1"
                              >
                                <MdClose
                                  size={14}
                                />
                              </button>
                            </div>
                          </div>
                        </Alert> :
                        <button
                          disabled={disabled}
                          onClick={() => {
                            setSlippageEditing(false)
                            update()
                          }}
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
                                  color="white"
                                  width="20"
                                  height="20"
                                />
                              )
                            }
                            <span>
                              {updating ?
                                updateProcessing ?
                                  'Update in progress ...' :
                                  'Please Confirm' :
                                'Apply'
                              }
                            </span>
                          </span>
                        </button> :
                      (
                        updateResponse ||
                        estimateResponse
                      ) &&
                      (
                        [
                          updateResponse ||
                          estimateResponse,
                        ]
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
                              color={`${status === 'failed' ? 'bg-red-400 dark:bg-red-500' : status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
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
                        })
                      ) :
                web3_provider ?
                  <button
                    disabled={true}
                    className="w-full bg-slate-100 dark:bg-slate-800 cursor-not-allowed rounded text-slate-400 dark:text-slate-500 text-base text-center py-3 sm:py-4 px-2 sm:px-3"
                  >
                    Apply
                  </button> :
                  <Wallet
                    connectChainId={source_chain_data?.chain_id}
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
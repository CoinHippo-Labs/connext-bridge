import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { XTransferStatus } from '@connext/nxtp-utils'
import { BigNumber, Contract, FixedNumber, constants, utils } from 'ethers'
import Switch from 'react-switch'
import { TailSpin, Oval, Watch } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { BiMessageError, BiMessageCheck, BiMessageDetail, BiMessageEdit, BiEditAlt, BiCheckCircle } from 'react-icons/bi'
import { GiPartyPopper } from 'react-icons/gi'

import Announcement from '../announcement'
import PoweredBy from '../powered-by'
import Options from './options'
import SelectChain from '../select/chain'
import SelectBridgeAsset from '../select/asset/bridge'
import Balance from '../balance'
import LatestTransfers from '../latest-transfers'
import Faucet from '../faucet'
import Image from '../image'
import EnsProfile from '../ens-profile'
import Wallet from '../wallet'
import Alert from '../alerts'
import Popover from '../popover'
import Copy from '../copy'
import meta from '../../lib/meta'
import { chainName } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { params_to_obj, number_format, ellipse, equals_ignore_case, loader_color, sleep } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

const ROUTER_FEE_PERCENT = Number(process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT) || 0.05
const FEE_ESTIMATE_COOLDOWN = Number(process.env.NEXT_PUBLIC_FEE_ESTIMATE_COOLDOWN) || 30
const GAS_LIMIT_ADJUSTMENT = Number(process.env.NEXT_PUBLIC_GAS_LIMIT_ADJUSTMENT) || 1
const DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE) || 3
const DEFAULT_OPTIONS = {
  to: '',
  infiniteApprove: true,
  callData: '',
  slippage: DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE,
  forceSlow: false,
  receiveLocal: false,
}

export default () => {
  const dispatch = useDispatch()
  const {
    preferences,
    chains,
    assets,
    asset_balances,
    rpc_providers,
    dev,
    wallet,
    balances,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        asset_balances: state.asset_balances,
        rpc_providers: state.rpc_providers,
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
    assets_data,
  } = { ...assets }
  const {
    asset_balances_data,
  } = { ...asset_balances }
  const {
    rpcs,
  } = { ...rpc_providers }
  const {
    sdk,
  } = { ...dev }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    chain_id,
    provider,
    web3_provider,
    address,
    signer,
  } = { ...wallet_data }
  const {
    balances_data,
  } = { ...balances }

  const router = useRouter()
  const {
    asPath,
  } = { ...router }

  const [bridge, setBridge] = useState({})
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [controller, setController] = useState(null)
  const [slippageEditing, setSlippageEditing] = useState(false)

  const [fee, setFee] = useState(null)
  const [feeEstimating, setFeeEstimating] = useState(null)
  const [feeEstimateCooldown, setFeeEstimateCooldown] = useState(null)
  const [estimateTrigger, setEstimateTrigger] = useState(null)

  const [approving, setApproving] = useState(null)
  const [approveProcessing, setApproveProcessing] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [xcall, setXcall] = useState(null)
  const [calling, setCalling] = useState(null)
  const [callProcessing, setCallProcessing] = useState(null)
  const [xcallResponse, setXcallResponse] = useState(null)

  const [transfersTrigger, setTransfersTrigger] = useState(null)

  // get bridge from path
  useEffect(() => {
    let updated = false

    const params = params_to_obj(
      asPath?.indexOf('?') > -1 &&
      asPath.substring(asPath.indexOf('?') + 1)
    )

    const {
      amount,
    } = { ...params }

    let path = !asPath ?
      '/' :
      asPath.toLowerCase()
    path = path.includes('?') ?
      path.substring(
        0,
        path.indexOf('?'),
      ) :
      path

    if (
      path.includes('from-') &&
      path.includes('to-')
    ) {
      const paths = path
        .replace(
          '/',
          '',
        )
        .split('-')

      const source_chain = paths[paths.indexOf('from') + 1]
      const destination_chain = paths[paths.indexOf('to') + 1]
      const asset = _.head(paths) !== 'from' ?
        _.head(paths) :
        null

      const source_chain_data = chains_data?.find(c => c?.id === source_chain)
      const destination_chain_data = chains_data?.find(c => c?.id === destination_chain)
      const asset_data = assets_data?.find(a =>
        a?.id === asset ||
        equals_ignore_case(a?.symbol, asset)
      )

      if (source_chain_data) {
        bridge.source_chain = source_chain
        updated = true
      }

      if (destination_chain_data) {
        bridge.destination_chain = destination_chain
        updated = true
      }

      if (asset_data) {
        bridge.asset = asset
        updated = true
      }

      if (!isNaN(amount)) {
        bridge.amount = Number(amount)
        updated = true
      }
    }

    if (updated) {
      setBridge(bridge)
    }
  }, [asPath, chains_data, assets_data])

  // set bridge to path
  useEffect(() => {
    const params = {}

    if (bridge) {
      const {
        source_chain,
        destination_chain,
        asset,
        amount,
      } = { ...bridge }

      if (
        chains_data?.findIndex(c =>
          !c?.disabled &&
          c?.id === source_chain
        ) > -1
      ) {
        params.source_chain = source_chain

        if (
          asset &&
          assets_data?.findIndex(a =>
            a?.id === asset &&
            a.contracts?.findIndex(c =>
              c?.chain_id === chains_data.find(_c => _c?.id === source_chain)?.chain_id
            ) > -1
          ) > -1
        ) {
          params.asset = asset
        }
      }

      if (
        chains_data?.findIndex(c =>
          !c?.disabled &&
          c?.id === destination_chain
        ) > -1
      ) {
        params.destination_chain = destination_chain

        if (
          asset &&
          assets_data?.findIndex(a =>
            a?.id === asset &&
            a.contracts?.findIndex(c =>
              c?.chain_id === chains_data.find(_c => _c?.id === destination_chain)?.chain_id
            ) > -1
          ) > -1
        ) {
          params.asset = asset
        }
      }

      if (
        params.source_chain &&
        params.asset &&
        amount
      ) {
        params.amount = amount
      }
    }

    if (Object.keys(params).length > 0) {
      const {
        source_chain,
        destination_chain,
        asset,
        amount,
      } = { ...params }

      delete params.source_chain
      delete params.destination_chain
      delete params.asset

      router.push(
        `/${source_chain && destination_chain ?
          `${asset ?
            `${asset.toUpperCase()}-` :
            ''
          }from-${source_chain}-to-${destination_chain}` :
          ''
        }${Object.keys(params).length > 0 ?
          `?${new URLSearchParams(params).toString()}` :
          ''
        }`,
        undefined,
        {
          shallow: true,
        },
      )
    }

    const destination_chain_data = chains_data?.find(c => c?.id === destination_chain)
    const {
      chain_id,
    } = { ...destination_chain_data }

    const {
      contract_address,
    } = { ...destination_contract_data }

    const liquidity_amount = _.sum(
      (asset_balances_data?.[chain_id] || [])
        .filter(a => equals_ignore_case(a?.adopted, contract_address))
        .map(a => Number(
          utils.formatUnits(
            BigNumber.from(a?.amount || '0'),
            destination_decimals,
          )
        )
      )
    )

    setOptions({
      ...DEFAULT_OPTIONS,
      forceSlow: destination_chain_data && asset_balances_data ?
        amount > liquidity_amount :
        false,
    })
    setEstimateTrigger(moment().valueOf())
    setApproveResponse(null)
    setXcall(null)
    setXcallResponse(null)
  }, [address, bridge])

  // update balances
  useEffect(() => {
    const {
      source_chain,
      destination_chain,
    } = { ...bridge }

    const {
      id,
    } = { ...chains_data?.find(c => c?.chain_id === chain_id) }

    if (
      asPath &&
      id &&
      !(
        source_chain &&
        destination_chain
      ) &&
      destination_chain !== id
    ) {
      const params = params_to_obj(
        asPath.indexOf('?') > -1 &&
        asPath.substring(asPath.indexOf('?') + 1)
      )

      if (
        !params?.source_chain &&
        !asPath.includes('from-') &&
        chains_data?.findIndex(c => !c?.disabled && c?.id === id) > -1
      ) {
        setBridge({
          ...bridge,
          source_chain: id,
        })
      }

      getBalances(id)
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
        source_chain,
        destination_chain,
      } = { ...bridge }

      getBalances(source_chain)
      getBalances(destination_chain)
    }
    else {
      reset('address')
    }
  }, [address])

  // update balances
  useEffect(() => {
    const getData = () => {
      const {
        status,
      } = { ...approveResponse }

      if (
        address &&
        !xcall &&
        !calling &&
        ![
          'pending',
        ].includes(status)
      ) {
        const {
          source_chain,
          destination_chain,
        } = { ...bridge }

        getBalances(source_chain)
        getBalances(destination_chain)
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      0.25 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [rpcs])

  // fee estimate cooldown
  useEffect(() => {
    if (typeof feeEstimateCooldown === 'number') {
      if (feeEstimateCooldown === 0) {
        setEstimateTrigger(moment().valueOf())
      }
      else if (fee) {
        const interval = setInterval(() =>
          {
            const cooldown = feeEstimateCooldown - 1

            if (cooldown > -1) {
              setFeeEstimateCooldown(cooldown)
            }
          },
          1000,
        )

        return () => clearInterval(interval)
      }
    }
  }, [fee, feeEstimateCooldown])

  // reset fee estimate cooldown
  useEffect(() => {
    if (
      typeof feeEstimating === 'boolean' &&
      !feeEstimating
    ) {
      setFeeEstimateCooldown(FEE_ESTIMATE_COOLDOWN)
    }
  }, [fee, feeEstimating])

  // trigger estimate
  useEffect(() => {
    const {
      source_chain,
      amount,
    } = { ...bridge }

    const {
      chain_id,
    } = { ...chains_data?.find(c => c?.id === source_chain) }

    if (
      balances_data?.[chain_id] &&
      amount
    ) {
      setEstimateTrigger(moment().valueOf())
    }
  }, [balances_data])

  // estimate trigger
  useEffect(() => {
    let _controller

    if (
      estimateTrigger &&
      !(
        approving ||
        approveResponse ||
        calling ||
        xcallResponse
      )
    ) {
      controller?.abort()

      _controller = new AbortController()

      setController(_controller)

      estimate(_controller)
    }

    return () => _controller?.abort()
  }, [estimateTrigger])

  // check transfer status
  useEffect(() => {
    const update = async () => {
      if (
        sdk &&
        address &&
        xcall
      ) {
        const {
          transfer_id,
          transactionHash,
        } = { ...xcall }

        if (
          !transfer_id &&
          transactionHash
        ) {
          let transfer_data

          try {
            const response = await sdk.nxtpSdkUtils.getTransferByTransactionHash(
              transactionHash,
            )

            if (Array.isArray(response)) {
              transfer_data = response.find(t => equals_ignore_case(t?.xcall_transaction_hash, transactionHash))
            }
          } catch (error) {}

          if (address) {
            try {
              const response = await sdk.nxtpSdkUtils.getTransfersByUser(
                {
                  userAddress: address,
                },
              )

              if (Array.isArray(response)) {
                transfer_data = response.find(t => equals_ignore_case(t?.xcall_transaction_hash, transactionHash))
              }
            } catch (error) {}
          }

          const {
            status,
          } = { ...transfer_data }

          if (
            [
              XTransferStatus.Executed,
              XTransferStatus.CompletedFast,
              XTransferStatus.CompletedSlow,
            ].includes(status)
          ) {
            setApproveResponse(null)
            setXcall(null)
            setXcallResponse(null)
          }
          else if (transfer_data?.transfer_id) {
            setXcall({
              ...xcall,
              transfer_id: transfer_data.transfer_id,
            })
          }
        }
        else if (transfer_id) {
          const response = await sdk.nxtpSdkUtils.getTransferById(
            transfer_id,
          )

          if (Array.isArray(response)) {
            const transfer_data = response.find(t => equals_ignore_case(t?.transfer_id, transfer_id))
            const {
              status,
            } = { ...transfer_data }

            if (
              [
                XTransferStatus.Executed,
                XTransferStatus.CompletedFast,
                XTransferStatus.CompletedSlow,
              ].includes(status)
            ) {
              setApproveResponse(null)
              setXcall(null)
              setXcallResponse(null)
            }
          }
        }
      }
    }

    update()

    const interval = setInterval(() =>
      update(),
      0.25 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [sdk, address, xcall])

  const getBalances = chain => {
    const getBalance = async (
      chain_id,
      contract_data,
    ) => {
      const {
        contract_address,
        decimals,
      } = { ...contract_data }

      const provider = rpcs?.[chain_id]

      let balance

      if (
        provider &&
        contract_address
      ) {
        if (contract_address === constants.AddressZero) {
          balance = await provider.getBalance(
            address,
          )
        }
        else {
          const contract = new Contract(
            contract_address,
            [
              'function balanceOf(address owner) view returns (uint256)',
            ],
            provider,
          )

          balance = await contract.balanceOf(
            address,
          )
        }
      }

      dispatch({
        type: BALANCES_DATA,
        value: {
          [`${chain_id}`]: [{
            ...contract_data,
            amount: balance &&
              Number(
                utils.formatUnits(
                  balance,
                  decimals || 18,
                )
              ),
          }],
        },
      })
    }

    const {
      chain_id,
    } = { ...chains_data?.find(c => c?.id === chain) }

    const contracts_data = (assets_data || [])
      .map(a => {
        const {
          contracts,
        } = { ...a }

        return {
          ...a,
          ...contracts?.find(c => c?.chain_id === chain_id),
        }
      })
      .filter(a => a?.contract_address)
      .map(a => {
        let {
          contract_address,
        } = {  ...a }

        contract_address = contract_address.toLowerCase()

        return {
          ...a,
          contract_address,
        }
      })

    contracts_data.forEach(c =>
      getBalance(
        chain_id,
        c,
      )
    )
  }

  const checkSupport = () => {
    const {
      source_chain,
      destination_chain,
      asset,
    } = { ...bridge }

    const source_asset_data = assets_data?.find(a => a?.id === asset)
    const destination_asset_data = assets_data?.find(a => a?.id === asset)

    return source_chain &&
      destination_chain &&
      source_asset_data &&
      destination_asset_data &&
      !(
        source_asset_data.contracts?.findIndex(c =>
          c?.chain_id === chains_data?.find(_c => _c?.id === source_chain)?.chain_id
        ) < 0
      ) &&
      !(
        destination_asset_data.contracts?.findIndex(c =>
          c?.chain_id === chains_data?.find(_c => _c?.id === destination_chain)?.chain_id
        ) < 0
      )
  }

  const reset = async origin => {
    const reset_bridge = origin !== 'address'

    if (reset_bridge) {
      setBridge({
        ...bridge,
        amount: null,
      })

      setXcall(null)
    }

    setOptions(DEFAULT_OPTIONS)

    setFee(null)
    setFeeEstimating(null)
    setFeeEstimateCooldown(null)
    setEstimateTrigger(null)

    setApproving(null)
    setApproveProcessing(null)
    setApproveResponse(null)

    setCalling(null)
    setCallProcessing(null)
    setXcallResponse(null)

    setTransfersTrigger(moment().valueOf())

    const {
      source_chain,
      destination_chain,
    } = { ...bridge }

    getBalances(source_chain)
    getBalances(destination_chain)
  }

  const estimate = async controller => {
    if (
      checkSupport() &&
      !xcall
    ) {
      const {
        source_chain,
        destination_chain,
        asset,
        amount,
      } = { ...bridge }

      const source_chain_data = chains_data?.find(c => c?.id === source_chain)
      const source_asset_data = assets_data?.find(a => a?.id === asset)
      const source_contract_data = source_asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)

      const destination_chain_data = chains_data?.find(c => c?.id === destination_chain)
      const destination_asset_data = assets_data?.find(a => a?.id === asset)
      const destination_contract_data = destination_asset_data?.contracts?.find(c => c?.chain_id === destination_chain_data?.chain_id)

      setFeeEstimating(true)

      if (
        source_contract_data &&
        destination_contract_data &&
        !isNaN(amount)
      ) {
        if (
          sdk &&
          !controller.signal.aborted
        ) {
          setApproveResponse(null)
          setXcall(null)
          setCallProcessing(false)
          setCalling(false)
          setXcallResponse(null)

          try {
            const {
              forceSlow,
            } = { ...options }
            const {
              provider_params,
            } = { ...source_chain_data }
            const {
              nativeCurrency,
            } = { ..._.head(provider_params) }

            const routerFee = forceSlow ?
              0 :
              amount * ROUTER_FEE_PERCENT / 100

            const params = {
              originDomain: source_chain_data?.domain_id,
              destinationDomain: destination_chain_data?.domain_id,
              isHighPriority: !forceSlow,
            }

            const response = forceSlow ?
              0 :
              await sdk.nxtpSdkBase.estimateRelayerFee(
                params,
              )

            const gasFee = forceSlow ?
              0 :
              response &&
                Number(
                  utils.formatUnits(
                    response,
                    nativeCurrency?.decimals || 18,
                  )
                )

            console.log(
              '[Estimate Fees]',
              {
                options,
                params,
                routerFee,
                gasFee,
              },
            )

            setFee({
              router: routerFee,
              gas: gasFee,
            })
          } catch (error) {}
        }
      }
      else {
        setFee(null)
      }

      setFeeEstimating(false)
    }
  }

  const call = async () => {
    setApproving(null)
    setCalling(true)

    let success = false

    if (sdk) {
      const {
        source_chain,
        destination_chain,
        asset,
        amount,
      } = { ...bridge }

      const source_chain_data = chains_data?.find(c => c?.id === source_chain)
      const source_asset_data = assets_data?.find(a => a?.id === asset)
      const source_contract_data = source_asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)
      let {
        symbol,
      } = { ...source_contract_data }

      symbol = symbol ||
        source_asset_data?.symbol

      const destination_chain_data = chains_data?.find(c => c?.id === destination_chain)
      const destination_contract_data = source_asset_data?.contracts?.find(c => c?.chain_id === destination_chain_data?.chain_id)

      const {
        to,
        infiniteApprove,
        callData,
        slippage,
        forceSlow,
        receiveLocal,
      } = { ...options }
      const {
        gas,
      } = { ...fee }

      const minAmount = (amount || 0) *
        (
          100 -
          (!receiveLocal && slippage ?
            slippage :
            DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE
          )
        )

      const xcallParams = {
        params: {
          to: to ||
            address,
          callData: callData ||
            '0x',
          originDomain: source_chain_data?.domain_id,
          destinationDomain: destination_chain_data?.domain_id,
          agent: to ||
            address,
          callback: constants.AddressZero,
          recovery: address,
          forceSlow: forceSlow ||
            false,
          receiveLocal: receiveLocal ||
            false,
          relayerFee: !forceSlow && gas ?
            utils.parseUnits(
              gas.toString(),
              'ether',
            )
            .toString() :
            '0',
          destinationMinOut: utils.parseUnits(
            minAmount.toString(),
            destination_contract_data?.decimals || 18,
          )
          .toString(),
        },
        transactingAsset: source_contract_data?.contract_address,
        transactingAmount: utils.parseUnits(
          (amount || 0).toString(),
          source_contract_data?.decimals || 18,
        )
        .toString(),
        originMinOut: utils.parseUnits(
          minAmount.toString(),
          source_contract_data?.decimals || 18,
        )
        .toString(),
      }

      let failed = false

      try {
        const approve_request = await sdk.nxtpSdkBase.approveIfNeeded(
          xcallParams.params.originDomain,
          xcallParams.transactingAsset,
          xcallParams.transactingAmount,
          infiniteApprove,
        )

        if (approve_request) {
          setApproving(true)

          const approve_response = await signer.sendTransaction(
            approve_request,
          )

          const {
            hash,
          } = { ...approve_response }

          setApproveResponse({
            status: 'pending',
            message: `Wait for ${symbol} approval`,
            tx_hash: hash,
          })

          setApproveProcessing(true)

          const approve_receipt = await signer.provider.waitForTransaction(
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
        failed = true

        setApproveResponse({
          status: 'failed',
          message: error?.data?.message ||
            error?.message,
        })

        setApproveProcessing(false)
        setApproving(false)
      }

      if (!failed) {
        try {
          console.log(
            '[xCall]',
            {
              xcallParams,
            },
          )

          const xcall_request = await sdk.nxtpSdkBase.xcall(
            xcallParams,
          )

          if (xcall_request) {
            let gasLimit = await signer.estimateGas(
              xcall_request,
            )

            if (gasLimit) {
              gasLimit =
                FixedNumber.fromString(
                  gasLimit.toString()
                )
                .mulUnsafe(
                  FixedNumber.fromString(
                    GAS_LIMIT_ADJUSTMENT.toString()
                  )
                )
                .round(0)
                .toString()
                .replace('.0', '')

              xcall_request.gasLimit = gasLimit
            }

            const xcall_response = await signer.sendTransaction(
              xcall_request,
            )

            const {
              hash,
            } = { ...xcall_response }

            setCallProcessing(true)

            const xcall_receipt = await signer.provider.waitForTransaction(
              hash,
            )

            setXcall(xcall_receipt)

            const {
              status,
            } = { ...xcall_receipt }

            failed = !status

            setXcallResponse({
              status: failed ?
                'failed' :
                'success',
              message: failed ?
                'Failed to send transaction' :
                `${symbol} transfer detected, waiting for execution.`,
              tx_hash: hash,
            })

            success = true
          }
        } catch (error) {
          setXcallResponse({
            status: 'failed',
            message: error?.data?.message ||
              error?.message,
          })

          failed = true
        }
      }

      if (failed) {
        setXcall(null)
      }
    }

    setCallProcessing(false)
    setCalling(false)

    if (
      sdk &&
      address &&
      success
    ) {
      await sleep(2 * 1000)

      setTransfersTrigger(moment().valueOf())
    }
  }

  const headMeta = meta(
    asPath,
    null,
    chains_data,
    assets_data,
  )
  const {
    title,
  } = { ...headMeta }

  const {
    source_chain,
    destination_chain,
    asset,
    amount,
  } = { ...bridge }

  const source_chain_data = chains_data?.find(c => c?.id === source_chain)
  const source_asset_data = assets_data?.find(a => a?.id === asset)
  const source_contract_data = source_asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)

  const destination_chain_data = chains_data?.find(c => c?.id === destination_chain)
  const destination_asset_data = assets_data?.find(a => a?.id === asset)
  const destination_contract_data = destination_asset_data?.contracts?.find(c => c?.chain_id === destination_chain_data?.chain_id)  

  const source_symbol = source_contract_data?.symbol ||
    source_asset_data?.symbol
  const source_balance = balances_data?.[source_chain_data?.chain_id]?.find(b => equals_ignore_case(b?.contract_address, source_contract_data?.contract_address))
  const source_amount = source_balance &&
    Number(source_balance.amount)
  const source_gas_native_token = _.head(source_chain_data?.provider_params)?.nativeCurrency

  const destination_symbol = destination_contract_data?.symbol ||
    destination_asset_data?.symbol
  const destination_balance = balances_data?.[destination_chain_data?.chain_id]?.find(b => equals_ignore_case(b?.contract_address, destination_contract_data?.contract_address))
  const destination_amount = destination_balance &&
    Number(destination_balance.amount)
  const destination_decimals = destination_contract_data?.decimals ||
    18

  const {
    to,
    infiniteApprove,
    slippage,
    forceSlow,
    receiveLocal,
  } = { ...options }

  const gas_fee = fee &&
    (
      forceSlow ?
        0 :
        fee.gas || 0
    )
  const router_fee = fee &&
    (
      forceSlow ?
        0 :
        fee.router || 0
    )

  const liquidity_amount = _.sum(
    (asset_balances_data?.[destination_chain_data?.chain_id] || [])
      .filter(a => equals_ignore_case(a?.adopted, destination_contract_data?.contract_address))
      .map(a =>
        Number(
          utils.formatUnits(
            BigNumber.from(a?.amount || '0'),
            destination_decimals,
          )
        )
      )
  )

  const min_amount = 0
  const max_amount = source_amount

  const wrong_chain = source_chain_data &&
    chain_id !== source_chain_data.chain_id &&
    !xcall
  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  const recipient_address = to ||
    address

  const disabled = calling ||
    approving

  return (
    <div className="grid grid-cols-1 lg:grid-cols-8 items-start gap-4 my-4">
      <div className="hidden lg:block col-span-0 lg:col-span-2" />
      <div className="col-span-1 lg:col-span-4">
        <div className="mt-4 sm:mt-8">
          <Announcement />
        </div>
        <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 my-4 sm:my-6 mx-1 sm:mx-4">
          <div className="w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <h1 className="uppercase tracking-widest text-base sm:text-xl font-normal">
                  Cross-Chain Transfer
                </h1>
                {
                  asPath?.includes('from-') &&
                  asPath.includes('to-') &&
                  title &&
                  (
                    <h2 className="tracking-wider text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                      {title.replace(
                        ' with Connext',
                        '',
                      )}
                    </h2>
                  )
                }
              </div>
              <div className="flex items-center space-x-2">
                {
                  destination_chain_data &&
                  (
                    <a
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/${destination_chain_data.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-max bg-slate-50 hover:bg-slate-100 dark:bg-black dark:hover:bg-slate-900 cursor-pointer rounded-lg shadow flex items-center text-blue-600 dark:text-slate-200 space-x-2 py-1.5 px-2"
                    >
                      {destination_chain_data.image && (
                        <Image
                          src={destination_chain_data.image}
                          alt=""
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      )}
                      <div className="flex items-center">
                        <span className="tracking-wider text-base font-medium">
                          Liquidity
                        </span>
                        <TiArrowRight
                          size={20}
                          className="transform -rotate-45 mt-0.5 -mr-1"
                        />
                      </div>
                    </a>
                  )
                }
                <Options
                  disabled={disabled}
                  applied={!_.isEqual(
                    Object.fromEntries(
                      Object.entries(options)
                        .filter(([k, v]) =>
                          ![
                            /*'slippage',*/
                          ].includes(k)
                        )
                    ),
                    Object.fromEntries(
                      Object.entries(DEFAULT_OPTIONS)
                        .filter(([k, v]) =>
                          ![
                            /*'slippage',*/
                          ].includes(k)
                        )
                    ),
                  )}
                  initialData={options}
                  onChange={o => setOptions(o)}
                />
              </div>
            </div>
            <div className={`bg-slate-200 dark:bg-slate-900 bg-opacity-50 ${checkSupport() && amount > 0 ? 'border-0 border-blue-400 dark:border-blue-800 shadow-2xl shadow-blue-400 dark:shadow-blue-600' : 'shadow shadow-slate-200 dark:shadow-slate-700'} rounded-3xl space-y-6 pt-4 sm:pt-10 pb-3 sm:pb-8 px-3 sm:px-6`}>
              <div className="space-y-2">
                <div className="grid grid-cols-5 sm:grid-cols-5 gap-3 sm:gap-6">
                  <div className="col-span-2 sm:col-span-2 flex flex-col items-center sm:items-start">
                    <div className="w-32 sm:w-48 flex sm:flex-col items-center justify-center space-x-1.5">
                      <span className="tracking-wider text-slate-600 dark:text-slate-200 text-lg font-medium text-center">
                        Origin
                      </span>
                    </div>
                    <SelectChain
                      disabled={disabled}
                      value={source_chain}
                      onSelect={c => {
                        const _source_chain = c
                        const _destination_chain = c === destination_chain ?
                          source_chain :
                          destination_chain

                        setBridge({
                          ...bridge,
                          source_chain: _source_chain,
                          destination_chain: _destination_chain,
                        })

                        getBalances(_source_chain)
                        getBalances(_destination_chain)
                      }}
                      source={source_chain}
                      destination={destination_chain}
                      origin="origin"
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      disabled={disabled}
                      onClick={() => {
                        setBridge({
                          ...bridge,
                          source_chain: destination_chain,
                          destination_chain: source_chain,
                          amount: null,
                        })

                        getBalances(source_chain)
                        getBalances(destination_chain)
                      }}
                      className={`transform hover:-rotate-180 hover:animate-spin-one-time transition duration-300 ease-in-out bg-slate-50 dark:bg-slate-900 ${disabled ? 'cursor-not-allowed' : ''} rounded-full shadow dark:shadow-slate-700 dark:hover:shadow-white flex items-center justify-center p-2.5`}
                    >
                      <div className="flex sm:hidden">
                        <Image
                          src="/logos/logo.png"
                          alt=""
                          width={24}
                          height={24}
                        />
                      </div>
                      <div className="hidden sm:flex">
                        <Image
                          src="/logos/logo.png"
                          alt=""
                          width={32}
                          height={32}
                        />
                      </div>
                    </button>
                  </div>
                  <div className="col-span-2 sm:col-span-2 flex flex-col items-center sm:items-end">
                    <div className="w-32 sm:w-48 flex sm:flex-col items-center justify-center space-x-1.5">
                      <span className="tracking-wider text-slate-600 dark:text-slate-200 text-lg font-medium text-center">
                        Destination
                      </span>
                    </div>
                    <SelectChain
                      disabled={disabled}
                      value={destination_chain}
                      onSelect={c => {
                        const _source_chain = c === source_chain ?
                          destination_chain :
                          source_chain
                        const _destination_chain = c

                        setBridge({
                          ...bridge,
                          source_chain: _source_chain,
                          destination_chain: _destination_chain,
                        })

                        getBalances(_source_chain)
                        getBalances(_destination_chain)
                      }}
                      source={source_chain}
                      destination={destination_chain}
                      origin="destination"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="tracking-wider text-slate-600 dark:text-slate-200 text-lg font-medium sm:ml-3">
                    Asset
                  </div>
                  <SelectBridgeAsset
                    disabled={disabled}
                    value={asset}
                    onSelect={a => {
                      setBridge({
                        ...bridge,
                        asset: a,
                      })

                      if (a !== asset) {
                        getBalances(source_chain)
                        getBalances(destination_chain)
                      }
                    }}
                    source_chain={source_chain}
                    destination_chain={destination_chain}
                  />
                </div>
              </div>
              {
                source_chain &&
                destination_chain &&
                asset &&
                !checkSupport() ?
                  <div className="tracking-wider text-slate-400 dark:text-slate-200 text-lg text-center sm:ml-3">
                    Route not supported
                  </div> :
                  <div className="grid grid-cols-5 sm:grid-cols-5 gap-6 sm:ml-3">
                    <div className="col-span-2 sm:col-span-2 space-y-1">
                      <div className="flex items-center justify-start sm:justify-start space-x-1 sm:space-x-2.5">
                        <span className="tracking-wider text-slate-600 dark:text-slate-200 text-sm sm:text-base sm:font-medium">
                          Amount
                        </span>
                        {
                          address &&
                          checkSupport() &&
                          source_balance &&
                          (
                            <Popover
                              placement="bottom"
                              disabled={disabled}
                              onClick={() => {
                                setBridge({
                                  ...bridge,
                                  amount: max_amount,
                                })
                              }}
                              title={<div className="flex items-center justify-between space-x-1">
                                <span className="font-bold">
                                  {source_symbol}
                                </span>
                                <span className="font-semibold">
                                  Transfers size
                                </span>
                              </div>}
                              content={<div className="flex flex-col space-y-1">
                                <div className="flex items-center justify-between space-x-2.5">
                                  <span className="font-medium">
                                    Balance:
                                  </span>
                                  <span className="font-semibold">
                                    {typeof source_amount === 'number' ?
                                      number_format(
                                        source_amount,
                                        source_amount > 1000 ?
                                          '0,0.00' :
                                          '0,0.000000',
                                        true,
                                      ) :
                                      'n/a'
                                    }
                                  </span>
                                </div>
                                <div className="flex items-start justify-between space-x-2.5 pb-1">
                                  <span className="font-medium">
                                    Liquidity:
                                  </span>
                                  <span className="font-semibold">
                                    {typeof liquidity_amount === 'number' ?
                                      number_format(
                                        liquidity_amount,
                                        liquidity_amount > 1000 ?
                                          '0,0.00' :
                                          '0,0.000000',
                                        true,
                                      ) :
                                      'n/a'
                                    }
                                  </span>
                                </div>
                                <div className="border-t flex items-center justify-between space-x-2.5 pt-2">
                                  <span className="font-semibold">
                                    Max:
                                  </span>
                                  <span className="font-semibold">
                                    {typeof max_amount === 'number' ?
                                      number_format(
                                        max_amount,
                                        max_amount > 1000 ?
                                          '0,0.00' :
                                          '0,0.000000',
                                        true,
                                      ) :
                                      'n/a'
                                    }
                                  </span>
                                </div>
                              </div>}
                              className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg shadow dark:shadow-slate-700 text-blue-400 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white text-xs sm:text-sm font-semibold py-0.5 px-2 sm:px-2.5"
                              titleClassName="normal-case py-1.5"
                            >
                              Max
                            </Popover>
                          )
                        }
                      </div>
                      {
                        source_chain_data &&
                        asset &&
                        (
                          <div className="flex items-center space-x-1.5">
                            <div className="tracking-wider text-slate-400 dark:text-slate-600 text-xs">
                              Balance
                            </div>
                            <Balance
                              chainId={source_chain_data.chain_id}
                              asset={asset}
                            />
                          </div>
                        )
                      }
                    </div>
                    <div className="col-span-3 sm:col-span-3 flex items-center justify-end sm:justify-end">
                      <DebounceInput
                        debounceTimeout={300}
                        size="small"
                        type="number"
                        placeholder="0.00"
                        disabled={
                          disabled ||
                          !asset
                        }
                        value={typeof amount === 'number' && amount >= 0 ?
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

                          value = value < 0 ?
                            0 :
                            value

                          setBridge({
                            ...bridge,
                            amount: value && !isNaN(value) ?
                              Number(value) :
                              value,
                          })
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
                        className={`w-36 sm:w-48 bg-slate-50 focus:bg-slate-100 dark:bg-slate-900 dark:focus:bg-slate-800 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl sm:text-lg font-semibold text-right py-1.5 sm:py-2 px-2 sm:px-3`}
                      />
                    </div>
                  </div>
              }
              {
                checkSupport() &&
                (
                  web3_provider ||
                  amount > 0
                ) &&
                (
                  <>
                    {
                      (
                        feeEstimating ||
                        fee
                      ) &&
                      (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 sm:mx-3">
                            <span className="tracking-wider text-slate-400 dark:text-slate-600 font-normal">
                              Fees Breakdown
                            </span>
                            {/*feeEstimateCooldown > 0 &&
                              (
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg font-medium py-1 px-2">
                                  {feeEstimateCooldown}s
                                </div>
                              )
                            */}
                          </div>
                          <div className="w-full h-0.25 bg-slate-100 dark:bg-slate-800 sm:px-1" />
                          <div className="space-y-2.5 sm:mx-3">
                            {
                              !forceSlow &&
                              (
                                <>
                                  <div className="flex items-center justify-between space-x-1">
                                    <div className="tracking-wider text-slate-600 dark:text-slate-200 font-medium">
                                      Bridge Fee
                                    </div>
                                    <span className="whitespace-nowrap tracking-wider text-xs font-semibold space-x-1.5">
                                      {number_format(
                                        router_fee,
                                        '0,0.000000',
                                        true,
                                      )}
                                      {source_symbol}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between space-x-1">
                                    <div className="tracking-wider text-slate-600 dark:text-slate-200 font-medium">
                                      Gas Fee
                                    </div>
                                    {feeEstimating ?
                                      <div className="flex items-center space-x-1.5">
                                        <span className="tracking-wider text-slate-600 dark:text-slate-200 font-medium">
                                          estimating
                                        </span>
                                        <Oval
                                          color={loader_color(theme)}
                                          width="20"
                                          height="20"
                                        />
                                      </div> :
                                      <span className="whitespace-nowrap tracking-wider text-xs font-semibold space-x-1.5">
                                        {number_format(
                                          gas_fee,
                                          '0,0.000000',
                                          true,
                                        )}
                                        {source_gas_native_token?.symbol}
                                      </span>
                                    }
                                  </div>
                                </>
                              )
                            }
                          </div>
                        </div>
                      )}
                    {
                      amount > 0 &&
                      (
                        <>
                          {
                            asset_balances_data &&
                            amount > liquidity_amount &&
                            (
                              <div className="flex items-center text-blue-500 dark:text-yellow-500 space-x-2 sm:mx-3">
                                <BiMessageEdit
                                  size={20}
                                  className="min-w-max"
                                />
                                <span className="text-sm">
                                  Insufficient router liquidity. Funds must transfer through the bridge directly. (wait time est. 30-60 mins)
                                </span>
                              </div>
                            )
                          }
                          {
                            amount < liquidity_amount &&
                            (
                              forceSlow ?
                                <div className="flex items-center text-blue-500 dark:text-yellow-500 space-x-2 sm:mx-3">
                                  <BiMessageDetail
                                    size={20}
                                    className="min-w-max"
                                  />
                                  <span className="text-sm">
                                    Use bridge only (wait 30-60 mins, no fees)
                                  </span>
                                </div> :
                                <div className="flex items-center text-blue-500 dark:text-green-500 space-x-2 sm:mx-3">
                                  <GiPartyPopper
                                    size={20}
                                    className="min-w-max"
                                  />
                                  <span className="text-sm">
                                    Fast liquidity available! Transfer will likely complete within 3 minutes!
                                  </span>
                                </div>
                            )
                          }
                        </>
                      )
                    }
                  </>
                )
              }
              {
                checkSupport() &&
                (
                  xcall ||
                  source_balance
                ) &&
                (
                  typeof amount === 'number' ||
                  (
                    web3_provider &&
                    wrong_chain
                  )
                ) ?
                  web3_provider &&
                  wrong_chain ?
                    <Wallet
                      connectChainId={source_chain_data?.chain_id}
                      className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl flex items-center justify-center text-white text-base sm:text-lg space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                    >
                      <span className="mr-1.5 sm:mr-2">
                        {is_walletconnect ?
                          'Reconnect' :
                          'Switch'
                        } to
                      </span>
                      {source_chain_data?.image && (
                        <Image
                          src={source_chain_data.image}
                          alt=""
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      )}
                      <span className="font-semibold">
                        {source_chain_data?.name}
                      </span>
                    </Wallet> :
                    !xcall &&
                    (
                      amount > source_amount ||
                      amount < min_amount ||
                      amount <= 0
                    ) ?
                      <Alert
                        color="bg-red-400 dark:bg-red-500 text-white text-base"
                        icon={<BiMessageError
                          className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                        />}
                        closeDisabled={true}
                        rounded={true}
                        className="rounded-xl p-4.5"
                      >
                        <span>
                          {amount > source_amount ?
                            'Insufficient Balance' :
                            amount < min_amount ?
                              'The transfer amount cannot be less than the transfer fee.' :
                              amount <= 0 ?
                                'The transfer amount cannot be equal or less than 0.' :
                                ''
                          }
                        </span>
                      </Alert> :
                      !xcall &&
                      !xcallResponse ?
                        <button
                          disabled={disabled}
                          onClick={() => {
                            setSlippageEditing(false)
                            call()
                          }}
                          className={`w-full ${disabled ? 'bg-blue-400 dark:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'} rounded-xl flex items-center justify-center text-white text-base sm:text-lg py-3 sm:py-4 px-2 sm:px-3`}
                        >
                          <span className="flex items-center justify-center space-x-1.5">
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
                              {calling ?
                                approving ?
                                  approveProcessing ?
                                    'Approving' :
                                    'Please Approve' :
                                  callProcessing ?
                                    'xCalling' :
                                    typeof approving === 'boolean' ?
                                      'Please Confirm' :
                                      'Checking Approval' :
                                'Transfer'
                              }
                            </span>
                          </span>
                        </button> :
                        (
                          xcallResponse ||
                          (
                            !xcall &&
                            approveResponse
                          )
                        ) &&
                        (
                          [
                            xcallResponse ||
                            approveResponse,
                          ]
                          .map((r, i) => {
                            const {
                              status,
                              message,
                            } = { ...r }

                            return (
                              <Alert
                                key={i}
                                color={`${status === 'failed' ? 'bg-red-400 dark:bg-red-500' : status === 'success' ? xcallResponse ? 'bg-yellow-400 dark:bg-blue-500' : 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                                icon={status === 'failed' ?
                                  <BiMessageError
                                    className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                  /> :
                                  status === 'success' ?
                                    xcallResponse ?
                                      <div className="mr-3">
                                        <Watch
                                          color="white"
                                          width="20"
                                          height="20"
                                        />
                                      </div> :
                                      <BiMessageCheck
                                        className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                      /> :
                                    <BiMessageDetail
                                      className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                    />
                                }
                                closeDisabled={true}
                                rounded={true}
                                className="rounded-xl p-4.5"
                              >
                                <div className="flex items-center justify-between space-x-2">
                                  <span className="break-all">
                                    {ellipse(
                                      message,
                                      128,
                                    )}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    {
                                      status === 'failed' &&
                                      message &&
                                      (
                                        <Copy
                                          size={24}
                                          value={message}
                                          className="cursor-pointer text-slate-200 hover:text-white"
                                        />
                                      )
                                    }
                                    {status === 'failed' ?
                                      <button
                                        onClick={() => reset()}
                                        className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                                      >
                                        <MdClose
                                          size={20}
                                        />
                                      </button> :
                                      status === 'success' ?
                                        <button
                                          onClick={() => reset()}
                                          className={`${xcallResponse ? 'bg-yellow-500 dark:bg-blue-400' : 'bg-green-500 dark:bg-green-400'} rounded-full flex items-center justify-center text-white p-1`}
                                        >
                                          <MdClose
                                            size={20}
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
                      className="w-full bg-slate-100 dark:bg-slate-900 cursor-not-allowed rounded-xl text-slate-400 dark:text-slate-500 text-base sm:text-lg text-center py-3 sm:py-4 px-2 sm:px-3"
                    >
                      Transfer
                    </button> :
                    <Wallet
                      connectChainId={source_chain_data?.chain_id}
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
          {
            ['testnet'].includes(process.env.NEXT_PUBLIC_NETWORK) &&
            (
              <Faucet />
            )
          }
          {/*<PoweredBy />*/}
        </div>
      </div>
      <div className="col-span-1 lg:col-span-2">
        <LatestTransfers
          trigger={transfersTrigger}
        />
      </div>
    </div>
  )
}
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { XTransferStatus, XTransferErrorStatus } from '@connext/nxtp-utils'
import { BigNumber, Contract, FixedNumber, constants, utils } from 'ethers'
import PageVisibility from 'react-page-visibility'
import { TailSpin, Oval } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { Tooltip, Alert as AlertNotification } from '@material-tailwind/react'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { MdClose } from 'react-icons/md'
import { HiArrowRight, HiOutlineCheckCircle } from 'react-icons/hi'
import { BiMessageError, BiMessageCheck, BiMessageDetail, BiMessageEdit, BiEditAlt, BiCheckCircle, BiChevronDown, BiChevronUp, BiInfoCircle } from 'react-icons/bi'
import { IoInformationCircleOutline, IoWarning } from 'react-icons/io5'
import { GiPartyPopper } from 'react-icons/gi'

import Announcement from '../announcement'
// import PoweredBy from '../powered-by'
import Options from './options'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
// import GasPrice from '../gas-price'
import Balance from '../balance'
import TimeSpent from '../time-spent'
import LatestTransfers from '../latest-transfers'
import ActionRequired from '../action-required'
import Faucet from '../faucet'
import Image from '../image'
import Wallet from '../wallet'
import Alert from '../alerts'
import Copy from '../copy'
import DecimalsFormat from '../decimals-format'
import { params_to_obj, number_format, number_to_fixed, ellipse, equals_ignore_case, total_time_string, loader_color, sleep, error_patterns } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

const WRAPPED_PREFIX =
  process.env.NEXT_PUBLIC_WRAPPED_PREFIX ||
  'next'

const ROUTER_FEE_PERCENT =
  Number(
    process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT
  ) ||
  0.05

const FEE_ESTIMATE_COOLDOWN =
  Number(
    process.env.NEXT_PUBLIC_FEE_ESTIMATE_COOLDOWN
  ) ||
  30

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

const DEFAULT_OPTIONS = {
  to: '',
  infiniteApprove: true,
  callData: '',
  slippage: DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE,
  forceSlow: false,
  receiveLocal: false,
  showNextAssets: true,
}

export default () => {
  const dispatch = useDispatch()
  const {
    preferences,
    chains,
    assets,
    asset_balances,
    pools,
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
        pools: state.pools,
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
    pools_data,
  } = { ...pools }
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

  const wallet_chain_id = wallet_data?.chain_id

  const router = useRouter()
  const {
    asPath,
    query,
  } = { ...router }
  const {
    source,
  } = { ...query }

  const [pageVisible, setPageVisible] = useState(true)

  const [bridge, setBridge] = useState({})
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [buttonDirection, setButtonDirection] = useState(1)
  const [collapse, setCollapse] = useState(false)
  const [recipientEditing, setRecipientEditing] = useState(false)
  const [slippageEditing, setSlippageEditing] = useState(false)
  const [estimatedValues, setEstimatedValues] = useState(undefined)
  const [estimateResponse, setEstimateResponse] = useState(null)

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

  const [balanceTrigger, setBalanceTrigger] = useState(null)
  const [transfersTrigger, setTransfersTrigger] = useState(null)

  const [latestTransfers, setLatestTransfers] = useState([])
  const [openTransferStatus, setOpenTransferStatus] = useState(false)
  const [timeTrigger, setTimeTrigger] = useState(false)

  const [displayReceiveNextInfo, setDisplayReceiveNextInfo] = useState(null)
  const [receiveNextInfoTimeout, setReceiveNextInfoTimeout] = useState(null)
  const [latestTransfersSize, setLatestTransfersSize] = useState(null)

  // get bridge from path
  useEffect(
    () => {
      let updated = false

      const params =
        params_to_obj(
          asPath?.indexOf('?') > -1 &&
          asPath.substring(
            asPath.indexOf('?') + 1,
          )
        )

      const {
        symbol,
        amount,
        receive_next,
      } = { ...params }

      let path =
        !asPath ?
          '/' :
          asPath.toLowerCase()

      path =
        path.includes('?') ?
          path.substring(
            0,
            path.indexOf('?'),
          ) :
          path

      if (
        path.includes('from-') &&
        path.includes('to-')
      ) {
        const paths =
          path
            .replace(
              '/',
              '',
            )
            .split('-')

        const source_chain = paths[paths.indexOf('from') + 1]
        const destination_chain = paths[paths.indexOf('to') + 1]
        const asset =
          _.head(paths) !== 'from' ?
            _.head(paths) :
            process.env.NEXT_PUBLIC_NETWORK === 'testnet' ?
              'test' :
              'usdc'

        const source_chain_data = (chains_data || [])
          .find(c =>
            c?.id === source_chain
          )

        const destination_chain_data = (chains_data || [])
          .find(c =>
            c?.id === destination_chain
          )

        const asset_data = (assets_data || [])
          .find(a =>
            a?.id === asset ||
            equals_ignore_case(
              a?.symbol,
              asset,
            )
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

        if (symbol) {
          bridge.symbol = symbol
          updated = true
        }

        if (
          bridge.source_chain &&
          !isNaN(amount) &&
          Number(amount) > 0
        ) {
          bridge.amount = amount
          updated = true

          if (
            sdk &&
            estimatedValues === undefined
          ) {
            calculateAmountReceived(bridge.amount)
          }
        }
        else if (estimatedValues) {
          if (
            [
              '',
              '0',
              '0.0',
            ].includes(amount)
          ) {
            setEstimatedValues(
              {
                amountReceived: '0',
                routerFee: '0',
                isNextAsset:
                  [
                    true,
                    'true',
                  ].includes(receive_next),
              }
            )
          }
          else {
            setEstimatedValues(undefined)
          }
        }
      }

      if (
        [
          true,
          'true',
        ].includes(receive_next)
      ) {
        bridge.receive_next = true
        updated = true

        setOptions(
          {
            ...options,
            receiveLocal: true,
          }
        )
      }
      else if (
        [
          false,
          'false',
        ].includes(receive_next)
      ) {
        bridge.receive_next = false
        updated = true

        setOptions(
          {
            ...options,
            receiveLocal: false,
          }
        )
      }

      if (updated) {
        setBridge(bridge)
      }
    },
    [asPath, chains_data, assets_data, sdk],
  )

  // set bridge to path
  useEffect(
    () => {
      const params = {}

      if (bridge) {
        const {
          source_chain,
          destination_chain,
          asset,
          symbol,
          amount,
        } = { ...bridge }

        if (
          (chains_data || [])
            .findIndex(c =>
              !c?.disabled &&
              c?.id === source_chain
            ) > -1
        ) {
          params.source_chain = source_chain

          if (
            asset &&
            (assets_data || [])
              .findIndex(a =>
                a?.id === asset &&
                (a.contracts || [])
                  .findIndex(c =>
                    c?.chain_id ===
                    chains_data
                      .find(_c =>
                        _c?.id === source_chain
                      )?.chain_id
                  ) > -1
              ) > -1
          ) {
            params.asset = asset
          }
        }

        if (
          (chains_data || [])
            .findIndex(c =>
              !c?.disabled &&
              c?.id === destination_chain
            ) > -1
        ) {
          params.destination_chain = destination_chain

          if (
            asset &&
            (assets_data || [])
              .findIndex(a =>
                a?.id === asset &&
                (a.contracts || [])
                  .findIndex(c =>
                    c?.chain_id ===
                    chains_data
                      .find(_c =>
                        _c?.id === destination_chain
                      )?.chain_id
                  ) > -1
              ) > -1
          ) {
            params.asset = asset
          }
        }

        if (
          params.source_chain &&
          params.asset
        ) {
          if (amount) {
            params.amount = amount
          }

          if (
            symbol &&
            (assets_data || [])
              .findIndex(a =>
                a?.id === asset &&
                (
                  equals_ignore_case(
                    a?.symbol,
                    symbol,
                  ) ||
                  (a.contracts || [])
                    .findIndex(c =>
                      c?.chain_id ===
                      chains_data
                        .find(_c =>
                          _c?.id === source_chain
                        )?.chain_id &&
                      c?.next_asset
                    ) > -1
                )
              ) > -1
          ) {
            params.symbol = symbol
          }
        }
      }

      const {
        slippage,
      } = { ...options }
      let {
        receiveLocal,
      } = { ...options }

      if (!destination_contract_data?.next_asset) {
        if (receiveLocal) {
          bridge._receiveLocal = receiveLocal
        }

        receiveLocal = false

        if (bridge.receive_next) {
          bridge.receive_next = undefined
        }

        setDisplayReceiveNextInfo(true)
      }
      else {
        if (typeof bridge._receiveLocal === 'boolean') {
          receiveLocal =
            bridge.receive_next === bridge._receiveLocal ||
            bridge.receive_next === false ?
              bridge.receive_next :
              bridge._receiveLocal

          bridge._receiveLocal = receiveLocal
        }
      }

      if (
        receiveLocal ||
        bridge.receive_next
      ) {
        params.receive_next = true
      }

      if (source) {
        params.source = source
      }

      if (Object.keys(params).length > 0) {
        const {
          source_chain,
          destination_chain,
          asset,
          symbol,
        } = { ...params }

        delete params.source_chain
        delete params.destination_chain
        delete params.asset

        if (!symbol) {
          delete params.symbol
        }

        router
          .push(
            `/${
              source_chain &&
              destination_chain ?
                `${
                  asset ?
                    `${asset.toUpperCase()}-` :
                    ''
                }from-${source_chain}-to-${destination_chain}` :
                ''
            }${
              Object.keys(params).length > 0 ?
                `?${new URLSearchParams(params).toString()}` :
                ''
            }`,
            undefined,
            {
              shallow: true,
            },
          )

        setBalanceTrigger(
          moment()
            .valueOf()
        )
      }

      const destination_chain_data = (chains_data || [])
        .find(c =>
          c?.id === destination_chain
        )

      const {
        chain_id,
      } = { ...destination_chain_data }

      const {
        contract_address,
        next_asset,
      } = { ...destination_contract_data }

      const {
        symbol,
      } = { ...params }

      const liquidity_amount =
        _.sum(
          (asset_balances_data?.[chain_id] || [])
            .filter(a =>
              [
                contract_address,
                next_asset?.contract_address,
              ]
              .filter(_a => _a)
              .findIndex(_a =>
                equals_ignore_case(
                  a?.contract_address,
                  _a,
                )
              ) > -1
            )
            .map(a =>
              Number(
                utils.formatUnits(
                  BigNumber.from(
                    a?.amount ||
                    '0'
                  ),
                  equals_ignore_case(
                    a?.contract_address,
                    next_asset?.contract_address,
                  ) &&
                  next_asset ?
                    next_asset.decimals ||
                    18 :
                    destination_decimals,
                )
              )
            )
        )

      setOptions(
        {
          ...DEFAULT_OPTIONS,
          slippage,
          forceSlow:
            destination_chain_data &&
            asset_balances_data ?
              Number(amount) > liquidity_amount :
              false,
          receiveLocal,
        }
      )

      setEstimateResponse(null)
      setEstimateTrigger(
        moment()
          .valueOf()
      )
      setApproveResponse(null)
      setXcall(null)
      setXcallResponse(null)
    },
    [address, bridge, sdk],
  )

  // update balances
  useEffect(
    () => {
      let {
        source_chain,
        destination_chain,
      } = { ...bridge }

      const chain_data = (chains_data || [])
        .find(c =>
          c?.chain_id === wallet_chain_id
        )

      const {
        id,
      } = { ...chain_data }

      if (
        asPath &&
        id
      ) {
        if (
          !(
            source_chain &&
            destination_chain
          ) &&
          !equals_ignore_case(
            id,
            destination_chain,
          )
        ) {
          const params =
            params_to_obj(
              asPath.indexOf('?') > -1 &&
              asPath.substring(
                asPath.indexOf('?') + 1,
              )
            )

          if (
            !params?.source_chain &&
            !asPath.includes('from-') &&
            (chains_data || [])
              .findIndex(c =>
                !c?.disabled &&
                c?.id === id
              ) > -1
          ) {
            source_chain = id
          }
        }
        else if (
          !asPath.includes('from-') &&
          !equals_ignore_case(
            id,
            source_chain,
          )
        ) {
          source_chain = id
        }

        getBalances(id)
      }

      if (
        Object.keys(bridge).length > 0 ||
        [
          '/',
        ].includes(asPath)
      ) {
        source_chain =
          source_chain ||
          _.head(
            (chains_data || [])
              .filter(c =>
                !c?.disabled &&
                c?.id !== destination_chain
              )
          )?.id

        destination_chain =
          destination_chain &&
          !equals_ignore_case(
            destination_chain,
            source_chain,
          ) ?
            destination_chain :
            bridge.source_chain &&
            !equals_ignore_case(
              bridge.source_chain,
              source_chain,
            ) ?
              bridge.source_chain :
              _.head(
                (chains_data || [])
                  .filter(c =>
                    !c?.disabled &&
                    c?.id !== source_chain
                  )
              )?.id
      }

      setBridge(
        {
          ...bridge,
          source_chain,
          destination_chain,
        }
      )
    },
    [asPath, chains_data],
  )

  // update balances
  useEffect(
    () => {
      let {
        source_chain,
        destination_chain,
      } = { ...bridge }

      const chain_data = (chains_data || [])
        .find(c =>
          c?.chain_id === wallet_chain_id
        )

      const {
        id,
      } = { ...chain_data }

      if (
        asPath &&
        id
      ) {
        if (
          !(
            source_chain &&
            destination_chain
          ) &&
          !equals_ignore_case(
            id,
            destination_chain,
          )
        ) {
          const params =
            params_to_obj(
              asPath.indexOf('?') > -1 &&
              asPath.substring(
                asPath.indexOf('?') + 1,
              )
            )

          if (
            !params?.source_chain &&
            !asPath.includes('from-') &&
            (chains_data || [])
              .findIndex(c =>
                !c?.disabled &&
                c?.id === id
              ) > -1
          ) {
            source_chain = id
          }
        }
        else if (
          !asPath.includes('from-') &&
          !equals_ignore_case(
            id,
            source_chain,
          )
        ) {
          source_chain = id
        }

        getBalances(id)
      }

      if (
        Object.keys(bridge).length > 0 ||
        [
          '/',
        ].includes(asPath)
      ) {
        source_chain =
          source_chain ||
          _.head(
            (chains_data || [])
              .filter(c =>
                !c?.disabled &&
                c?.id !== destination_chain
              )
          )?.id

        destination_chain =
          destination_chain &&
          !equals_ignore_case(
            destination_chain,
            source_chain,
          ) ?
            destination_chain :
            bridge.source_chain &&
            !equals_ignore_case(
              bridge.source_chain,
              source_chain,
            ) ?
              bridge.source_chain :
              _.head(
                (chains_data || [])
                  .filter(c =>
                    !c?.disabled &&
                    c?.id !== source_chain
                  )
              )?.id
      }

      setBridge(
        {
          ...bridge,
          source_chain,
          destination_chain,
        }
      )
    },
    [wallet_chain_id, chains_data],
  )

  // update balances
  useEffect(
    () => {
      dispatch(
        {
          type: BALANCES_DATA,
          value: null,
        }
      )

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
    },
    [address],
  )

  // update balances
  useEffect(
    () => {
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

      const interval =
        setInterval(() =>
          getData(),
          10 * 1000,
        )

      return () => clearInterval(interval)
    },
    [rpcs],
  )

  // fee estimate cooldown
  useEffect(
    () => {
      if (typeof feeEstimateCooldown === 'number') {
        if (feeEstimateCooldown === 0) {
          setEstimateTrigger(
            moment()
              .valueOf()
          )
        }
        else if (fee) {
          const interval =
            setInterval(() =>
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
    },
    [fee, feeEstimateCooldown],
  )

  // reset fee estimate cooldown
  useEffect(
    () => {
      if (
        typeof feeEstimating === 'boolean' &&
        !feeEstimating
      ) {
        setFeeEstimateCooldown(FEE_ESTIMATE_COOLDOWN)
      }
    },
    [fee, feeEstimating],
  )

  // trigger estimate
  useEffect(
    () => {
      const {
        source_chain,
        amount,
      } = { ...bridge }

      const {
        chain_id,
      } = {
        ...(
          (chains_data || [])
            .find(c =>
              c?.id === source_chain
            )
        ),
      }

      if (
        chain_id &&
        Object.keys({ ...balances_data }).length >= chains_data.length &&
        balances_data[chain_id] &&
        amount
      ) {
        setEstimateTrigger(
          moment()
            .valueOf()
        )
      }
    },
    [balances_data],
  )

  // estimate trigger
  useEffect(
    () => {
      if (
        estimateTrigger &&
        !(
          approving ||
          approveResponse ||
          calling ||
          xcall ||
          xcallResponse
        )
      ) {
        estimate()
      }
    },
    [estimateTrigger],
  )

  // update transfer status
  useEffect(
    () => {
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
              const response =
                await sdk.nxtpSdkUtils
                  .getTransfers(
                    {
                      transactionHash,
                    },
                  )

              if (Array.isArray(response)) {
                transfer_data = response
                  .find(t =>
                    equals_ignore_case(
                      t?.xcall_transaction_hash,
                      transactionHash,
                    )
                  )
              }
            } catch (error) {}

            if (
              !transfer_data &&
              address
            ) {
              try {
                const response =
                  await sdk.nxtpSdkUtils
                    .getTransfers(
                      {
                        userAddress: address,
                      },
                    )

                if (Array.isArray(response)) {
                  transfer_data = response
                    .find(t =>
                      equals_ignore_case(
                        t?.xcall_transaction_hash,
                        transactionHash,
                      )
                    )
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
              ]
              .includes(status)
            ) {
              setLatestTransfers(
                _.orderBy(
                  _.uniqBy(
                    _.concat(
                      transfer_data,
                      latestTransfers,
                    ),
                    'xcall_transaction_hash',
                  ),
                  ['xcall_timestamp'],
                  ['desc'],
                )
              )

              reset('finish')
            }
            else if (transfer_data?.transfer_id) {
              setXcall(
                {
                  ...xcall,
                  transfer_id: transfer_data.transfer_id,
                }
              )
            }
          }
          else if (transfer_id) {
            const response =
              await sdk.nxtpSdkUtils
                .getTransfers(
                  {
                    transferId: transfer_id,
                  },
                )

            if (Array.isArray(response)) {
              const transfer_data = response
                .find(t =>
                  equals_ignore_case(
                    t?.transfer_id,
                    transfer_id,
                  )
                )

              const {
                status,
              } = { ...transfer_data }

              if (
                [
                  XTransferStatus.Executed,
                  XTransferStatus.CompletedFast,
                  XTransferStatus.CompletedSlow,
                ]
                .includes(status)
              ) {
                setLatestTransfers(
                  _.orderBy(
                    _.uniqBy(
                      _.concat(
                        transfer_data,
                        latestTransfers,
                      ),
                      'xcall_transaction_hash',
                    ),
                    ['xcall_timestamp'],
                    ['desc'],
                  )
                )

                reset('finish')
              }
            }
          }
        }
      }

      update()

      const interval =
        setInterval(() =>
          update(),
          7.5 * 1000,
        )

      return () => clearInterval(interval)
    },
    [sdk, address, xcall, pageVisible],
  )

  // trigger render latest transfer
  useEffect(
    () => {
      setTimeTrigger(!timeTrigger)
    },
    [openTransferStatus],
  )

  // render latest transfer status
  useEffect(
    () => {
      const update = is_interval => {
        if (
          (
            openTransferStatus ||
            (
              latest_transfer &&
              !latest_transfer.execute_transaction_hash
            )
          ) &&
          (
            !timeTrigger ||
            is_interval
          )
        ) {
          setTimeTrigger(!timeTrigger)
        }
      }

      update()

      const interval =
        setInterval(() =>
          update(true),
          1 * 1000,
        )

      return () => clearInterval(interval)
    },
    [timeTrigger],
  )

  // countdown receive next info
  useEffect(
    () => {
      if (displayReceiveNextInfo) {
        const interval =
          setInterval(() =>
            {
              setReceiveNextInfoTimeout(
                (
                  receiveNextInfoTimeout ||
                  5
                ) -
                1
              )

              if (receiveNextInfoTimeout === 1) {
                setDisplayReceiveNextInfo(false)
              }
            },
            1000,
          )

        return () => clearInterval(interval)
      }
    },
    [displayReceiveNextInfo, receiveNextInfoTimeout],
  )

  const getBalances = chain => {
    const getBalance = async (
      chain_id,
      contract_data,
    ) => {
      const {
        contract_address,
        next_asset,
        wrapable,
      } = { ...contract_data }

      const provider = rpcs?.[chain_id]

      if (
        address &&
        provider
      ) {
        const {
          symbol,
          image,
        } = {
          ...(
            assets_data
              .find(a =>
                (a?.contracts || [])
                  .findIndex(c =>
                    c?.chain_id === chain_id &&
                    equals_ignore_case(
                      c?.contract_address,
                      contract_address,
                    )
                  ) > -1
              )
          ),
        }

        const contracts =
          _.concat(
            wrapable &&
            {
              ...contract_data,
              contract_address: constants.AddressZero,
              symbol,
              image,
            },
            {
              ...contract_data,
            },
            next_asset &&
            {
              ...contract_data,
              ...next_asset,
            },
          )
          .filter(c => c?.contract_address)

        const balances = []

        for (const contract of contracts) {
          const {
            contract_address,
            decimals,
          } = { ...contract }

          let balance

          if (contract_address === constants.AddressZero) {
            balance =
              await provider
                .getBalance(
                  address,
                )
          }
          else {
            const contract =
              new Contract(
                contract_address,
                [
                  'function balanceOf(address owner) view returns (uint256)',
                ],
                provider,
              )

            balance =
              await contract
                .balanceOf(
                  address,
                )
          }

          if (
            balance ||
            !(
              (balances_data?.[`${chain_id}`] || [])
                .findIndex(c =>
                  equals_ignore_case(
                    c?.contract_address,
                    contract_address,
                  )
                ) > -1
            )
          ) {
            balances
              .push(
                {
                  ...contract,
                  amount:
                    balance &&
                    utils.formatUnits(
                      balance,
                      decimals ||
                      18,
                    ),
                }
              )
          }
        }

        if (balances.length > 0) {
          dispatch(
            {
              type: BALANCES_DATA,
              value: {
                [`${chain_id}`]: balances,
              },
            }
          )
        }
      }
    }

    const {
      chain_id,
    } = {
      ...(
        (chains_data || [])
          .find(c =>
            c?.id === chain
          )
      ),
    }

    const contracts_data =
      (assets_data || [])
        .map(a => {
          const {
            contracts,
          } = { ...a }

          return {
            ...a,
            ...(
              (contracts || [])
                .find(c =>
                  c?.chain_id === chain_id
                )
            ),
          }
        })
        .filter(a => a?.contract_address)
        .map(a => {
          const {
            next_asset,
          } = { ...a };
          let {
            contract_address,
          } = {  ...a }

          contract_address = contract_address.toLowerCase()

          if (next_asset?.contract_address) {
            next_asset.contract_address = next_asset.contract_address.toLowerCase()
          }

          return {
            ...a,
            contract_address,
            next_asset,
          }
        })

    contracts_data
      .forEach(c =>
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

    const source_asset_data = (assets_data || [])
      .find(a =>
        a?.id === asset
      )

    const destination_asset_data = (assets_data || [])
      .find(a =>
        a?.id === asset
      )

    return (
      source_chain &&
      destination_chain &&
      source_asset_data &&
      destination_asset_data &&
      !(
        (source_asset_data.contracts || [])
          .findIndex(c =>
            c?.chain_id ===
            (chains_data || [])
              .find(_c =>
                _c?.id === source_chain
              )?.chain_id
          ) < 0
      ) &&
      !(
        (destination_asset_data.contracts || [])
          .findIndex(c =>
            c?.chain_id ===
            (chains_data || [])
              .find(_c =>
                _c?.id === destination_chain
              )?.chain_id
          ) < 0
      )
    )
  }

  const reset = async origin => {
    const reset_bridge =
      ![
        'address',
        'user_rejected',
      ].includes(origin)

    if (reset_bridge) {
      setBridge(
        {
          ...bridge,
          amount: null,
        }
      )

      setXcall(null)
      setEstimatedValues(null)
      setEstimateResponse(null)
    }

    if (
      ![
        'finish',
      ].includes(origin) &&
      reset_bridge
    ) {
      setOptions(DEFAULT_OPTIONS)
    }

    if (reset_bridge) {
      setFee(null)
      setFeeEstimating(null)
      setFeeEstimateCooldown(null)
      setEstimateTrigger(null)
    }

    setApproving(null)
    setApproveProcessing(null)
    setApproveResponse(null)

    setCalling(null)
    setCallProcessing(null)
    setXcallResponse(null)

    setBalanceTrigger(
      moment()
        .valueOf()
    )
    setTransfersTrigger(
      moment()
        .valueOf()
    )

    const {
      source_chain,
      destination_chain,
    } = { ...bridge }

    getBalances(source_chain)
    getBalances(destination_chain)
  }

  const estimate = async () => {
    if (
      checkSupport() &&
      !xcall &&
      !xcallResponse
    ) {
      const {
        source_chain,
        destination_chain,
        asset,
        amount,
      } = { ...bridge }

      const source_chain_data = (chains_data || [])
        .find(c =>
          c?.id === source_chain
        )

      const source_asset_data = (assets_data || [])
        .find(a =>
          a?.id === asset
        )

      const source_contract_data = (source_asset_data?.contracts || [])
        .find(c =>
          c?.chain_id === source_chain_data?.chain_id
        )

      const destination_chain_data = (chains_data || [])
        .find(c =>
          c?.id === destination_chain
        )

      const destination_asset_data = (assets_data || [])
        .find(a =>
          a?.id === asset
        )

      const destination_contract_data = (destination_asset_data?.contracts || [])
        .find(c =>
          c?.chain_id === destination_chain_data?.chain_id
        )

      setFeeEstimating(true)

      if (
        source_contract_data &&
        destination_contract_data &&
        [
          'string',
          'number',
        ].includes(typeof amount) &&
        ![
          '',
        ].includes(amount) &&
        !isNaN(amount)
      ) {
        if (sdk) {
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
            const {
              decimals,
            } = { ...nativeCurrency }

            const routerFee =
              forceSlow ?
                0 :
                parseFloat(
                  (
                    Number(amount) *
                    ROUTER_FEE_PERCENT /
                    100
                  )
                  .toFixed(source_contract_data.decimals)
                )

            const params = {
              originDomain: source_chain_data?.domain_id,
              destinationDomain: destination_chain_data?.domain_id,
              isHighPriority: !forceSlow,
            }

            try {
              console.log(
                '[estimateRelayerFee]',
                params,
              )

              const response =
                await sdk.nxtpSdkBase
                  .estimateRelayerFee(
                    params,
                  )

              const relayerFee =
                response &&
                utils.formatUnits(
                  response,
                  decimals ||
                  18,
                )

              console.log(
                '[relayerFee]',
                {
                  params,
                  response,
                  relayerFee,
                },
              )

              setFee(
                {
                  routerFee,
                  relayerFee,
                }
              )
            } catch (error) {
              console.log(
                '[estimateRelayerFee error]',
                params,
                error,
              )

              setFee(
                {
                  routerFee,
                }
              )
            }
          } catch (error) {}
        }
      }
      else {
        setFee(null)
      }

      setFeeEstimating(false)
    }
  }

  const calculateAmountReceived = async (
    _amount,
    receive_local,
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
          receiveLocal ||
          equals_ignore_case(
            destination_contract_data?.contract_address,
            _destination_contract_data?.next_asset?.contract_address,
          )

      if (isNextAsset) {
        destinationTokenAddress =
          _destination_contract_data?.next_asset?.contract_address ||
          destinationTokenAddress
      }

      let manual

      try {
        setEstimatedValues(null)
        setEstimateResponse(null)

        if (
          amount
            .gt(
              BigNumber.from(
                '0'
              )
            ) &&
          (pools_data || [])
            .findIndex(p =>
              [
                source_chain_data?.id,
                destination_chain_data?.id,
              ].includes(p?.chain_data?.id) &&
              !p?.tvl
            ) < 0
        ) {
          console.log(
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
            await sdk.nxtpSdkPool
              .calculateAmountReceived(
                originDomain,
                destinationDomain,
                originTokenAddress,
                amount,
                isNextAsset,
              )

          console.log(
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

          setEstimatedValues(
            Object.fromEntries(
              Object.entries({ ...response })
                .map(([k, v]) => {
                  return [
                    k,
                    utils.formatUnits(
                      v,
                      [
                        'amountReceived',
                      ].includes(k) ?
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

        setEstimatedValues(
          {
            amountReceived: Number(_amount) - routerFee,
            routerFee,
            isNextAsset:
              typeof receive_local === 'boolean' ?
                receive_local :
                receiveLocal,
          }
        )
      }
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
      let {
        symbol,
      } = { ...bridge }

      const {
        to,
        infiniteApprove,
        callData,
        slippage,
        forceSlow,
        receiveLocal,
      } = { ...options }

      const {
        relayerFee,
      } = { ...fee }

      const source_chain_data = (chains_data || [])
        .find(c =>
          c?.id === source_chain
        )

      const source_asset_data = (assets_data || [])
        .find(a =>
          a?.id === asset
        )

      let source_contract_data = (source_asset_data?.contracts || [])
        .find(c =>
          c?.chain_id === source_chain_data?.chain_id
        )

      if (symbol) {
        if (
          equals_ignore_case(
            source_contract_data?.next_asset?.symbol,
            symbol,
          )
        ) {
          source_contract_data = {
            ...source_contract_data,
            ...source_contract_data.next_asset,
          }
        }
        else if (
          source_contract_data?.wrapable &&
          equals_ignore_case(
            source_asset_data?.symbol,
            symbol,
          )
        ) {
          source_contract_data = {
            ...source_contract_data,
            contract_address: constants.AddressZero,
            symbol: source_asset_data.symbol,
            image: source_asset_data.image,
          }
        }
      }

      symbol =
        source_contract_data?.symbol ||
        source_asset_data?.symbol

      const destination_chain_data = (chains_data || [])
        .find(c =>
          c?.id === destination_chain
        )

      let destination_contract_data = (source_asset_data?.contracts || [])
        .find(c =>
          c?.chain_id === destination_chain_data?.chain_id
        )

      if (
        (
          receiveLocal ||
          estimatedValues?.isNextAsset
        ) &&
        destination_contract_data?.next_asset
      ) {
        destination_contract_data = {
          ...destination_contract_data,
          ...destination_contract_data.next_asset,
        }
      }

      const xcallParams = {
        origin: source_chain_data?.domain_id,
        destination: destination_chain_data?.domain_id,
        to:
          to ||
          address,
        asset: source_contract_data?.contract_address,
        delegate:
          to ||
          address,
        amount:
          utils.parseUnits(
            (
              amount ||
              0
            )
            .toString(),
            source_contract_data?.decimals ||
            18,
          )
          .toString(),
        slippage:
          (
            (typeof slippage === 'number' ?
              slippage :
              DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE
            ) *
            100
          )
          .toString(),
        receiveLocal:
          receiveLocal ||
          false,
        callData:
          callData ||
          '0x',
        relayerFee:
          relayerFee ?
            utils.parseUnits(
              relayerFee
                .toString(),
              18,
            )
            .toString() :
            undefined,
      }

      let failed = false

      if (
        process.env.NEXT_PUBLIC_NETWORK !== 'testnet' &&
        !xcallParams.relayerFee
      ) {
        setXcallResponse(
          {
            status: 'failed',
            message: 'Cannot estimate the relayer fee at the moment. Please try again later.',
            code: XTransferErrorStatus.InsufficientRelayerFee,
          }
        )

        failed = true
      }

      if (!failed) {
        try {
          const approve_request =
            await sdk.nxtpSdkBase
              .approveIfNeeded(
                xcallParams.origin,
                xcallParams.asset,
                xcallParams.amount,
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
          failed = true

          const message =
            error?.reason ||
            error?.data?.message ||
            error?.message

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

          setApproveResponse(
            {
              status: 'failed',
              message,
              code,
            }
          )

          setApproveProcessing(false)
          setApproving(false)
        }
      }

      if (!failed) {
        const is_wrap_eth =
          equals_ignore_case(
            source_contract_data?.contract_address,
            constants.AddressZero,
          ) &&
          [
            'ETH',
          ].includes(source_asset_data?.symbol)

        try {
          if (is_wrap_eth) {
            xcallParams.asset = _source_contract_data?.contract_address
            xcallParams.wrapNativeOnOrigin = true

            if (_.head(destination_chain_data?.provider_params)?.nativeCurrency?.symbol?.endsWith('ETH')) {
              xcallParams.unwrapNativeOnDestination =
                xcallParams.receiveLocal ?
                  false :
                  true
            }
          }

          console.log(
            '[xcall]',
            {
              xcallParams,
            },
          )

          const xcall_request =
            await sdk.nxtpSdkBase
              .xcall(
                xcallParams,
              )

          if (xcall_request) {
            let gasLimit =
              await signer
                .estimateGas(
                  xcall_request,
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

              xcall_request.gasLimit = gasLimit
            }

            const xcall_response =
              await signer
                .sendTransaction(
                  xcall_request,
                )

            const {
              hash,
            } = { ...xcall_response }

            setCallProcessing(true)

            const xcall_receipt =
              await signer.provider
                .waitForTransaction(
                  hash,
                )

            setXcall(xcall_receipt)

            const {
              transactionHash,
              status,
            } = { ...xcall_receipt }

            failed = !status

            setXcallResponse(
              {
                status:
                  failed ?
                    'failed' :
                    'success',
                message:
                  failed ?
                    'Failed to send transaction' :
                    `Transferring ${symbol}. (It's ok to close the browser)`,
                tx_hash: hash,
              }
            )

            success = true

            if (!failed) {
              const destination_transacting_asset =
                receiveLocal ||
                estimatedValues?.isNextAsset ?
                  destination_contract_data?.next_asset?.contract_address ||
                  destination_contract_data?.contract_address :
                  destination_contract_data?.contract_address

              setLatestTransfers(
                _.orderBy(
                  _.uniqBy(
                    _.concat(
                      {
                        xcall_transaction_hash:
                          transactionHash ||
                          hash,
                        xcall_timestamp:
                          moment()
                            .unix(),
                        origin_chain: source_chain_data?.chain_id,
                        origin_domain: xcallParams.origin,
                        origin_transacting_asset: xcallParams.asset,
                        origin_transacting_amount:
                          Number(
                            utils.parseUnits(
                              (
                                amount ||
                                0
                              )
                              .toString(),
                              source_contract_data?.decimals ||
                              18,
                            )
                            .toString()
                          ),
                        destination_chain: destination_chain_data?.chain_id,
                        destination_domain: xcallParams.destination,
                        destination_transacting_asset,
                        destination_transacting_amount:
                          estimatedValues?.amountReceived ?
                            utils.parseUnits(
                              (
                                estimatedValues.amountReceived ||
                                0
                              )
                              .toString(),
                              (
                                equals_ignore_case(
                                  destination_transacting_asset,
                                  destination_contract_data?.next_asset?.contract_address,
                                ) &&
                                destination_contract_data?.next_asset ?
                                  destination_contract_data.next_asset?.decimals :
                                  destination_contract_data?.decimals
                              ) ||
                              18,
                            )
                            .toString() :
                            undefined,
                        to: xcallParams.to,
                        force_slow: forceSlow,
                        receive_local:
                          receiveLocal ||
                          estimatedValues?.isNextAsset,
                      },
                      latestTransfers,
                    ),
                    'xcall_transaction_hash',
                  ),
                  ['xcall_timestamp'],
                  ['desc'],
                )
              )

              setOpenTransferStatus(true)
            }
          }
        } catch (error) {
          let message = 
            error?.reason ||
            error?.data?.message ||
            error?.message

          console.log(
            '[xcall error]',
            {
              xcallParams,
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
              setXcallResponse(
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
      await sleep(1 * 1000)

      setBalanceTrigger(
        moment()
          .valueOf()
      )
      setTransfersTrigger(
        moment()
          .valueOf()
      )
    }
  }

  const {
    source_chain,
    destination_chain,
    asset,
    symbol,
    amount,
    receive_next,
  } = { ...bridge }

  const {
    to,
    infiniteApprove,
    slippage,
    forceSlow,
    receiveLocal,
    showNextAssets,
  } = { ...options }

  const source_chain_data = (chains_data || [])
    .find(c =>
      c?.id === source_chain
    )

  const {
    color,
  } = { ...source_chain_data }

  const source_asset_data = (assets_data || [])
    .find(a =>
      a?.id === asset
    )

  let source_contract_data = (source_asset_data?.contracts || [])
    .find(c =>
      c?.chain_id === source_chain_data?.chain_id
    )

  const _source_contract_data = _.cloneDeep(source_contract_data)

  if (symbol) {
    if (
      equals_ignore_case(
        source_contract_data?.next_asset?.symbol,
        symbol,
      )
    ) {
      source_contract_data = {
        ...source_contract_data,
        ...source_contract_data.next_asset,
      }
    }
    else if (
      source_contract_data?.wrapable &&
      equals_ignore_case(
        source_asset_data?.symbol,
        symbol,
      )
    ) {
      source_contract_data = {
        ...source_contract_data,
        contract_address: constants.AddressZero,
        symbol: source_asset_data.symbol,
        image: source_asset_data.image,
      }
    }
  }

  const destination_chain_data = (chains_data || [])
    .find(c =>
      c?.id === destination_chain
    )

  const destination_asset_data = (assets_data || [])
    .find(a =>
      a?.id === asset
    )

  let destination_contract_data = (destination_asset_data?.contracts || [])
    .find(c =>
      c?.chain_id === destination_chain_data?.chain_id
    )  

  const _destination_contract_data = _.cloneDeep(destination_contract_data)

  if (
    (
      receiveLocal ||
      estimatedValues?.isNextAsset
    ) &&
    destination_contract_data?.next_asset
  ) {
    destination_contract_data = {
      ...destination_contract_data,
      ...destination_contract_data.next_asset,
    }
  }
  else if (
    symbol &&
    destination_contract_data?.wrapable &&
    equals_ignore_case(
      destination_asset_data?.symbol,
      symbol,
    )
  ) {
    destination_contract_data = {
      ...destination_contract_data,
      contract_address: constants.AddressZero,
      symbol: destination_asset_data.symbol,
      image: destination_asset_data.image,
    }
  }

  // const {
  //   color,
  // } = { ...source_asset_data }

  const source_symbol =
    source_contract_data?.symbol ||
    source_asset_data?.symbol

  const source_balance = (balances_data?.[source_chain_data?.chain_id] || [])
    .find(b =>
      equals_ignore_case(
        b?.contract_address,
        source_contract_data?.contract_address,
      )
    )

  const source_amount = source_balance?.amount

  const source_decimals =
    source_contract_data?.decimals ||
    18

  const source_gas_native_token = _.head(source_chain_data?.provider_params)?.nativeCurrency

  const destination_symbol =
    destination_contract_data?.symbol ||
    destination_asset_data?.symbol

  const destination_balance = (balances_data?.[destination_chain_data?.chain_id] || [])
    .find(b =>
      equals_ignore_case(
        b?.contract_address,
        destination_contract_data?.contract_address,
      )
    )

  const destination_amount = destination_balance?.amount

  const destination_decimals =
    destination_contract_data?.decimals ||
    18

  const relayer_fee =
    fee &&
    (
      fee.relayerFee ||
      0
    )

  const router_fee =
    estimatedValues?.routerFee ?
      estimatedValues.routerFee :
      fee &&
      (
        forceSlow ?
          0 :
          fee.routerFee ||
          0
      )

  const price_impact = null

  const liquidity_amount =
    _.sum(
      (asset_balances_data?.[destination_chain_data?.chain_id] || [])
        .filter(a =>
          [
            destination_contract_data?.contract_address,
            destination_contract_data?.next_asset?.contract_address,
          ]
          .filter(_a => _a)
          .findIndex(_a =>
            equals_ignore_case(
              a?.contract_address,
              _a,
            )
          ) > -1
        )
        .map(a =>
          Number(
            utils.formatUnits(
              BigNumber.from(
                a?.amount ||
                '0'
              ),
              equals_ignore_case(
                a?.contract_address,
                destination_contract_data?.next_asset?.contract_address,
              ) &&
              destination_contract_data?.next_asset ?
                destination_contract_data.next_asset?.decimals ||
                18 :
                destination_decimals,
            )
          )
        )
    )

  const pool_data = (pools_data || [])
    .find(p =>
      p?.chain_data?.id === destination_chain &&
      p?.asset_data?.id === asset
    )

  const {
    adopted,
    local,
  } = { ...pool_data }

  const next_asset_data =
    adopted?.symbol?.startsWith(WRAPPED_PREFIX) ?
      adopted :
      local?.symbol?.startsWith(WRAPPED_PREFIX) ?
        local :
        local

  const pool_amounts =
    [
      adopted,
      local,
    ]
    .filter(t =>
      [
        'string',
        'number',
      ].includes(typeof t?.balance)
    )
    .map(t =>
      Number(
        t.balance ||
        '0'
      )
    )

  const pool_amount =
    receiveLocal ||
    estimatedValues?.isNextAsset ?
      null :
      next_asset_data > -1 ?
        Number(next_asset_data.balance) :
        _.min(pool_amounts)

  const min_amount = 0
  const max_amount = source_amount

  const estimated_received =
    estimatedValues?.amountReceived ?
      estimatedValues.amountReceived :
      Number(amount) > 0 &&
      typeof router_fee === 'number' ?
        Number(amount) - router_fee :
        null

  const estimated_slippage =
    estimatedValues?.destinationSlippage &&
    estimatedValues?.originSlippage ?
      (
        Number(estimatedValues.destinationSlippage) +
        Number(estimatedValues.originSlippage)
      ) * 100 :
      null

  const wrong_chain =
    source_chain_data &&
    wallet_chain_id !== source_chain_data.chain_id &&
    !xcall

  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  const recipient_address =
    to ||
    address

  const latest_transfer = _.head(latestTransfers)

  const estimated_time_seconds =
    latest_transfer?.force_slow ?
      5400 :
      240

  const time_spent_seconds =
    moment()
      .diff(
        moment(
          latest_transfer?.xcall_timestamp ?
            latest_transfer.xcall_timestamp * 1000 :
            undefined
        ),
        'seconds',
      )

  const errored =
    [
      XTransferErrorStatus.LowSlippage,
      XTransferErrorStatus.InsufficientRelayerFee,
    ]
    .includes(latest_transfer?.error_status) &&
    ![
      XTransferStatus.CompletedFast,
      XTransferStatus.CompletedSlow,
    ]
    .includes(latest_transfer?.status)

  const disabled =
    calling ||
    approving

  const boxShadow =
    color &&
    `${color}${
      theme === 'light' ?
        '44' :
        '33'
    } 0px 16px 128px 64px`

  const has_latest_transfers =
    typeof latestTransfersSize === 'number' &&
    latestTransfersSize > 0

  const is_staging =
    process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' ||
    process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  return (
    <div className={`grid grid-cols-1 ${has_latest_transfers ? 'lg:grid-cols-8' : ''} items-start gap-4 my-4 sm:my-0 xl:my-4`}>
      <div className="hidden xl:block col-span-0 xl:col-span-2" />
      <div className={`col-span-1 ${has_latest_transfers ? 'lg:col-span-5' : ''} xl:col-span-4`}>
        <div className="mt-4 sm:mt-0 xl:mt-8">
          <Announcement />
        </div>
        <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-6 my-4 sm:my-0 xl:my-6 mx-1 sm:mx-4">
          <div className="w-full max-w-md space-y-3">
            {
              openTransferStatus &&
              latest_transfer ?
                <PageVisibility
                  onChange={v => setPageVisible(v)}
                >
                  <div className="bg-slate-50 dark:bg-slate-900 rounded border dark:border-slate-700 space-y-6 pt-5 sm:pt-5 pb-6 sm:pb-6 px-4 sm:px-6">
                    <div className="flex items-center justify-between space-x-2">
                      <span className="text-lg font-semibold">
                        Transfer status
                      </span>
                      <button
                        onClick={() => {
                          setXcall(null)
                          setXcallResponse(null)
                          setOpenTransferStatus(false)
                        }}
                      >
                        <MdClose
                          size={20}
                          className="-mr-1"
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-center">
                      {latest_transfer.execute_transaction_hash ?
                        <a
                          href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.transaction_path?.replace('{tx}', latest_transfer.execute_transaction_hash)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center space-y-1.5"
                        >
                          <HiOutlineCheckCircle
                            size={72}
                            className="text-green-500 dark:text-green-400"
                          />
                          <span className="text-xl font-semibold">
                            Completed
                          </span>
                        </a> :
                        errored ?
                          <ActionRequired
                            transferData={latest_transfer}
                            buttonTitle={
                              <Tooltip
                                placement="top"
                                content={latest_transfer.error_status}
                                className="z-50 bg-dark text-white text-xs"
                              >
                                <div>
                                  <IoWarning
                                    size={72}
                                    className="text-red-600 dark:text-red-500"
                                  />
                                </div>
                              </Tooltip>
                            }
                            onTransferBumped={
                              relayer_fee => {
                                if (latestTransfers) {
                                  const index = latestTransfers
                                    .findIndex(t =>
                                      t?.transfer_id === latest_transfer?.transfer_id
                                    )

                                  if (index > -1) {
                                    latestTransfers[index] =
                                      {
                                        ...latestTransfers[index],
                                        relayer_fee,
                                        error_status: null,
                                      }

                                    setLatestTransfers(latestTransfers)
                                  }
                                }
                              }
                            }
                          /> :
                          <CountdownCircleTimer
                            isPlaying
                            duration={estimated_time_seconds}
                            colors={
                              latest_transfer.force_slow ?
                                '#facc15' :
                                '#22c55e'
                            }
                            size={140}
                          >
                            {({ remainingTime }) => (
                              time_spent_seconds > estimated_time_seconds ?
                                <span className="text-sm font-semibold">
                                  Processing ...
                                </span> :
                                <div className="flex flex-col items-center space-y-1">
                                  <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                                    Time left
                                  </span>
                                  <span className="text-lg font-semibold">
                                    {total_time_string(
                                      time_spent_seconds,
                                      estimated_time_seconds,
                                    )}
                                  </span>
                                </div>
                            )}
                          </CountdownCircleTimer>
                      }
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <div> 
                        {latest_transfer.execute_transaction_hash ?
                          <span className="text-lg font-semibold">
                            Funds received!
                          </span> :
                          errored ?
                            <ActionRequired
                              transferData={latest_transfer}
                              buttonTitle={
                                <Tooltip
                                  placement="top"
                                  content={latest_transfer.error_status}
                                  className="z-50 bg-dark text-white text-xs"
                                >
                                  <span className="text-lg font-semibold">
                                    Action required
                                  </span>
                                </Tooltip>
                              }
                              onTransferBumped={
                                relayer_fee => {
                                  if (latestTransfers) {
                                    const index = latestTransfers
                                      .findIndex(t =>
                                        t?.transfer_id === latest_transfer?.transfer_id
                                      )

                                    if (index > -1) {
                                      latestTransfers[index] =
                                        {
                                          ...latestTransfers[index],
                                          relayer_fee,
                                          error_status: null,
                                        }

                                      setLatestTransfers(latestTransfers)
                                    }
                                  }
                                }
                              }
                            /> :
                            <div className="flex flex-wrap items-center text-lg font-semibold space-x-1.5">
                              <span>
                                Sending
                              </span>
                              <span>
                                {
                                  Number(amount) > 1000 ?
                                    number_format(
                                      amount,
                                      '0,0.00',
                                      true,
                                    ) :
                                    amount
                                }
                              </span>
                              <div className="flex flex-wrap items-center space-x-1.5">
                                {
                                  (
                                    source_contract_data?.image ||
                                    source_asset_data?.image
                                  ) &&
                                  (
                                    <Image
                                      src={
                                        source_contract_data?.image ||
                                        source_asset_data?.image
                                      }
                                      alt=""
                                      width={24}
                                      height={24}
                                      className="rounded-full"
                                    />
                                  )
                                }
                                <span>
                                  {source_symbol}
                                </span>
                              </div>
                            </div>
                        }
                      </div>
                      <span className="text-slate-500 dark:text-slate-500 text-xs sm:text-sm font-medium">
                        {latest_transfer.execute_transaction_hash ?
                          null :
                          <div className="flex flex-col items-center space-y-1">
                            {time_spent_seconds > estimated_time_seconds ?
                              <span className="text-center">
                                Your assets are on the way! We will keep you informed.
                              </span> :
                              <div className="flex flex-wrap items-center justify-center space-x-1">
                                <span>
                                  Your funds will arrive at the destination in about
                                </span>
                                <TimeSpent
                                  from_time={time_spent_seconds}
                                  to_time={estimated_time_seconds}
                                  no_tooltip={true}
                                  className="text-black dark:text-white font-semibold"
                                />
                                .
                              </div>
                            }
                            <span className="text-center">
                              If you close this window, your transaction will still be processed.
                            </span>
                          </div>
                        }
                      </span>
                    </div>
                    {/*
                      <button
                        onClick={() => {
                          setXcall(null)
                          setOpenTransferStatus(false)
                        }}
                        className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-lg font-medium text-center sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                      >
                        <span>
                          Got it
                        </span>
                      </button>
                    */}
                  </div>
                </PageVisibility> :
                <div className="space-y-3">
                  {
                    bridge._receiveLocal &&
                    destination_contract_data &&
                    !destination_contract_data.next_asset &&
                    (
                      <AlertNotification
                        show={
                          typeof displayReceiveNextInfo !== 'boolean' ||
                          displayReceiveNextInfo
                        }
                        icon={
                          <IoInformationCircleOutline
                            size={26}
                            className="mb-0.5"
                          />
                        }
                        animate={
                          {
                            mount: { y: 0 },
                            unmount: { y: 32 },
                          }
                        }
                        dismissible={
                          {
                            onClose: () => setDisplayReceiveNextInfo(false),
                          }
                        }
                        className="alert-box flex"
                      >
                        <span className="text-sm">
                          Receive NextAsset setting turned off for {destination_chain_data?.name}.
                        </span>
                      </AlertNotification>
                    )
                  }
                  <div
                    className="bg-white dark:bg-slate-900 rounded border dark:border-slate-700 space-y-8 pt-5 sm:pt-6 pb-6 sm:pb-7 px-4 sm:px-6"
                    style={
                      checkSupport() &&
                      boxShadow ?
                        {
                          boxShadow,
                          WebkitBoxShadow: boxShadow,
                          MozBoxShadow: boxShadow,
                        } :
                        undefined
                    }
                  >
                    <div className="space-y-7">
                      <div className="flex items-center justify-between space-x-2">
                        <h1 className="text-xl font-semibold">
                          Bridge
                          {
                            receive_next &&
                            (
                              <span className="ml-1">
                                into nextAsset
                              </span>
                            )
                          }
                        </h1>
                        {
                          ![
                            'pool',
                          ].includes(source) &&
                          (
                            <Options
                              disabled={disabled}
                              applied={
                                !_.isEqual(
                                  Object.fromEntries(
                                    Object.entries(options)
                                      .filter(([k, v]) =>
                                        ![
                                          'slippage',
                                          'forceSlow',
                                          'showNextAssets',
                                        ].includes(k)
                                      )
                                  ),
                                  Object.fromEntries(
                                    Object.entries(DEFAULT_OPTIONS)
                                      .filter(([k, v]) =>
                                        ![
                                          'slippage',
                                          'forceSlow',
                                          'showNextAssets',
                                        ].includes(k)
                                      )
                                  ),
                                )
                              }
                              initialData={options}
                              onChange={o => {
                                const {
                                  receiveLocal,
                                } = { ...o }

                                setOptions(o)

                                if (
                                  (
                                    receiveLocal &&
                                    !options?.receiveLocal
                                  ) ||
                                  (
                                    !receiveLocal &&
                                    options?.receiveLocal
                                  )
                                ) {
                                  if (
                                    amount &&
                                    ![
                                      '',
                                      '0',
                                      '0.0',
                                    ].includes(amount)
                                  ) {
                                    calculateAmountReceived(
                                      amount,
                                      receiveLocal,
                                    )
                                  }
                                  else {
                                    setEstimatedValues(
                                      {
                                        amountReceived: '0',
                                        routerFee: '0',
                                        isNextAsset: receiveLocal,
                                      }
                                    )
                                  }

                                  if (
                                    query?.receive_next &&
                                    !receiveLocal
                                  ) {
                                    const params =
                                      {
                                        amount,
                                        receive_next: receiveLocal,
                                      }

                                    router
                                      .push(
                                        `/${
                                          source_chain &&
                                          destination_chain ?
                                            `${
                                              asset ?
                                                `${asset.toUpperCase()}-` :
                                                ''
                                            }from-${source_chain}-to-${destination_chain}` :
                                            ''
                                        }${
                                          Object.keys(params).length > 0 ?
                                            `?${new URLSearchParams(params).toString()}` :
                                            ''
                                        }`,
                                        undefined,
                                        {
                                          shallow: true,
                                        },
                                      )
                                  }
                                }
                              }}
                              hasNextAsset={destination_contract_data?.next_asset}
                              chainData={destination_chain_data}
                            />
                          )
                        }
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-5 gap-3 sm:gap-6">
                        <div className="col-span-2 sm:col-span-2 flex flex-col items-center sm:items-start space-y-0.5 sm:space-y-2">
                          <div className="w-32 sm:w-40 flex flex-col sm:flex-row sm:items-center justify-start space-x-1.5">
                            <span className="text-slate-600 dark:text-slate-500 text-sm font-medium text-left">
                              From
                            </span>
                            {/*
                              <GasPrice
                                chainId={source_chain_data?.chain_id}
                                dummy={true}
                                iconSize={18}
                                className="text-xs"
                              />
                            */}
                          </div>
                          <SelectChain
                            disabled={disabled}
                            fixed={
                              [
                                'pool',
                              ].includes(source)
                            }
                            value={source_chain}
                            onSelect={c => {
                              const _source_chain = c
                              const _destination_chain =
                                c === destination_chain ?
                                  source_chain :
                                  destination_chain

                              setBridge(
                                {
                                  ...bridge,
                                  source_chain: _source_chain,
                                  destination_chain: _destination_chain,
                                  symbol:
                                    equals_ignore_case(
                                      _source_chain,
                                      source_chain,
                                    ) ?
                                      symbol :
                                      undefined,
                                }
                              )

                              getBalances(_source_chain)
                              getBalances(_destination_chain)
                            }}
                            source={source_chain}
                            destination={destination_chain}
                            origin="from"
                          />
                        </div>
                        <div className="flex items-center justify-center mt-5.5 sm:mt-7">
                          <button
                            disabled={disabled}
                            onClick={() => {
                              if (!disabled) {
                                setBridge(
                                  {
                                    ...bridge,
                                    source_chain: destination_chain,
                                    destination_chain: source_chain,
                                    amount: null,
                                  }
                                )

                                setButtonDirection(
                                  buttonDirection * -1
                                )

                                getBalances(source_chain)
                                getBalances(destination_chain)
                              }
                            }}
                            className={
                              `bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 ${
                                disabled ?
                                  'cursor-not-allowed' :
                                  ''
                              } ${
                                [
                                  'pool',
                                ].includes(source) ?
                                  'pointer-events-none dark:border-slate-800' :
                                  'dark:border-slate-700'
                              } rounded border flex items-center justify-center p-1 sm:p-1.5`
                            }
                          >
                            <HiArrowRight
                              size={18}
                              style={
                                false &&
                                buttonDirection < 0 ?
                                  {
                                    transform: 'scaleX(-1)',
                                  } :
                                  undefined
                              }
                            />
                          </button>
                        </div>
                        <div className="col-span-2 sm:col-span-2 flex flex-col items-center sm:items-end space-y-0.5 sm:space-y-2">
                          <div className="w-32 sm:w-40 flex flex-col sm:flex-row sm:items-center justify-start space-x-1.5">
                            <span className="text-slate-600 dark:text-slate-500 text-sm font-medium text-left">
                              To
                            </span>
                            {/*
                              <GasPrice
                                chainId={destination_chain_data?.chain_id}
                                dummy={true}
                                iconSize={18}
                                className="text-xs"
                              />
                            */}
                          </div>
                          <SelectChain
                            disabled={disabled}
                            fixed={
                              [
                                'pool',
                              ].includes(source)
                            }
                            value={destination_chain}
                            onSelect={c => {
                              const _source_chain =
                                c === source_chain ?
                                  destination_chain :
                                  source_chain
                              const _destination_chain = c

                              setBridge(
                                {
                                  ...bridge,
                                  source_chain: _source_chain,
                                  destination_chain: _destination_chain,
                                }
                              )

                              getBalances(_source_chain)
                              getBalances(_destination_chain)
                            }}
                            source={source_chain}
                            destination={destination_chain}
                            origin="to"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between space-x-2">
                        <div className="text-slate-600 dark:text-slate-500 text-sm font-medium">
                          You send
                        </div>
                        {
                          source_chain_data &&
                          asset &&
                          (
                            <div className="flex items-center justify-between space-x-2">
                              <div className="flex items-center space-x-1">
                                <div className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                                  Balance:
                                </div>
                                <button
                                  disabled={disabled}
                                  onClick={() => {
                                    if (
                                      utils.parseUnits(
                                        max_amount ||
                                        '0',
                                        source_decimals,
                                      )
                                      .gt(
                                        BigNumber.from(
                                          '0'
                                        )
                                      )
                                    ) {
                                      setBridge(
                                        {
                                          ...bridge,
                                          amount: max_amount,
                                        }
                                      )

                                      if (
                                        [
                                          'string',
                                          'number',
                                        ].includes(typeof max_amount)
                                      ) {
                                        if (
                                          max_amount &&
                                          ![
                                            '',
                                            '0',
                                            '0.0',
                                          ].includes(max_amount)
                                        ) {
                                          calculateAmountReceived(max_amount)
                                        }
                                        else {
                                          setEstimatedValues(
                                            {
                                              amountReceived: '0',
                                              routerFee: '0',
                                              isNextAsset: receiveLocal,
                                            }
                                          )
                                        }
                                      }
                                    }
                                  }}
                                >
                                  <Balance
                                    chainId={source_chain_data.chain_id}
                                    asset={asset}
                                    contractAddress={source_contract_data?.contract_address}
                                    decimals={source_decimals}
                                    symbol={source_symbol}
                                    hideSymbol={false}
                                    trigger={balanceTrigger}
                                  />
                                </button>
                              </div>
                            </div>
                          )
                        }
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-700 space-y-0.5 py-2.5 px-3">
                        <div className="flex items-center justify-between space-x-2">
                          <SelectAsset
                            disabled={disabled}
                            fixed={
                              [
                                'pool',
                              ].includes(source)
                            }
                            value={asset}
                            onSelect={(a, s) => {
                              setBridge(
                                {
                                  ...bridge,
                                  asset: a,
                                  symbol: s,
                                  amount:
                                    a !== asset ||
                                    !equals_ignore_case(
                                      s,
                                      symbol,
                                    ) ?
                                      null :
                                      amount,
                                }
                              )

                              if (a !== asset) {
                                getBalances(source_chain)
                                getBalances(destination_chain)
                              }
                            }}
                            chain={source_chain}
                            origin=""
                            is_bridge={true}
                            show_next_assets={showNextAssets}
                            show_native_assets={true}
                            data={
                              {
                                ...source_asset_data,
                                ...source_contract_data,
                              }
                            }
                            className="flex items-center space-x-1.5 sm:space-x-2 sm:-ml-1"
                          />
                          <DebounceInput
                            debounceTimeout={750}
                            size="small"
                            type="number"
                            placeholder="0.00"
                            disabled={
                              disabled ||
                              !asset
                            }
                            value={
                              [
                                'string',
                                'number',
                              ].includes(typeof amount) &&
                              ![
                                '',
                              ].includes(amount) &&
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
                                    source_decimals ||
                                    18,
                                  )
                              }

                              setBridge(
                                {
                                  ...bridge,
                                  amount: value,
                                }
                              )

                              if (
                                [
                                  'string',
                                  'number',
                                ].includes(typeof value)
                              ) {
                                if (
                                  value &&
                                  ![
                                    '',
                                    '0',
                                    '0.0',
                                  ].includes(value)
                                ) {
                                  calculateAmountReceived(value)
                                }
                                else {
                                  setEstimatedValues(
                                    {
                                      amountReceived: '0',
                                      routerFee: '0',
                                      isNextAsset: receiveLocal,
                                    }
                                  )
                                }
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
                            className={`w-36 sm:w-48 bg-transparent ${disabled ? 'cursor-not-allowed' : ''} rounded border-0 focus:ring-0 sm:text-lg font-semibold text-right py-1.5`}
                          />
                        </div>
                        {
                          false &&
                          source_chain_data &&
                          asset &&
                          (
                            <div className="flex items-center justify-between space-x-2">
                              <div className="flex items-center space-x-1">
                                <div className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                                  Balance:
                                </div>
                                <button
                                  disabled={disabled}
                                  onClick={() => {
                                    if (
                                      utils.parseUnits(
                                        max_amount ||
                                        '0',
                                        source_decimals,
                                      )
                                      .gt(
                                        BigNumber.from(
                                          '0'
                                        )
                                      )
                                    ) {
                                      setBridge(
                                        {
                                          ...bridge,
                                          amount: max_amount,
                                        }
                                      )

                                      if (
                                        [
                                          'string',
                                          'number',
                                        ].includes(typeof max_amount)
                                      ) {
                                        if (
                                          max_amount &&
                                          ![
                                            '',
                                            '0',
                                            '0.0',
                                          ].includes(max_amount)
                                        ) {
                                          calculateAmountReceived(max_amount)
                                        }
                                        else {
                                          setEstimatedValues(
                                            {
                                              amountReceived: '0',
                                              routerFee: '0',
                                              isNextAsset: receiveLocal,
                                            }
                                          )
                                        }
                                      }
                                    }
                                  }}
                                >
                                  <Balance
                                    chainId={source_chain_data.chain_id}
                                    asset={asset}
                                    contractAddress={source_contract_data?.contract_address}
                                    decimals={source_decimals}
                                    symbol={source_symbol}
                                    hideSymbol={true}
                                    trigger={balanceTrigger}
                                  />
                                </button>
                              </div>
                              {
                                destination_chain &&
                                !checkSupport() ?
                                <div className=" text-slate-400 dark:text-slate-500">
                                  Route not supported
                                </div> :
                                address &&
                                (
                                  <button
                                    disabled={disabled}
                                    onClick={() => {
                                      setBridge(
                                        {
                                          ...bridge,
                                          amount: max_amount,
                                        }
                                      )

                                      if (
                                        [
                                          'string',
                                          'number',
                                        ].includes(typeof max_amount)
                                      ) {
                                        if (
                                          max_amount &&
                                          ![
                                            '',
                                            '0',
                                            '0.0',
                                          ].includes(max_amount)
                                        ) {
                                          calculateAmountReceived(max_amount)
                                        }
                                        else {
                                          setEstimatedValues(
                                            {
                                              amountReceived: '0',
                                              routerFee: '0',
                                              isNextAsset: receiveLocal,
                                            }
                                          )
                                        }
                                      }
                                    }}
                                    className={`${disabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400'} text-sm font-medium`}
                                  >
                                    Select Max
                                  </button>
                                )
                              }
                            </div>
                          )
                        }
                      </div>
                    </div>
                    {
                      source_chain &&
                      destination_chain &&
                      asset &&
                      !checkSupport() ?
                        <div className="text-slate-400 dark:text-slate-200 font-medium text-center">
                          Route not supported
                        </div> :
                        <>
                          {
                            (
                              (
                                true ||
                                [
                                  'string',
                                  'number',
                                ].includes(typeof estimated_received)
                              ) &&
                              (
                                checkSupport() &&
                                (
                                  true ||
                                  (
                                    web3_provider &&
                                    Number(amount) > 0
                                  )
                                )
                              )
                            ) &&
                            (
                              <div
                                className={
                                  `${
                                    true ||
                                    is_staging ?
                                      'space-y-6' :
                                      'space-y-2.5'
                                  }`
                                }
                              >
                                {
                                  true ||
                                  is_staging ?
                                    <div className="space-y-2.5">
                                      <div className="flex items-center justify-between space-x-2">
                                        <div className="text-slate-600 dark:text-slate-500 text-sm font-medium">
                                          You receive
                                        </div>
                                        {
                                          destination_chain_data &&
                                          asset &&
                                          (
                                            <div className="flex items-center justify-between space-x-2">
                                              <div className="flex items-center space-x-1">
                                                <div className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                                                  Balance:
                                                </div>
                                                <Balance
                                                  chainId={destination_chain_data.chain_id}
                                                  asset={asset}
                                                  contractAddress={destination_contract_data?.contract_address}
                                                  decimals={destination_decimals}
                                                  symbol={destination_symbol}
                                                  hideSymbol={false}
                                                  trigger={balanceTrigger}
                                                />
                                              </div>
                                            </div>
                                          )
                                        }
                                      </div>
                                      <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-800 space-y-0.5 py-4 px-3">
                                        <div className="flex items-center justify-between space-x-2">
                                          <SelectAsset
                                            disabled={disabled}
                                            fixed={true}
                                            value={asset}
                                            chain={destination_chain}
                                            origin=""
                                            is_bridge={true}
                                            show_next_assets={true}
                                            show_native_assets={true}
                                            data={
                                              {
                                                ...destination_asset_data,
                                                ...destination_contract_data,
                                              }
                                            }
                                            className="flex items-center space-x-1.5 sm:space-x-2 sm:-ml-1"
                                          />
                                          {
                                            ![
                                              'string',
                                              'number',
                                            ].includes(typeof amount) ||
                                            [
                                              '',
                                            ].includes(amount) ||
                                            [
                                              'string',
                                              'number',
                                            ].includes(typeof estimatedValues?.amountReceived) ||
                                            estimateResponse ?
                                              <span className="text-lg font-semibold">
                                                {
                                                  [
                                                    'string',
                                                    'number',
                                                  ].includes(typeof amount) &&
                                                  [
                                                    'string',
                                                    'number',
                                                  ].includes(typeof estimated_received) &&
                                                  !estimateResponse ?
                                                    <DecimalsFormat
                                                      value={
                                                        Number(estimated_received) >= 1000 ?
                                                          number_format(
                                                            estimated_received,
                                                            '0,0.000000000000',
                                                            true,
                                                          ) :
                                                          estimated_received
                                                      }
                                                      className={
                                                        `w-36 sm:w-48 bg-transparent ${
                                                          [
                                                            '',
                                                            undefined,
                                                          ].includes(estimated_received) ?
                                                            'text-slate-500 dark:text-slate-500' :
                                                            ''
                                                        } text-lg font-semibold text-right py-1.5`
                                                      }
                                                    /> :
                                                    '-'
                                                }
                                              </span> :
                                              <Oval
                                                color={loader_color(theme)}
                                                width="20"
                                                height="20"
                                              />
                                          }
                                        </div>
                                        {
                                          false &&
                                          destination_chain_data &&
                                          asset &&
                                          (
                                            <div className="flex items-center justify-between space-x-2">
                                              <div className="flex items-center space-x-1">
                                                <div className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                                                  Balance:
                                                </div>
                                                <Balance
                                                  chainId={destination_chain_data.chain_id}
                                                  asset={asset}
                                                  contractAddress={destination_contract_data?.contract_address}
                                                  decimals={destination_decimals}
                                                  symbol={destination_symbol}
                                                  hideSymbol={true}
                                                  trigger={balanceTrigger}
                                                />
                                              </div>
                                            </div>
                                          )
                                        }
                                      </div>
                                    </div> :
                                    <div className="bg-slate-100 dark:bg-slate-900">
                                      {
                                        (
                                          true ||
                                          [
                                            'string',
                                            'number',
                                          ].includes(typeof estimated_received)
                                        ) &&
                                        (
                                          <button
                                            onClick={() => setCollapse(!collapse)}
                                            className="w-full grid grid-cols-5 sm:grid-cols-5 gap-6"
                                          >
                                            <div className="col-span-2 sm:col-span-2">
                                              <div className="flex items-center">
                                                <span className="whitespace-nowrap text-slate-600 dark:text-slate-200 text-sm font-medium">
                                                  You receive
                                                </span>
                                              </div>
                                            </div>
                                            <div className="col-span-3 sm:col-span-3">
                                              <div className="flex items-center justify-end sm:justify-end space-x-0.5 sm:space-x-1 -mr-0.5">
                                                {
                                                  ![
                                                    'string',
                                                    'number',
                                                  ].includes(typeof amount) ||
                                                  [
                                                    '',
                                                  ].includes(amount) ||
                                                  [
                                                    'string',
                                                    'number',
                                                  ].includes(typeof estimatedValues?.amountReceived) ||
                                                  estimateResponse ?
                                                    <div className="flex items-center space-x-2">
                                                      <span className="text-lg font-semibold">
                                                        {
                                                          [
                                                            'string',
                                                            'number',
                                                          ].includes(typeof amount) &&
                                                          [
                                                            'string',
                                                            'number',
                                                          ].includes(typeof estimated_received) &&
                                                          !estimateResponse ?
                                                            <DecimalsFormat
                                                              value={
                                                                Number(estimated_received) >= 1000 ?
                                                                  number_format(
                                                                    estimated_received,
                                                                    '0,0.000000000000',
                                                                    true,
                                                                  ) :
                                                                  estimated_received
                                                              }
                                                              className="text-lg"
                                                            /> :
                                                            '-'
                                                        }
                                                      </span>
                                                      <span className="font-semibold">
                                                        {destination_symbol}
                                                      </span>
                                                    </div> :
                                                    <Oval
                                                      color={loader_color(theme)}
                                                      width="16"
                                                      height="16"
                                                    />
                                                }
                                                {collapse ?
                                                  <BiChevronDown
                                                    size={18}
                                                    className="text-slate-600 dark:text-slate-200"
                                                  /> :
                                                  <BiChevronUp
                                                    size={18}
                                                    className="text-slate-600 dark:text-slate-200"
                                                  />
                                                }
                                              </div>
                                            </div>
                                          </button>
                                        )
                                      }
                                    </div>
                                }
                                {
                                  checkSupport() &&
                                  (
                                    true ||
                                    (
                                      web3_provider &&
                                      Number(amount) > 0
                                    )
                                  ) &&
                                  (
                                    <div
                                      className={
                                        `space-y-2.5 ${
                                          [
                                            'string',
                                            'number',
                                          ].includes(typeof estimated_received) ||
                                          !collapse > 0 ?
                                            'mt-2' :
                                            'mt-0'
                                        }`
                                      }
                                    >
                                      {
                                        (
                                          true ||
                                          feeEstimating ||
                                          fee
                                        ) &&
                                        (
                                          true ||
                                          !forceSlow
                                        ) &&
                                        !collapse &&
                                        (
                                          <div className="space-y-2.5">
                                            {
                                              'to' in options &&
                                              to &&
                                              (
                                                <div className="flex items-center justify-between space-x-1">
                                                  <Tooltip
                                                    placement="top"
                                                    content="The desitination address that you want to send asset to."
                                                    className="z-50 bg-dark text-white text-xs"
                                                  >
                                                    <div className="flex items-center">
                                                      <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm font-medium">
                                                        Recipient address
                                                      </div>
                                                      <BiInfoCircle
                                                        size={14}
                                                        className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                      />
                                                    </div>
                                                  </Tooltip>
                                                  <div className="flex flex-col sm:items-end space-y-1.5">
                                                    {recipientEditing ?
                                                      <>
                                                        <div className="flex items-center justify-end space-x-1.5">
                                                          <DebounceInput
                                                            debounceTimeout={750}
                                                            size="small"
                                                            type="text"
                                                            placeholder={address}
                                                            value={to}
                                                            onChange={e => {
                                                              let value = e.target.value

                                                              try {
                                                                value = 
                                                                  value
                                                                    .trim()
                                                                    .split(' ')
                                                                    .filter(s => s)
                                                                    .join('')

                                                                value =
                                                                  utils.getAddress(
                                                                    value
                                                                  )
                                                              } catch (error) {
                                                                value = address
                                                              }

                                                              const _data = {
                                                                ...options,
                                                                to: value,
                                                              }

                                                              setOptions(_data)
                                                            }}
                                                            className={`w-40 sm:w-56 bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700 rounded border-0 focus:ring-0 text-sm font-semibold text-right py-1.5 px-2`}
                                                          />
                                                          <button
                                                            onClick={() => setRecipientEditing(false)}
                                                            className="bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white"
                                                          >
                                                            <BiCheckCircle
                                                              size={16}
                                                            />
                                                          </button>
                                                        </div>
                                                      </> :
                                                      <div className="flex items-center space-x-1.5">
                                                        <Tooltip
                                                          placement="top"
                                                          content={to}
                                                          className="z-50 bg-dark text-white text-xs"
                                                        >
                                                          <span className="text-sm font-semibold">
                                                            {ellipse(
                                                              to,
                                                              8,
                                                            )}
                                                          </span>
                                                        </Tooltip>
                                                        <button
                                                          disabled={disabled}
                                                          onClick={() => {
                                                            if (!disabled) {
                                                              setRecipientEditing(true)
                                                            }
                                                          }}
                                                          className="rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white mt-0.5"
                                                        >
                                                          <BiEditAlt
                                                            size={16}
                                                          />
                                                        </button>
                                                      </div>
                                                    }
                                                  </div>
                                                </div>
                                              )
                                            }
                                            {
                                              (
                                                true ||
                                                !receiveLocal
                                              ) &&
                                              ![
                                                'pool',
                                              ].includes(source) &&
                                              (
                                                <div className="flex flex-col space-y-0.5">
                                                  <div className="flex items-start justify-between space-x-1">
                                                    <Tooltip
                                                      placement="top"
                                                      content="The maximum percentage you are willing to lose due to market changes."
                                                      className="z-50 bg-dark text-white text-xs"
                                                    >
                                                      <div className="flex items-center">
                                                        <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm font-medium">
                                                          Slippage tolerance
                                                        </div>
                                                        <BiInfoCircle
                                                          size={14}
                                                          className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                        />
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
                                                                    DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE :
                                                                    value

                                                                const _data = {
                                                                  ...options,
                                                                  slippage:
                                                                    value &&
                                                                    !isNaN(value) ?
                                                                      parseFloat(
                                                                        Number(value)
                                                                          .toFixed(2)
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
                                                                    const _data = {
                                                                      ...options,
                                                                      slippage: s,
                                                                    }

                                                                    setOptions(_data)
                                                                    setSlippageEditing(false)
                                                                  }}
                                                                  className={`${slippage === s ? 'bg-slate-200 dark:bg-slate-700 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 font-medium hover:font-semibold'} rounded cursor-pointer text-xs py-1 px-1.5`}
                                                                >
                                                                  {s} %
                                                                </div>
                                                              ))
                                                            }
                                                          </div>
                                                        </> :
                                                        <div className="flex items-center space-x-1.5">
                                                          <span className="text-sm font-semibold">
                                                            {number_format(
                                                              slippage,
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
                                                        </div>
                                                      }
                                                    </div>
                                                  </div>
                                                  {
                                                    typeof slippage === 'number' &&
                                                    (
                                                      estimated_slippage > slippage ||
                                                      slippage < 0.2 ||
                                                      slippage > 5.0
                                                    ) &&
                                                    (
                                                      <div className="flex items-start space-x-1">
                                                        <IoWarning
                                                          size={14}
                                                          className="min-w-max text-yellow-500 dark:text-yellow-400 mt-0.5"
                                                        />
                                                        <div className="text-yellow-500 dark:text-yellow-400 text-xs">
                                                          {
                                                            estimated_slippage > slippage ?
                                                              <>
                                                                Slippage tolerance is too low
                                                                <br />
                                                                (use a larger amount or set tolerance higher)
                                                              </> :
                                                              slippage < 0.2 ?
                                                                'Your transfer may not complete due to low slippage tolerance.' :
                                                                'Your transfer may be frontrun due to high slippage tolerance.'
                                                          }
                                                        </div>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )
                                            }
                                            {
                                              (
                                                true ||
                                                !forceSlow
                                              ) &&
                                              (
                                                <>
                                                  <div className="flex items-center justify-between space-x-1">
                                                    <Tooltip
                                                      placement="top"
                                                      content="This supports our router users providing fast liquidity."
                                                      className="z-50 bg-dark text-white text-xs"
                                                    >
                                                      <div className="flex items-center">
                                                        <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm font-medium">
                                                          Bridge fee
                                                        </div>
                                                        <BiInfoCircle
                                                          size={14}
                                                          className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                        />
                                                      </div>
                                                    </Tooltip>
                                                    {
                                                      ![
                                                        'string',
                                                        'number',
                                                      ].includes(typeof amount) ||
                                                      [
                                                        '',
                                                      ].includes(amount) ||
                                                      [
                                                        'string',
                                                        'number',
                                                      ].includes(typeof estimatedValues?.routerFee) ||
                                                      estimateResponse ?
                                                        <span className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm font-semibold space-x-1.5">
                                                          <DecimalsFormat
                                                            value={
                                                              Number(router_fee) >= 1000 ?
                                                                number_format(
                                                                  router_fee,
                                                                  '0,0.000000000000',
                                                                  true,
                                                                ) :
                                                                Number(router_fee) <= 0 ?
                                                                  '0' :
                                                                  router_fee
                                                            }
                                                            className="text-sm"
                                                          />
                                                          <span>
                                                            {source_symbol}
                                                          </span>
                                                        </span> :
                                                        <Oval
                                                          color={loader_color(theme)}
                                                          width="16"
                                                          height="16"
                                                        />
                                                    }
                                                  </div>
                                                  <div className="flex items-center justify-between space-x-1">
                                                    <Tooltip
                                                      placement="top"
                                                      content="This covers costs to execute your transfer on the destination chain."
                                                      className="z-50 bg-dark text-white text-xs"
                                                    >
                                                      <div className="flex items-center">
                                                        <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm font-medium">
                                                          Destination gas fee
                                                        </div>
                                                        <BiInfoCircle
                                                          size={14}
                                                          className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                        />
                                                      </div>
                                                    </Tooltip>
                                                    {
                                                      false &&
                                                      feeEstimating ?
                                                        <div className="flex items-center space-x-1.5">
                                                          <span className="text-slate-600 dark:text-slate-200 text-sm font-medium">
                                                            estimating
                                                          </span>
                                                          <Oval
                                                            color={loader_color(theme)}
                                                            width="20"
                                                            height="20"
                                                          />
                                                        </div> :
                                                        <span className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm font-semibold space-x-1.5">
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
                                                  {
                                                    typeof price_impact === 'number' &&
                                                    (
                                                      <div className="flex items-center justify-between space-x-1">
                                                        <Tooltip
                                                          placement="top"
                                                          content="Price impact"
                                                          className="z-50 bg-dark text-white text-xs"
                                                        >
                                                          <div className="flex items-center">
                                                            <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm font-medium">
                                                              Price impact
                                                            </div>
                                                            <BiInfoCircle
                                                              size={14}
                                                              className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                            />
                                                          </div>
                                                        </Tooltip>
                                                        <span className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm font-semibold space-x-1.5">
                                                          <span>
                                                            {number_format(
                                                              price_impact,
                                                              '0,0.000000',
                                                              true,
                                                            )}%
                                                          </span>
                                                        </span>
                                                      </div>
                                                    )
                                                  }
                                                </>
                                              )
                                            }
                                          </div>
                                        )
                                      }
                                      {
                                        Number(amount) > 0 &&
                                        [
                                          'string',
                                          'number',
                                        ].includes(typeof estimated_received) &&
                                        (
                                          Number(amount) < liquidity_amount ||
                                          asset_balances_data
                                        ) &&
                                        (
                                          <div className="flex items-center justify-between space-x-1">
                                            <div className="whitespace-nowrap text-slate-500 dark:text-slate-500 text-sm font-medium">
                                              Estimated time
                                            </div>
                                            <Tooltip
                                              placement="top"
                                              content={
                                                Number(amount) > liquidity_amount ||
                                                forceSlow ?
                                                  'Unable to leverage fast liquidity. Your transfer will still complete.' :
                                                  'Fast transfer enabled by Connext router network.'
                                              }
                                              className="z-50 bg-dark text-white text-xs"
                                            >
                                              <div className="flex items-center">
                                                <span className="whitespace-nowrap text-sm font-semibold space-x-1.5">
                                                  {
                                                    Number(amount) > liquidity_amount ||
                                                    forceSlow ?
                                                      <span className="text-yellow-500 dark:text-yellow-400">
                                                        90 minutes
                                                      </span> :
                                                      <span className="text-green-500 dark:text-green-500">
                                                        4 minutes
                                                      </span>
                                                  }
                                                </span>
                                                <BiInfoCircle
                                                  size={14}
                                                  className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                                />
                                              </div>
                                            </Tooltip>
                                          </div>
                                        )
                                      }
                                      {
                                        false &&
                                        Number(amount) > 0 &&
                                        (
                                          <>
                                            {
                                              asset_balances_data &&
                                              Number(amount) > liquidity_amount &&
                                              (
                                                <div className="flex items-center text-blue-600 dark:text-yellow-400 space-x-2">
                                                  <BiMessageEdit
                                                    size={20}
                                                  />
                                                  <span className="text-xs sm:text-sm">
                                                    Insufficient router liquidity. Funds must transfer through the bridge directly.
                                                  </span>
                                                </div>
                                              )
                                            }
                                            {
                                              Number(amount) < liquidity_amount &&
                                              (
                                                forceSlow ?
                                                  <div className="flex items-center text-blue-600 dark:text-yellow-400 space-x-2">
                                                    <BiMessageDetail
                                                      size={20}
                                                    />
                                                    <span className="text-xs sm:text-sm">
                                                      Use bridge only (wait 30-60 mins, no fees)
                                                    </span>
                                                  </div> :
                                                  <div className="flex items-center text-blue-500 dark:text-green-500 space-x-2">
                                                    <GiPartyPopper
                                                      size={20}
                                                    />
                                                    <span className="text-xs sm:text-sm">
                                                      Fast liquidity available!
                                                    </span>
                                                  </div>
                                              )
                                            }
                                          </>
                                        )
                                      }
                                    </div>
                                  )
                                }
                              </div>
                            )
                          }
                        </>
                    }
                    {
                      checkSupport() &&
                      (
                        xcall ||
                        source_balance
                      ) &&
                      web3_provider &&
                      (
                        (
                          [
                            'string',
                            'number',
                          ].includes(typeof amount) &&
                          ![
                            '',
                          ].includes(amount)
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
                                  alt=""
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
                          !xcall &&
                          !xcallResponse &&
                          !calling &&
                          [
                            'string',
                            'number',
                          ].includes(typeof amount) &&
                          ![
                            '',
                          ].includes(amount) &&
                          (
                            (
                              utils.parseUnits(
                                amount ||
                                '0',
                                source_decimals,
                              )
                              .gt(
                                utils.parseUnits(
                                  source_amount ||
                                  '0',
                                  source_decimals,
                                )
                              ) &&
                              [
                                'string',
                                'number',
                              ].includes(typeof source_amount)
                            ) ||
                            Number(amount) < min_amount ||
                            Number(amount) < 0 ||
                            (
                              typeof pool_amount === 'number' &&
                              Number(amount) > pool_amount
                            ) ||
                            (
                              fee &&
                              (
                                !relayer_fee ||
                                Number(relayer_fee) <= 0
                              ) &&
                              process.env.NEXT_PUBLIC_NETWORK !== 'testnet'
                            )
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
                                  utils.parseUnits(
                                    amount ||
                                    '0',
                                    source_decimals,
                                  )
                                  .gt(
                                    utils.parseUnits(
                                      source_amount ||
                                      '0',
                                      source_decimals,
                                    )
                                  ) &&
                                  [
                                    'string',
                                    'number',
                                  ].includes(typeof source_amount) ?
                                    'Insufficient Balance' :
                                    Number(amount) < min_amount ?
                                      'The amount cannot be less than the transfer fee.' :
                                      Number(amount) < 0 ?
                                        'The amount cannot be equal to or less than 0.' :
                                        typeof pool_amount === 'number' &&
                                        Number(amount) > pool_amount ?
                                          `Exceed Pool Balances: ${
                                            pool_amount >= 1000 ?
                                              number_format(
                                                pool_amount,
                                                '0,0.00',
                                              ) :
                                              pool_amount
                                          }` :
                                          fee &&
                                          (
                                            !relayer_fee ||
                                            Number(relayer_fee) <= 0
                                          ) ?
                                            'Cannot estimate the relayer fee at the moment. Please try again later.' :
                                            ''
                                }
                              </span>
                            </Alert> :
                            !xcall &&
                            !xcallResponse &&
                            !estimateResponse ?
                              <button
                                disabled={
                                  disabled ||
                                  [
                                    '',
                                    '0',
                                    '0.0',
                                  ].includes(amount)
                                }
                                onClick={() => {
                                  setRecipientEditing(false)
                                  setSlippageEditing(false)
                                  call()
                                }}
                                className={
                                  `w-full ${
                                    disabled ?
                                      'bg-blue-400 dark:bg-blue-500' :
                                      [
                                        '',
                                        '0',
                                        '0.0',
                                      ].includes(amount) ?
                                        'bg-slate-200 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' :
                                        'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                                  } rounded flex items-center ${
                                    calling &&
                                    !approving &&
                                    callProcessing ?
                                      'justify-center' :
                                      'justify-center'
                                  } text-white text-base py-3 sm:py-4 px-2 sm:px-3`
                                }
                              >
                                <span className={`flex items-center justify-center ${calling && !approving && callProcessing ? 'space-x-3 ml-1.5' : 'space-x-3'}`}>
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
                                          'Transfer in progress ...' :
                                          typeof approving === 'boolean' ?
                                            'Please Confirm' :
                                            'Checking Approval' :
                                      'Send'
                                    }
                                  </span>
                                </span>
                              </button> :
                              (
                                xcallResponse ||
                                (
                                  !xcall &&
                                  approveResponse
                                ) ||
                                estimateResponse
                              ) &&
                              (
                                [
                                  xcallResponse ||
                                  approveResponse ||
                                  estimateResponse,
                                ]
                                .map((r, i) => {
                                  const {
                                    status,
                                    message,
                                    code,
                                  } = { ...r }

                                  return (
                                    <Alert
                                      key={i}
                                      color={`${status === 'failed' ? 'bg-red-400 dark:bg-red-500' : status === 'success' ? xcallResponse ? 'bg-blue-500 dark:bg-blue-500' : 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                                      icon={
                                        status === 'failed' ?
                                          <BiMessageError
                                            className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                          /> :
                                          status === 'success' ?
                                            xcallResponse ?
                                              <div className="mr-3">
                                                <TailSpin
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
                                            status === 'failed' &&
                                            message &&
                                            (
                                              <Copy
                                                value={message}
                                                className="cursor-pointer text-slate-200 hover:text-white"
                                              />
                                            )
                                          }
                                          {status === 'failed' ?
                                            <button
                                              onClick={() => reset(code)}
                                              className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                                            >
                                              <MdClose
                                                size={14}
                                              />
                                            </button> :
                                            status === 'success' ?
                                              <button
                                                onClick={() => reset()}
                                                className={`${xcallResponse ? 'bg-blue-600 dark:bg-blue-400' : 'bg-green-500 dark:bg-green-400'} rounded-full flex items-center justify-center text-white p-1`}
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
                            Send
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
                </div>
            }
          </div>
          {
            !openTransferStatus &&
            (
              _source_contract_data?.mintable/* ||
              _source_contract_data?.wrapable ||
              _source_contract_data?.wrapped*/
            ) &&
            (
              <Faucet
                token_id={asset}
                contract_data={_source_contract_data}
              />
            )
          }
          {/*<PoweredBy />*/}
        </div>
      </div>
      <div className={`col-span-1 ${has_latest_transfers ? 'lg:col-span-3' : ''} xl:col-span-2`}>
        <LatestTransfers
          trigger={transfersTrigger}
          data={latestTransfers}
          onUpdateSize={size =>
            setLatestTransfersSize(size)
          }
        />
      </div>
    </div>
  )
}
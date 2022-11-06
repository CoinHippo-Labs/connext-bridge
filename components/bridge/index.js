 import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { XTransferStatus } from '@connext/nxtp-utils'
import { BigNumber, Contract, FixedNumber, constants, utils } from 'ethers'
import { TailSpin, Oval } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { Tooltip } from '@material-tailwind/react'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { HiSwitchHorizontal, HiOutlineDocumentSearch } from 'react-icons/hi'
import { BiMessageError, BiMessageCheck, BiMessageDetail, BiMessageEdit, BiEditAlt, BiCheckCircle, BiChevronDown, BiChevronUp, BiBook } from 'react-icons/bi'
import { GiPartyPopper } from 'react-icons/gi'

import Announcement from '../announcement'
import PoweredBy from '../powered-by'
import Options from './options'
import SelectChain from '../select/chain'
import SelectBridgeAsset from '../select/asset/bridge'
import GasPrice from '../gas-price'
import Balance from '../balance'
import LatestTransfers from '../latest-transfers'
import Faucet from '../faucet'
import Image from '../image'
import Wallet from '../wallet'
import Alert from '../alerts'
// import Popover from '../popover'
import Copy from '../copy'
import meta from '../../lib/meta'
import { params_to_obj, number_format, ellipse, equals_ignore_case, loader_color, sleep, error_patterns } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

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

  const wallet_chain_id = wallet_data?.chain_id

  const router = useRouter()
  const {
    asPath,
  } = { ...router }

  const [bridge, setBridge] = useState({})
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [buttonDirection, setButtonDirection] = useState(1)
  const [collapse, setCollapse] = useState(true)
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

  const [balanceTrigger, setBalanceTrigger] = useState(null)
  const [transfersTrigger, setTransfersTrigger] = useState(null)

  // get bridge from path
  useEffect(() => {
    let updated = false

    const params =
      params_to_obj(
        asPath?.indexOf('?') > -1 &&
        asPath.substring(
          asPath.indexOf('?') + 1,
        )
      )

    const {
      amount,
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
      const paths = path
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

      if (
        bridge.source_chain &&
        !isNaN(amount) &&
        Number(amount) > 0
      ) {
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
                  c?.chain_id === chains_data
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
                  c?.chain_id === chains_data
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
        params.asset &&
        amount
      ) {
        params.amount =
          number_format(
            Number(amount),
            '0.00000000',
            true,
          )
      }
    }

    if (Object.keys(params).length > 0) {
      const {
        source_chain,
        destination_chain,
        asset,
      } = { ...params }

      delete params.source_chain
      delete params.destination_chain
      delete params.asset

      router.push(
        `/${
          source_chain &&
          destination_chain ?
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
    } = { ...destination_contract_data }

    const liquidity_amount =
      _.sum(
        (asset_balances_data?.[chain_id] || [])
          .filter(a =>
            equals_ignore_case(
              a?.contract_address,
              contract_address,
            )
          )
          .map(a =>
            Number(
              utils.formatUnits(
                BigNumber.from(
                  a?.amount ||
                  '0'
                ),
                destination_decimals,
              )
            )
          )
      )

    setOptions(
      {
        ...DEFAULT_OPTIONS,
        forceSlow:
          destination_chain_data &&
          asset_balances_data ?
            amount > liquidity_amount :
            false,
      }
    )

    setEstimateTrigger(
      moment()
        .valueOf()
    )
    setApproveResponse(null)
    setXcall(null)
    setXcallResponse(null)
  }, [address, bridge])

  // update balances
  useEffect(() => {
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
  }, [asPath, chains_data])

  // update balances
  useEffect(() => {
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
  }, [wallet_chain_id, chains_data])

  // update balances
  useEffect(() => {
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

    const interval =
      setInterval(() =>
        getData(),
        10 * 1000,
      )

    return () => clearInterval(interval)
  }, [rpcs])

  // fee estimate cooldown
  useEffect(() => {
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
    } = {
      ...(
        (chains_data || [])
        .find(c =>
          c?.id === source_chain
        )
      ),
    }

    if (
      balances_data?.[chain_id] &&
      amount
    ) {
      setEstimateTrigger(
        moment()
          .valueOf()
      )
    }
  }, [balances_data])

  // estimate trigger
  useEffect(() => {
    if (
      estimateTrigger &&
      !(
        approving ||
        approveResponse ||
        calling ||
        xcallResponse
      )
    ) {
      estimate()
    }
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
            const response =
            await sdk.nxtpSdkUtils
              .getTransferByTransactionHash(
                transactionHash,
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

          if (address) {
            try {
              const response =
                await sdk.nxtpSdkUtils
                  .getTransfersByUser(
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
            ].includes(status)
          ) {
            setApproveResponse(null)
            setXcall(null)
            setXcallResponse(null)

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
              .getTransferById(
                transfer_id,
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
              ].includes(status)
            ) {
              setApproveResponse(null)
              setXcall(null)
              setXcallResponse(null)

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
        10 * 1000,
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
        address &&
        provider &&
        contract_address
      ) {
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
        dispatch(
          {
            type: BALANCES_DATA,
            value: {
              [`${chain_id}`]:
                [
                  {
                    ...contract_data,
                    amount:
                      balance &&
                      Number(
                        utils.formatUnits(
                          balance,
                          decimals ||
                          18,
                        )
                      ),
                  }
                ],
            },
          }
        )
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
          let {
            contract_address,
          } = {  ...a }

          contract_address = contract_address.toLowerCase()

          return {
            ...a,
            contract_address,
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
      !xcall
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
                    amount *
                    ROUTER_FEE_PERCENT /
                    100
                  )
                  .toFixed(12)
                )

            const params = {
              originDomain: source_chain_data?.domain_id,
              destinationDomain: destination_chain_data?.domain_id,
              isHighPriority: !forceSlow,
            }

            const response =
              forceSlow ?
                0 :
                await sdk.nxtpSdkBase
                  .estimateRelayerFee(
                    params,
                  )

            const gasFee =
              forceSlow ?
                0 :
                response &&
                Number(
                  utils.formatUnits(
                    response,
                    decimals ||
                    18,
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

            setFee(
              {
                router: routerFee,
                gas: gasFee,
              }
            )
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

      let {
        symbol,
      } = { ...source_contract_data }

      symbol =
        symbol ||
        source_asset_data?.symbol

      const destination_chain_data = (chains_data || [])
        .find(c =>
          c?.id === destination_chain
        )
      const destination_contract_data = (source_asset_data?.contracts || [])
        .find(c =>
          c?.chain_id === destination_chain_data?.chain_id
        )

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

      /*
      const minAmount =
        (amount || 0) *
        (
          100 -
          (
            !receiveLocal &&
            typeof slippage === 'number' ?
              slippage :
              DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE
          )
        ) /
        100
      */

      /*const xcallParams = {
        params: {
          to:
            to ||
            address,
          callData:
            callData ||
            '0x',
          originDomain: source_chain_data?.domain_id,
          destinationDomain: destination_chain_data?.domain_id,
          agent:
            to ||
            address,
          callback: constants.AddressZero,
          recovery: address,
          forceSlow:
            forceSlow ||
            false,
          receiveLocal:
            receiveLocal ||
            false,
          relayerFee:
            !forceSlow &&
            gas ?
              utils.parseUnits(
                gas
                  .toString(),
                'ether',
              )
              .toString() :
              '0',
          destinationMinOut:
            utils.parseUnits(
              minAmount
                .toString(),
              destination_contract_data?.decimals ||
              18,
            )
            .toString(),
        },
        transactingAsset: source_contract_data?.contract_address,
        transactingAmount:
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
        originMinOut:
          utils.parseUnits(
            minAmount
              .toString(),
            source_contract_data?.decimals ||
            18,
          )
          .toString(),
      }*/

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
            !receiveLocal &&
            (
              typeof slippage === 'number' ?
                slippage :
                DEFAULT_BRIDGE_SLIPPAGE_PERCENTAGE
            ) *
            100
          )
          .toString(),
        callData:
          callData ||
          '0x',
      }

      let failed = false

      try {
        /*const approve_request = await sdk.nxtpSdkBase.approveIfNeeded(
          xcallParams.params.originDomain,
          xcallParams.transactingAsset,
          xcallParams.transactingAmount,
          infiniteApprove,
        )*/
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
              message: `Wait for ${symbol} approval`,
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
          error?.data?.message ||
          error?.message

        const code =
          _.slice(
            (message || '')
              .toLowerCase()
              .split(' '),
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

      if (!failed) {
        try {
          console.log(
            '[xCall]',
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
              status,
            } = { ...xcall_receipt }

            failed = !status

            setXcallResponse(
              {
                status: failed ?
                  'failed' :
                  'success',
                message: failed ?
                  'Failed to send transaction' :
                  `Transferring ${symbol}. (it’s ok to close the browser)`,
                tx_hash: hash,
              }
            )

            success = true
          }
        } catch (error) {
          let message = 
            error?.data?.message ||
            error?.message

          const code =
            _.slice(
              (message || '')
                .toLowerCase()
                .split(' '),
              0,
              2,
            )
            .join('_')

          if (message?.includes('revert')) {
            message = 'More than pool balance'
          }

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
      await sleep(2 * 1000)

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

  const headMeta =
    meta(
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

  const {
    color,
  } = { ...source_asset_data }
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
  const source_amount =
    source_balance &&
    Number(source_balance.amount)
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
  const destination_amount =
    destination_balance &&
    Number(destination_balance.amount)
  const destination_decimals =
    destination_contract_data?.decimals ||
    18

  const {
    to,
    infiniteApprove,
    slippage,
    forceSlow,
    receiveLocal,
  } = { ...options }

  const gas_fee =
    fee &&
    (
      forceSlow ?
        0 :
        fee.gas ||
        0
    )
  const router_fee =
    fee &&
    (
      forceSlow ?
        0 :
        fee.router ||
        0
    )
  const price_impact = null

  const liquidity_amount =
    _.sum(
      (asset_balances_data?.[destination_chain_data?.chain_id] || [])
        .filter(a =>
          equals_ignore_case(
            a?.contract_address,
            destination_contract_data?.contract_address,
          )
        )
        .map(a =>
          Number(
            utils.formatUnits(
              BigNumber.from(
                a?.amount ||
                '0'
              ),
              destination_decimals,
            )
          )
        )
    )

  const min_amount = 0
  const max_amount = source_amount
  const estimate_received =
    amount > 0 &&
    typeof router_fee === 'number' ?
      amount - router_fee :
      null

  const wrong_chain =
    source_chain_data &&
    wallet_chain_id !== source_chain_data.chain_id &&
    !xcall

  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  const recipient_address =
    to ||
    address

  const disabled =
    calling ||
    approving

  const boxShadow = `${color}${theme === 'light' ? '99' : 'ff'} 0px 16px 128px 8px`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-8 items-start gap-4 my-4">
      <div className="hidden lg:block col-span-0 lg:col-span-2" />
      <div className="col-span-1 lg:col-span-4">
        <div className="mt-4 sm:mt-8">
          <Announcement />
        </div>
        <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 my-4 sm:my-6 mx-1 sm:mx-4">
          <div className="w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between space-x-2 pb-1">
              <div className="space-y-1 ml-1 sm:ml-2">
                <h1 className="tracking-wider text-base sm:text-xl font-semibold">
                  Bridge
                </h1>
                {
                  false &&
                  asPath?.includes('from-') &&
                  asPath.includes('to-') &&
                  title &&
                  (
                    <h2 className="tracking-wider text-slate-700 dark:text-slate-300 text-xs font-medium">
                      {
                        title
                          .replace(
                            ' with Connext',
                            '',
                          )
                      }
                    </h2>
                  )
                }
              </div>
              <Options
                disabled={disabled}
                applied={!_.isEqual(
                  Object.fromEntries(
                    Object.entries(options)
                      .filter(([k, v]) =>
                        ![
                          'slippage',
                        ].includes(k)
                      )
                  ),
                  Object.fromEntries(
                    Object.entries(DEFAULT_OPTIONS)
                      .filter(([k, v]) =>
                        ![
                          'slippage',
                        ].includes(k)
                      )
                  ),
                )}
                initialData={options}
                onChange={o => setOptions(o)}
              />
            </div>
            <div
              className="bg-white dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-50 rounded-3xl space-y-6 pt-8 sm:pt-10 pb-6 sm:pb-8 px-4 sm:px-6"
              style={
                checkSupport() ?
                  {
                    boxShadow,
                    WebkitBoxShadow: boxShadow,
                    MozBoxShadow: boxShadow,
                  } :
                  undefined
              }
            >
              <div className="space-y-2">
                <div className="grid grid-cols-5 sm:grid-cols-5 gap-3 sm:gap-6">
                  <div className="col-span-2 sm:col-span-2 flex flex-col items-center sm:items-start">
                    <div className="w-32 sm:w-48 flex flex-col sm:flex-row items-center justify-center space-x-1.5">
                      <span className="tracking-wider text-slate-600 dark:text-slate-200 text-lg font-medium text-center">
                        Origin
                      </span>
                      <GasPrice
                        chainId={source_chain_data?.chain_id}
                        dummy={true}
                        iconSize={18}
                        className="text-xs"
                      />
                    </div>
                    <SelectChain
                      disabled={disabled}
                      value={source_chain}
                      onSelect={c => {
                        const _source_chain = c
                        const _destination_chain = c === destination_chain ?
                          source_chain :
                          destination_chain

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
                      origin="origin"
                    />
                  </div>
                  <div className="flex items-center justify-center mt-10 sm:mt-6">
                    <button
                      disabled={disabled}
                      onClick={() => {
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
                      }}
                      className={/*`transform hover:-rotate-180 hover:animate-spin-one-time transition duration-300 ease-in-out */`bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 ${disabled ? 'cursor-not-allowed' : ''} rounded-full sm:border dark:border-slate-800 flex items-center justify-center p-1.5 sm:p-2.5`}
                    >
                      <HiSwitchHorizontal
                        size={24}
                        style={
                          buttonDirection < 0 ?
                            {
                              transform: 'scaleX(-1)',
                            } :
                            undefined
                        }
                      />
                      {/*<div className="flex sm:hidden">
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
                      </div>*/}
                    </button>
                  </div>
                  <div className="col-span-2 sm:col-span-2 flex flex-col items-center sm:items-end">
                    <div className="w-32 sm:w-48 flex flex-col sm:flex-row items-center justify-center space-x-1.5">
                      <span className="tracking-wider text-slate-600 dark:text-slate-200 text-lg font-medium text-center">
                        Destination
                      </span>
                      <GasPrice
                        chainId={destination_chain_data?.chain_id}
                        dummy={true}
                        iconSize={18}
                        className="text-xs"
                      />
                    </div>
                    <SelectChain
                      disabled={disabled}
                      value={destination_chain}
                      onSelect={c => {
                        const _source_chain = c === source_chain ?
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
                      origin="destination"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="tracking-wider text-slate-600 dark:text-slate-200 text-lg font-medium">
                    Asset
                  </div>
                  <SelectBridgeAsset
                    disabled={disabled}
                    value={asset}
                    onSelect={a => {
                      setBridge(
                        {
                          ...bridge,
                          asset: a,
                          amount:
                            a !== asset ?
                              null :
                              amount,
                        }
                      )

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
                  <div className="tracking-wider text-slate-400 dark:text-slate-200 text-lg text-center">
                    Route not supported
                  </div> :
                  <>
                    <div className="grid grid-cols-5 sm:grid-cols-5 gap-6">
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
                              <button
                                disabled={disabled}
                                onClick={() => {
                                  setBridge(
                                    {
                                      ...bridge,
                                      amount: max_amount,
                                    }
                                  )
                                }}
                                className="bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-blue-400 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white text-xs sm:text-sm font-semibold py-0.5 px-2 sm:px-2.5"
                              >
                                Max
                              </button>
                              /*<Popover
                                placement="bottom"
                                disabled={disabled}
                                onClick={() => {
                                  setBridge(
                                    {
                                      ...bridge,
                                      amount: max_amount,
                                    }
                                  )
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
                                            '0,0.00000000',
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
                                            '0,0.00000000',
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
                                            '0,0.00000000',
                                          true,
                                        ) :
                                        'n/a'
                                      }
                                    </span>
                                  </div>
                                </div>}
                                className="bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-blue-400 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white text-xs sm:text-sm font-semibold py-0.5 px-2 sm:px-2.5"
                                titleClassName="normal-case py-1.5"
                              >
                                Max
                              </Popover>*/
                            )
                          }
                        </div>
                        {
                          source_chain_data &&
                          asset &&
                          (
                            <div className="flex items-center space-x-1.5">
                              <div className="tracking-wider text-slate-400 dark:text-slate-600 text-xs">
                                Balance:
                              </div>
                              <button
                                disabled={disabled}
                                onClick={() => {
                                  if (max_amount > 0) {
                                    setBridge(
                                      {
                                        ...bridge,
                                        amount: max_amount,
                                      }
                                    )
                                  }
                                }}
                              >
                                <Balance
                                  chainId={source_chain_data.chain_id}
                                  asset={asset}
                                  contractAddress={source_contract_data?.contract_address}
                                  decimals={source_decimals}
                                  symbol={source_symbol}
                                  trigger={balanceTrigger}
                                />
                              </button>
                            </div>
                          )
                        }
                      </div>
                      <div className="col-span-3 sm:col-span-3 flex items-center justify-end sm:justify-end">
                        <DebounceInput
                          debounceTimeout={500}
                          size="small"
                          type="number"
                          placeholder="0.00"
                          disabled={
                            disabled ||
                            !asset
                          }
                          value={
                            typeof amount === 'number' &&
                            amount >= 0 ?
                              number_format(
                                amount,
                                '0.00000000',
                                true,
                              ) :
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

                            value =
                              value < 0 ?
                                0 :
                                value &&
                                !isNaN(value) ?
                                  parseFloat(
                                    Number(value)
                                      .toFixed(source_decimals)
                                  ) :
                                  value

                            setBridge(
                              {
                                ...bridge,
                                amount:
                                  typeof value === 'number' ?
                                    value :
                                    null,
                              }
                            )
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
                          className={`w-36 sm:w-48 bg-gray-200 focus:bg-gray-300 dark:bg-slate-800 dark:focus:bg-slate-700 ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl sm:text-lg font-semibold text-right py-1.5 sm:py-2 px-2 sm:px-3`}
                        />
                      </div>
                    </div>
                    {
                      (
                        typeof estimate_received === 'number' ||
                        (
                          checkSupport() &&
                          web3_provider &&
                          amount > 0
                        )
                      ) &&
                      (
                        <div className="space-y-2">
                          {
                            typeof estimate_received === 'number' &&
                            (
                              <div className="grid grid-cols-5 sm:grid-cols-5 gap-6">
                                <div className="col-span-2 sm:col-span-2 space-y-1">
                                  <button
                                    onClick={() => {
                                      if (!forceSlow) {
                                        setCollapse(!collapse)
                                      }
                                    }}
                                    className={`${forceSlow ? 'cursor-default' : 'cursor-pointer'} flex items-center justify-start sm:justify-start space-x-1 sm:space-x-2`}
                                  >
                                    <span className="tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-200 text-sm sm:text-base font-medium">
                                      Estimate Received
                                    </span>
                                    {
                                      !forceSlow &&
                                      (
                                        collapse ?
                                          <BiChevronDown
                                            size={20}
                                            className="text-slate-600 dark:text-slate-200"
                                          /> :
                                          <BiChevronUp
                                            size={20}
                                            className="text-slate-600 dark:text-slate-200"
                                          />
                                      )
                                    }
                                  </button>
                                </div>
                                <div className="col-span-3 sm:col-span-3 flex items-center justify-end sm:justify-end space-x-2">
                                  <span className="text-sm sm:text-base font-semibold">
                                    {
                                      number_format(
                                        estimate_received,
                                        '0,0.00000000',
                                        true,
                                      )
                                    }
                                  </span>
                                  <span className="text-sm sm:text-base font-medium">
                                    {destination_symbol}
                                  </span>
                                </div>
                              </div>
                            )
                          }
                          {
                            checkSupport() &&
                            web3_provider &&
                            amount > 0 &&
                            (
                              <div className="space-y-2.5">
                                {
                                  (
                                    feeEstimating ||
                                    fee
                                  ) &&
                                  !forceSlow &&
                                  !collapse &&
                                  (
                                    <div className="space-y-2">
                                      {/*<div className="flex items-center space-x-2">
                                        <span className="tracking-wider whitespace-nowrap text-slate-400 dark:text-slate-600 font-normal">
                                          Fees Breakdown
                                        </span>
                                      </div>
                                      <div className="w-full h-0.25 bg-slate-200 dark:bg-slate-700 sm:px-1" />*/}
                                      <div className="space-y-2.5">
                                        {
                                          !forceSlow &&
                                          (
                                            <>
                                              <div className="flex items-center justify-between space-x-1">
                                                <Tooltip
                                                  placement="top"
                                                  content="This supports our router users providing fast liquidity."
                                                  className="z-50 bg-black text-white text-xs"
                                                >
                                                  <div className="tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-200 font-medium">
                                                    Bridge Fee
                                                  </div>
                                                </Tooltip>
                                                <span className="whitespace-nowrap tracking-wider text-xs font-semibold space-x-1.5">
                                                  <span>
                                                    {number_format(
                                                      router_fee,
                                                      '0,0.00000000',
                                                      true,
                                                    )}
                                                  </span>
                                                  <span>
                                                    {source_symbol}
                                                  </span>
                                                </span>
                                              </div>
                                              <div className="flex items-center justify-between space-x-1">
                                                <Tooltip
                                                  placement="top"
                                                  content="This covers costs to execute your transfer on the destination chain."
                                                  className="z-50 bg-black text-white text-xs"
                                                >
                                                  <div className="tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-200 font-medium">
                                                    Destination Gas Fee
                                                  </div>
                                                </Tooltip>
                                                {
                                                  false &&
                                                  feeEstimating ?
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
                                                      <span>
                                                        {number_format(
                                                          gas_fee,
                                                          '0,0.00000000',
                                                          true,
                                                        )}
                                                      </span>
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
                                                      content="Price Impact"
                                                      className="z-50 bg-black text-white text-xs"
                                                    >
                                                      <div className="tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-200 font-medium">
                                                        Price Impact
                                                      </div>
                                                    </Tooltip>
                                                    <span className="whitespace-nowrap tracking-wider text-xs font-semibold space-x-1.5">
                                                      <span>
                                                        {number_format(
                                                          price_impact,
                                                          '0,0.00',
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
                                    </div>
                                  )
                                }
                                {
                                  amount > 0 &&
                                  (
                                    <>
                                      {
                                        !receiveLocal &&
                                        (
                                          <div className="flex items-start justify-between space-x-1">
                                            <Tooltip
                                              placement="top"
                                              content="Your transfer will not complete if the asset price changes by more than this percentage."
                                              className="z-50 bg-black text-white text-xs"
                                            >
                                              <div className="tracking-wider whitespace-nowrap text-slate-600 dark:text-slate-200 font-medium">
                                                Slippage Tolerance
                                              </div>
                                            </Tooltip>
                                            <div className="flex flex-col sm:items-end space-y-1.5">
                                              {slippageEditing ?
                                                <>
                                                  <div className="flex items-center justify-end space-x-1.5">
                                                    <DebounceInput
                                                      debounceTimeout={500}
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

                                                        console.log(
                                                          '[Options]',
                                                          _data,
                                                        )

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
                                                      className={`w-20 bg-slate-50 focus:bg-slate-100 dark:bg-slate-800 dark:focus:bg-slate-700 border-0 focus:ring-0 rounded-lg font-semibold text-right py-1 px-2`}
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

                                                            console.log(
                                                              '[Options]',
                                                              _data,
                                                            )

                                                            setOptions(_data)
                                                            setSlippageEditing(false)
                                                          }}
                                                          className={`${slippage === s ? 'bg-slate-100 dark:bg-slate-800 font-bold' : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 hover:font-semibold'} rounded cursor-pointer text-xs py-0.5 px-1.5`}
                                                        >
                                                          {s} %
                                                        </div>
                                                      ))
                                                    }
                                                  </div>
                                                </> :
                                                <div className="flex items-center space-x-1.5">
                                                  <span className="font-semibold">
                                                    {number_format(
                                                      slippage,
                                                      '0,0.00',
                                                    )}%
                                                  </span>
                                                  <button
                                                    onClick={() => setSlippageEditing(true)}
                                                    className="rounded-full flex items-center justify-center text-slate-400 hover:text-black dark:text-slate-200 dark:hover:text-white"
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
                                        asset_balances_data &&
                                        amount > liquidity_amount &&
                                        (
                                          <div className="flex items-center text-blue-600 dark:text-yellow-400 space-x-2">
                                            <BiMessageEdit
                                              size={20}
                                            />
                                            <span className="text-sm">
                                              Insufficient router liquidity. Funds must transfer through the bridge directly.
                                            </span>
                                          </div>
                                        )
                                      }
                                      {
                                        amount < liquidity_amount &&
                                        (
                                          forceSlow ?
                                            <div className="flex items-center text-blue-600 dark:text-yellow-400 space-x-2">
                                              <BiMessageDetail
                                                size={20}
                                              />
                                              <span className="text-sm sm:text-base">
                                                Use bridge only (wait 30-60 mins, no fees)
                                              </span>
                                            </div> :
                                            <div className="flex items-center text-blue-500 dark:text-green-500 space-x-2">
                                              <GiPartyPopper
                                                size={20}
                                              />
                                              <span className="text-sm sm:text-base">
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
                        icon={
                          <BiMessageError
                            className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                          />
                        }
                        closeDisabled={true}
                        rounded={true}
                        className="rounded-xl p-4.5"
                      >
                        <span>
                          {amount > source_amount ?
                            'Insufficient Balance' :
                            amount < min_amount ?
                              'The amount cannot be less than the transfer fee.' :
                              amount <= 0 ?
                                'The amount cannot be equal to or less than 0.' :
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
                          className={`w-full ${disabled ? 'bg-blue-400 dark:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'} rounded-xl flex items-center ${calling && !approving && callProcessing ? 'justify-center' : 'justify-center sm:text-lg'} text-white text-base py-3 sm:py-4 px-2 sm:px-3`}
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
                                    `Transferring ${source_symbol}. Please wait.` :
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
                              code,
                            } = { ...r }

                            return (
                              <Alert
                                key={i}
                                color={`${status === 'failed' ? 'bg-red-400 dark:bg-red-500' : status === 'success' ? xcallResponse ? 'bg-blue-500 dark:bg-blue-500' : 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                                icon={status === 'failed' ?
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
                                className="rounded-xl p-4.5"
                              >
                                <div className="flex items-center justify-between space-x-2">
                                  <span className="break-all">
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
                                        .trim(),
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
                                        onClick={() => reset(code)}
                                        className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                                      >
                                        <MdClose
                                          size={20}
                                        />
                                      </button> :
                                      status === 'success' ?
                                        <button
                                          onClick={() => reset()}
                                          className={`${xcallResponse ? 'bg-blue-600 dark:bg-blue-400' : 'bg-green-500 dark:bg-green-400'} rounded-full flex items-center justify-center text-white p-1`}
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
                      className="w-full bg-gray-200 dark:bg-slate-800 bg-opacity-75 cursor-not-allowed rounded-xl text-slate-400 dark:text-slate-500 text-base sm:text-lg text-center py-3 sm:py-4 px-2 sm:px-3"
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
            <div className="flex items-center justify-end space-x-4 mr-3">
              {
                process.env.NEXT_PUBLIC_DOCS_URL &&
                (
                  <a
                    href={process.env.NEXT_PUBLIC_DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-slate-700 dark:text-slate-300 space-x-1"
                  >
                    <BiBook
                      size={18}
                    />
                    <span className="text-sm font-medium">
                      Docs
                    </span>
                  </a>
                )
              }
              <a
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}${destination_chain_data?.id ? `/${destination_chain_data.id}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-slate-700 dark:text-slate-300 space-x-1"
              >
                <HiOutlineDocumentSearch
                  size={18}
                />
                <span className="text-sm font-medium">
                  Explorer
                </span>
              </a>
            </div>
          </div>
          {
            (
              source_contract_data?.mintable ||
              source_contract_data?.wrapable ||
              source_contract_data?.wrapped
            ) &&
            (
              <Faucet
                token_id={asset}
                contract_data={source_contract_data}
              />
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
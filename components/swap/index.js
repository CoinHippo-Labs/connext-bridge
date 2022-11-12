import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, Contract, FixedNumber, constants, utils } from 'ethers'
import { TailSpin, Watch, Oval } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { Tooltip } from '@material-tailwind/react'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { HiSwitchVertical } from 'react-icons/hi'
import { BiMessageError, BiMessageCheck, BiMessageDetail, BiEditAlt, BiCheckCircle } from 'react-icons/bi'

import Options from './options'
import GasPrice from '../gas-price'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import Balance from '../balance'
import Image from '../image'
import Wallet from '../wallet'
import Alert from '../alerts'
import Copy from '../copy'
import meta from '../../lib/meta'
import { params_to_obj, number_format, ellipse, equals_ignore_case, loader_color, sleep, error_patterns } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

const WRAPPED_PREFIX =
  process.env.NEXT_PUBLIC_WRAPPED_PREFIX ||
  'next'
const GAS_LIMIT_ADJUSTMENT =
  Number(
    process.env.NEXT_PUBLIC_GAS_LIMIT_ADJUSTMENT
  ) ||
  1
const DEFAULT_SWAP_SLIPPAGE_PERCENTAGE =
  Number(
    process.env.NEXT_PUBLIC_DEFAULT_SWAP_SLIPPAGE_PERCENTAGE
  ) ||
  3
const DEFAULT_OPTIONS = {
  infiniteApprove: true,
  slippage: DEFAULT_SWAP_SLIPPAGE_PERCENTAGE,
}

export default () => {
  const dispatch = useDispatch()
  const {
    preferences,
    chains,
    assets,
    pool_assets,
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
        pool_assets: state.pool_assets,
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
    pool_assets_data,
  } = { ...pool_assets }
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

  const [swap, setSwap] = useState({})
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [buttonDirection, setButtonDirection] = useState(1)
  const [slippageEditing, setSlippageEditing] = useState(false)

  const [swapAmount, setSwapAmount] = useState(null)
  const [calculateSwapResponse, setCalculateSwapResponse] = useState(null)

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
      from,
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

    if (path.includes('on-')) {
      const paths = path
        .replace(
          '/swap/',
          '',
        )
        .split('-')

      const chain = paths[paths.indexOf('on') + 1]
      const asset =
        _.head(paths) !== 'on' ?
          _.head(paths) :
          process.env.NEXT_PUBLIC_NETWORK === 'testnet' ?
            'eth' :
            'usdc'

      const chain_data = (chains_data || [])
        .filter(c => !c?.no_pool)
        .find(c =>
          c?.id === chain
        )
      const asset_data = (pool_assets_data || [])
        .find(a =>
          a?.id === asset ||
          equals_ignore_case(
            a?.symbol,
            asset,
          )
        )

      if (chain_data) {
        swap.chain = chain
        updated = true
      }

      if (asset_data) {
        swap.asset = asset
        updated = true
      }

      if (swap.chain) {
        if (
          !isNaN(amount) &&
          Number(amount)
        ) {
          swap.amount = Number(amount)
          updated = true
        }

        if (from) {
          swap.origin = 'y'
          updated = true
        }
      }
    }

    if (
      (
        !path.includes('on-') ||
        !swap.chain
      ) &&
      !path.includes('[swap]') &&
      (chains_data || [])
        .filter(c => !c?.no_pool)
        .length > 0
    ) {
      const _chain =
        _.head(
          chains_data
            .filter(c => !c?.no_pool)
            .map(c => c?.id)
        )

      router.push(
        `/swap/on-${_chain}${
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

    if (updated) {
      setSwap(swap)
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
        origin,
      } = { ...swap }

      if (
        (chains_data || [])
          .findIndex(c =>
            !c?.disabled &&
            c?.id === chain
          ) > -1
      ) {
        params.chain = chain

        if (
          asset &&
          (pool_assets_data || [])
            .findIndex(a =>
              a?.id === asset &&
              (a.contracts || [])
                .findIndex(c =>
                  c?.chain_id ===
                  chains_data
                    .find(_c =>
                      _c?.id === chain
                    )?.chain_id
                ) > -1
            ) > -1
        ) {
          params.asset = asset
        }
      }

      if (
        params.chain &&
        params.asset
      ) {
        if (
          !isNaN(amount) &&
          Number(amount)
        ) {
          params.amount =
            number_format(
              Number(amount),
              '0.00000000',
              true,
            )
        }

        if (
          origin === 'y' &&
          _.last(symbols)
        ) {
          params.from = _.last(symbols)
        }
      }
    }

    if (Object.keys(params).length > 0) {
      const {
        chain,
        asset,
      } = { ...params }

      delete params.chain
      delete params.asset

      router.push(
        `/swap/${
          chain ?
            `${asset ?
              `${asset.toUpperCase()}-` :
              ''
            }on-${chain}` :
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

    setApproveResponse(null)
    setCallResponse(null)
  }, [address, swap])

  // update balances
  useEffect(() => {
    let {
      chain,
    } = { ...swap }

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
      const params =
        params_to_obj(
          asPath.indexOf('?') > -1 &&
          asPath.substring(
            asPath.indexOf('?') + 1,
          )
        )

      if (
        !chain &&
        !params?.chain &&
        (chains_data || [])
          .findIndex(c =>
            !c?.disabled &&
            c?.id === id
          ) > -1
      ) {
        chain = id
      }

      getBalances(id)
    }

    if (Object.keys(swap).length > 0) {
      chain =
        chain ||
        _.head(
          (chains_data || [])
            .filter(c =>
              !c?.disabled &&
              (pool_assets_data || [])
                .findIndex(a =>
                  (a?.contracts || [])
                    .findIndex(_c =>
                      _c?.chain_id === c?.chain_id
                    ) > -1
                ) > -1
            )
        )?.id
    }

    setSwap(
      {
        ...swap,
        chain,
      }
    )
  }, [asPath, wallet_chain_id, chains_data])

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
      const {
        status,
      } = { ...approveResponse }

      if (
        address &&
        !calling &&
        ![
          'pending',
        ].includes(status)
      ) {
        const {
          chain,
        } = { ...swap }

        getBalances(chain)
      }
    }

    getData()

    const interval =
      setInterval(() =>
        getData(),
        0.25 * 60 * 1000,
      )

    return () => clearInterval(interval)
  }, [rpcs])

  // update balances
  useEffect(() => {
    if (pools_data) {
      const chains =
        _.uniq(
          pools_data
            .map(p => p?.chain_data?.id)
            .filter(c => c)
        )

      chains
        .forEach(c =>
          getBalances(c)
        )
    }
  }, [pools_data])

  // get pair
  useEffect(() => {
    const getData = async () => {
      const {
        chain,
        amount,
      } = { ...swap }

      let failed,
        _pair

      if (
        sdk &&
        chain
      ) {
        if (typeof amount === 'number') {
          setSwapAmount(true)
        }
        else if (typeof swapAmount === 'number') {
          setSwapAmount(null)
        }

        const chain_changed =
          !equals_ignore_case(
            chain,
            pair?.chain_data?.id,
          )

        if (
          chain_changed ||
          !pair?.updated_at ||
          moment()
            .diff(
              moment(pair.updated_at),
              'seconds',
            ) > 30
        ) {
          try {
            if (
              pair === undefined ||
              pair?.error ||
              chain_changed
            ) {
              setPair(null)
            }

            const {
              chain,
              asset,
              amount,
            } = { ...swap }

            const chain_data = chains_data
              .find(c =>
                c?.id === chain
              )

            const {
              chain_id,
              domain_id,
            } = { ...chain_data }

            const asset_data = pool_assets_data
              .find(a =>
                a?.id === asset
              )

            const {
              contracts,
            } = { ...asset_data }

            const contract_data = (contracts || [])
              .find(c =>
                c?.chain_id === chain_id
              )

            const {
              contract_address,
              is_pool,
            } = { ...contract_data }

            const pool =
              is_pool &&
              await sdk.nxtpSdkPool
                .getPool(
                  domain_id,
                  contract_address,
                )

            const rate =
              pool &&
              await sdk.nxtpSdkPool
                .getVirtualPrice(
                  domain_id,
                  contract_address,
                )

            _pair =
              (
                pool ?
                  [pool]
                    .map(p => {
                      const {
                        symbol,
                      } = { ...p }

                      const symbols =
                        (symbol || '')
                          .split('-')
                          .filter(s => s)

                      const asset_data = pool_assets_data
                        .find(a =>
                          symbols
                            .findIndex(s =>
                              equals_ignore_case(
                                s,
                                a?.symbol,
                              )
                            ) > -1 ||
                          (a?.contracts || [])
                            .findIndex(c =>
                              c?.chain_id === chain_id &&
                              symbols
                                .findIndex(s =>
                                  equals_ignore_case(
                                    s,
                                    c?.symbol,
                                  )
                                ) > -1
                            ) > -1
                        )

                      return {
                        ...p,
                        chain_data,
                        asset_data,
                        symbols,
                      }
                    }) :
                  [pair]
              )
              .find(p =>
                equals_ignore_case(
                  p?.domainId,
                  domain_id,
                ) &&
                equals_ignore_case(
                  p?.asset_data?.id,
                  asset,
                )
              )

            _pair =
              _pair &&
              {
                ..._pair,
                contract_data,
                rate:
                  Number(
                    utils.formatUnits(
                      BigNumber.from(
                        rate ||
                        '0'
                      ),
                      _.last(_pair.decimals) ||
                      18,
                    )
                  ),
                updated_at:
                  moment()
                    .valueOf(),
              }

            setPair(
              is_pool ?
                _pair :
                undefined
            )
          } catch (error) {
            setPair(
              {
                error,
              }
            )

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
  }, [sdk, swap, pairTrigger])

  const getBalances = chain => {
    const getBalance = async (
      chain_id,
      contract_data,
    ) => {
      const {
        next_asset,
      } = { ...contract_data }

      const provider = rpcs?.[chain_id]

      if (
        address &&
        provider
      ) {
        const contracts =
          _.concat(
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
                    Number(
                      utils.formatUnits(
                        balance,
                        decimals ||
                        18,
                      )
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
      domain_id,
    } = { 
      ...(
        (chains_data || [])
          .find(c =>
            c?.id === chain
          )
      ),
    }

    const contracts_data =
      _.uniqBy(
        _.concat(
          (pool_assets_data || [])
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
            }),
          (pools_data || [])
            .filter(p =>
              equals_ignore_case(
                p?.domainId,
                domain_id,
              )
            )
            .flatMap(p => {
              const {
                tokens,
                symbols,
                decimals,
              } = { ...p }

              return (tokens || [])
                .map((t, i) => {
                  return {
                    chain_id,
                    contract_address: t,
                    decimals: decimals?.[i],
                    symbol: symbols?.[i],
                  }
                })
            }),
        )
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
        }),
        'contract_address',
      )

    contracts_data
      .forEach(c =>
        getBalance(
          chain_id,
          c,
        )
      )
  }

  const reset = async origin => {
    const reset_swap =
      ![
        'address',
        'user_rejected',
      ].includes(origin)

    if (reset_swap) {
      setSwap(
        {
          ...swap,
          amount: null,
        }
      )
    }

    setOptions(DEFAULT_OPTIONS)

    setCalculateSwapResponse(null)

    setApproving(null)
    setApproveProcessing(null)
    setApproveResponse(null)

    setCalling(null)
    setCallProcessing(null)
    setCallResponse(null)

    setPairTrigger(
      moment()
        .valueOf()
    )
    setBalanceTrigger(
      moment()
        .valueOf()
    )

    const {
      chain,
    } = { ...swap }

    getBalances(chain)
  }

  const call = async () => {
    setCalculateSwapResponse(null)
    setApproving(null)
    setCalling(true)

    let success = false

    if (sdk) {
      let {
        amount,
        origin,
      } = { ...swap }

      origin =
        origin ||
        'x'

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
      const {
        contract_address,
      } = { ...contract_data }

      const x_asset_data =
        _.head(tokens) &&
        {
          ...Object.fromEntries(
            Object.entries({ ...asset_data }).
              filter(([k, v]) =>
                !['contracts'].includes(k)
              )
          ),
          ...(
            equals_ignore_case(
              _.head(tokens),
              contract_address
            ) ?
              contract_data :
              {
                chain_id,
                contract_address: _.head(tokens),
                decimals: _.head(decimals),
                symbol: _.head(symbols),
              }
          ),
        }

      const y_asset_data =
        _.last(tokens) &&
        {
          ...Object.fromEntries(
            Object.entries({ ...asset_data })
              .filter(([k, v]) =>
                !['contracts'].includes(k)
              )
          ),
          ...(
            equals_ignore_case(
              _.last(tokens),
              contract_address,
            ) ?
              contract_data :
              {
                chain_id,
                contract_address: _.last(tokens),
                decimals: _.last(decimals),
                symbol: _.last(symbols),
              }
          ),
        }

      const {
        infiniteApprove,
        slippage,
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

      let failed = false

      let minDy = 0

      if (!amount) {
        failed = true

        setApproving(false)
      }
      else {
        const decimals =
          (origin === 'x' ?
            x_asset_data :
            y_asset_data
          )?.decimals ||
          18

        minDy =
          parseFloat(
            (
              amount *
              (
                100 -
                (
                  typeof slippage === 'number' ?
                    slippage :
                    DEFAULT_SWAP_SLIPPAGE_PERCENTAGE
                )
              ) /
              100
            )
            .toFixed(decimals)
          )

        amount =
          utils.parseUnits(
            amount
              .toString(),
            decimals,
          )
          .toString()
      }

      minDy =
        utils.parseUnits(
          minDy
            .toString(),
          decimals,
        )
        .toString()

      if (!failed) {
        try {
          const approve_request =
            await sdk.nxtpSdkBase
              .approveIfNeeded(
                domainId,
                (origin === 'x' ?
                  x_asset_data :
                  y_asset_data
                )?.contract_address,
                amount,
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
                message:
                  `Wait for ${
                    (origin === 'x' ?
                      x_asset_data :
                      y_asset_data
                    )?.symbol
                  } approval`,
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
                  message:
                    `Failed to approve ${
                      (origin === 'x' ?
                        x_asset_data :
                        y_asset_data
                      )?.symbol
                    }`,
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
      }

      if (!failed) {
        try {
          console.log(
            '[Swap]',
            {
              domainId,
              contract_address,
              from:
                (origin === 'x' ?
                  x_asset_data :
                  y_asset_data
                )?.contract_address,
              to:
                (origin === 'x' ?
                  y_asset_data :
                  x_asset_data
                )?.contract_address,
              amount,
              minDy,
              deadline,
            },
          )

          const swap_request =
            await sdk.nxtpSdkPool
              .swap(
                domainId,
                contract_address,
                (origin === 'x' ?
                  x_asset_data :
                  y_asset_data
                )?.contract_address,
                (origin === 'x' ?
                  y_asset_data :
                  x_asset_data
                )?.contract_address,
                amount,
                minDy,
                deadline,
              )

          if (swap_request) {
            let gasLimit =
              await signer
                .estimateGas(
                  swap_request,
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

              swap_request.gasLimit = gasLimit
            }

            const swap_response =
              await signer
                .sendTransaction(
                  swap_request,
                )

            const {
              hash,
            } = { ...swap_response }

            setCallProcessing(true)

            const swap_receipt =
              await signer.provider
                .waitForTransaction(
                  hash,
                )

            const {
              status,
            } = { ...swap_receipt }

            failed = !status

            const _symbol =
              (
                origin === 'x' ?
                  symbols :
                  _.reverse(
                    _.cloneDeep(symbols)
                  )
              )
              .join('/')

            setCallResponse(
              {
                status: failed ?
                  'failed' :
                  'success',
                message: failed ?
                  `Failed to swap ${_symbol}` :
                  `Swap ${_symbol} successful`,
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
    }

    setCallProcessing(false)
    setCalling(false)

    if (
      sdk &&
      address &&
      success
    ) {
      await sleep(1 * 1000)

      setPairTrigger(
        moment()
          .valueOf()
      )
      setBalanceTrigger(
        moment()
          .valueOf()
      )
    }
  }

  const calculateSwap = async _pair => {
    const {
      amount,
    } = { ...swap }

    setCalculateSwapResponse(null)

    if (
      _pair &&
      typeof amount === 'number'
    ) {
      if (amount <= 0) {
        setSwapAmount(0)
      }
      else {
        let {
          amount,
          origin,
        } = { ...swap }

        origin =
          origin ||
          'x'

        const {
          asset_data,
          contract_data,
          domainId,
          lpTokenAddress,
          tokens,
          decimals,
          symbols,
        } = { ..._pair }
        const {
          contract_address,
        } = { ...contract_data }

        const x_asset_data =
          _.head(tokens) &&
          {
            ...Object.fromEntries(
              Object.entries({ ...asset_data })
                .filter(([k, v]) =>
                  !['contracts'].includes(k)
                )
            ),
            ...(
              equals_ignore_case(
                _.head(tokens),
                contract_address,
              ) ?
                contract_data :
                {
                  chain_id,
                  contract_address: _.head(tokens),
                  decimals: _.head(decimals),
                  symbol: _.head(symbols),
                }
            ),
          }

        const y_asset_data =
          _.last(tokens) &&
          {
            ...Object.fromEntries(
              Object.entries({ ...asset_data })
                .filter(([k, v]) =>
                  !['contracts'].includes(k)
                )
            ),
            ...(
              equals_ignore_case(
                _.last(tokens),
                contract_address,
              ) ?
                contract_data :
                {
                  chain_id,
                  contract_address: _.last(tokens),
                  decimals: _.last(decimals),
                  symbol: _.last(symbols),
                }
            ),
          }

        if (
          !(
            equals_ignore_case(
              domainId,
              pair?.domainId,
            ) &&
            equals_ignore_case(
              lpTokenAddress,
              pair?.lpTokenAddress,
            )
          )
        ) {
          setSwapAmount(true)
        }

        try {
          console.log(
            '[getPoolTokenIndex]',
            {
              domainId,
              contract_address,
              tokenAddress:
                (origin === 'x' ?
                  x_asset_data :
                  y_asset_data
                )?.contract_address,
            },
          )

          const tokenIndexFrom =
            await sdk.nxtpSdkPool
              .getPoolTokenIndex(
                domainId,
                contract_address,
                (origin === 'x' ?
                  x_asset_data :
                  y_asset_data
                )?.contract_address,
              )

          console.log(
            '[getPoolTokenIndex]',
            {
              domainId,
              contract_address,
              tokenAddress:
                (origin === 'x' ?
                  y_asset_data :
                  x_asset_data
                )?.contract_address,
            })

          const tokenIndexTo =
            await sdk.nxtpSdkPool
              .getPoolTokenIndex(
                domainId,
                contract_address,
                (origin === 'x' ?
                  y_asset_data :
                  x_asset_data
                )?.contract_address,
              )
 
          amount =
            utils.parseUnits(
              amount
                .toString(),
              (origin === 'x' ?
                x_asset_data :
                y_asset_data
              )?.decimals ||
              18,
            )
            .toString()
 
          console.log(
            '[calculateSwap]',
            {
              domainId,
              contract_address,
              tokenIndexFrom,
              tokenIndexTo,
              amount,
            },
          )
 
          const _amount =
            await sdk.nxtpSdkPool
              .calculateSwap(
                domainId,
                contract_address,
                tokenIndexFrom,
                tokenIndexTo,
                amount,
              )
 
          console.log(
            '[amountToReceive]',
            {
              domainId,
              contract_address,
              tokenIndexFrom,
              tokenIndexTo,
              amount: _amount,
            },
          )

          setSwapAmount(
            Number(
              utils.formatUnits(
                BigNumber.from(
                  _amount ||
                  '0'
                ),
                (origin === 'x' ?
                  y_asset_data :
                  x_asset_data
                )?.decimals ||
                18,
              )
            )
          )
        } catch (error) {
          const message =
            error?.data?.message ||
            error?.message

          setCalculateSwapResponse(
            {
              status: 'failed',
              message,
            }
          )

          console.log(
            '[calculateSwap]',
            {
              error: message,
            },
          )

          setSwapAmount(null)
        }
      }
    }
    else {
      setSwapAmount(null)
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
    chain,
    asset,
    amount,
  } = { ...swap }
  let {
    origin,
  } = { ...swap }

  origin =
    origin ||
    'x'

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
    transaction_path,
  } = { ...explorer }

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
    rate,
    price_impact,
  } = { ...pair }
  const {
    color,
  } = { ...asset_data }
  const {
    contract_address,
  } = { ...contract_data }

  const _image = contract_data?.image
  const image_paths =
    (_image || '')
      .split('/')
  const image_name = _.last(image_paths)

  const x_asset_data =
    _.head(tokens) &&
    {
      ...Object.fromEntries(
        Object.entries({ ...asset_data })
          .filter(([k, v]) =>
            !['contracts'].includes(k)
          )
      ),
      ...(
        equals_ignore_case(
          _.head(tokens),
          contract_address,
        ) ?
          contract_data :
          {
            chain_id,
            contract_address: _.head(tokens),
            decimals: _.head(decimals),
            symbol: _.head(symbols),
            image:
              _image ?
                !_.head(symbols) ?
                  _image :
                  _.head(symbols).startsWith(WRAPPED_PREFIX) ?
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

  const x_balance =
    x_asset_data &&
    (balances_data?.[chain_id] || [])
      .find(b =>
        equals_ignore_case(
          b?.contract_address,
          x_asset_data.contract_address,
        )
      )
  const x_balance_amount =
    x_balance &&
    Number(x_balance.amount)

  const y_asset_data =
    _.last(tokens) &&
    {
      ...Object.fromEntries(
        Object.entries({ ...asset_data })
          .filter(([k, v]) =>
            !['contracts'].includes(k)
          )
      ),
      ...(
        equals_ignore_case(
          _.last(tokens),
          contract_address,
        ) ?
          contract_data :
          {
            chain_id,
            contract_address: _.last(tokens),
            decimals: _.last(decimals),
            symbol: _.last(symbols),
            image:
              _image ?
                !_.head(symbols) ?
                  _image :
                  _.head(symbols).startsWith(WRAPPED_PREFIX) ?
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

  const y_balance =
    y_asset_data &&
    (balances_data?.[chain_id] || [])
      .find(b =>
        equals_ignore_case(
          b?.contract_address,
          y_asset_data.contract_address,
        )
      )
  const y_balance_amount =
    y_balance &&
    Number(y_balance.amount)

  const valid_amount =
    amount &&
    amount <= (
      origin === 'x' ?
        x_balance_amount :
        y_balance_amount
    )

  const wrong_chain =
    chain_data &&
    wallet_chain_id !== chain_id &&
    !callResponse

  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  const disabled =
    swapAmount === true ||
    calling ||
    approving

  const boxShadow = `${color}${theme === 'light' ? '99' : 'ff'} 0px 16px 128px 8px`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-8 items-start gap-4 my-4">
      <div className="hidden lg:block col-span-0 lg:col-span-2" />
      <div className="col-span-1 lg:col-span-4">
        <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 my-4 sm:my-6 mx-1 sm:mx-4">
          <div className="w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between space-x-2 pb-1">
              <div className="space-y-1 ml-1 sm:ml-2">
                <div className="flex items-center space-x-1.5">
                  <h1 className="text-lg font-semibold">
                    Swap on
                  </h1>
                  <SelectChain
                    value={
                      chain ||
                      _.head(
                        (chains_data || [])
                          .filter(c => !c?.no_pool)
                          .map(c => c?.id)
                      )
                    }
                    onSelect={c => {
                      setSwap(
                        {
                          ...swap,
                          chain: c,
                        }
                      )
                    }}
                    origin=""
                    is_pool={true}
                    className="w-fit flex items-center justify-center space-x-1.5 sm:space-x-2"
                  />
                  {/*
                    name &&
                    (
                      <div className="flex items-center space-x-1.5">
                        <span className="text-lg font-semibold">
                          on
                        </span>
                        {
                          image &&
                          (
                            <>
                              <div className="flex sm:hidden">
                                <Image
                                  src={image}
                                  alt=""
                                  width={18}
                                  height={18}
                                  className="rounded-full"
                                />
                              </div>
                              <div className="hidden sm:flex">
                                <Image
                                  src={image}
                                  alt=""
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              </div>
                            </>
                          )
                        }
                        <span className="tracking-normal whitespace-nowrap text-base sm:text-xl font-semibold">
                          {name}
                        </span>
                      </div>
                    )
                  */}
                </div>
                {
                  false &&
                  asPath?.includes('on-') &&
                  title &&
                  (
                    <h2 className="tracking-normal text-slate-700 dark:text-slate-300 text-xs font-medium">
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
                applied={
                  !_.isEqual(
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
                  )
                }
                initialData={options}
                onChange={o => setOptions(o)}
              />
            </div>
            <div
              className="bg-white dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-50 rounded-3xl space-y-6 pt-4 sm:pt-6 pb-6 sm:pb-8 px-4 sm:px-6"
              style={
                chain &&
                color ?
                  {
                    boxShadow,
                    WebkitBoxShadow: boxShadow,
                    MozBoxShadow: boxShadow,
                  } :
                  undefined
              }
            >
              <div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between space-x-2">
                    <span className="text-slate-600 dark:text-slate-200 text-sm font-medium">
                      Pay with
                    </span>
                    <GasPrice
                      chainId={chain_id}
                      iconSize={18}
                      className="text-xs pr-1"
                    />
                  </div>
                  <div className="bg-slate-100 dark:bg-gray-800 dark:bg-opacity-50 rounded-lg space-y-0.5 py-3.5 px-3">
                    <div className="flex items-center justify-between space-x-2">
                      <SelectAsset
                        disabled={disabled}
                        value={asset}
                        onSelect={(a, c) => {
                          setSwap(
                            {
                              ...swap,
                              asset: a,
                              amount: null,
                              origin:
                                [
                                  x_asset_data?.contract_address,
                                  y_asset_data?.contract_address,
                                ].findIndex(_c =>
                                  equals_ignore_case(
                                    _c,
                                    c,
                                  )
                                ) > -1 ?
                                  origin === 'x' ?
                                    equals_ignore_case(
                                      c,
                                      y_asset_data?.contract_address,
                                    ) ?
                                      'y' :
                                      origin :
                                    equals_ignore_case(
                                      c,
                                      x_asset_data?.contract_address,
                                    ) ?
                                      'x' :
                                      origin :
                                  origin,
                            }
                          )

                          getBalances(chain)
                        }}
                        chain={chain}
                        origin=""
                        is_pool={true}
                        data={
                          origin === 'x' ?
                            x_asset_data :
                            y_asset_data
                        }
                        className="flex items-center space-x-1.5 sm:space-x-2 sm:-ml-1"
                      />
                      <DebounceInput
                        debounceTimeout={500}
                        size="small"
                        type="number"
                        placeholder="0.00"
                        disabled={
                          disabled ||
                          !asset ||
                          !pair
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
                                    .toFixed(
                                      (origin === 'x' ?
                                        x_asset_data :
                                        y_asset_data
                                      )?.decimals
                                    )
                                ) :
                                value

                          setSwap(
                            {
                              ...swap,
                              amount:
                                typeof value === 'number' ?
                                  value :
                                  null,
                            }
                          )

                          setSwapAmount(true)
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
                        className={`w-36 sm:w-48 bg-transparent ${disabled ? 'cursor-not-allowed' : ''} border-0 focus:ring-0 rounded-xl sm:text-lg font-semibold text-right py-1.5`}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-1">
                        <div className="tracking-normal text-slate-400 dark:text-slate-500 text-sm font-medium">
                          Balance:
                        </div>
                        {
                          chain_data &&
                          asset &&
                          (origin === 'x' ?
                            x_asset_data :
                            y_asset_data
                          ) &&
                          (
                            <button
                              disabled={disabled}
                              onClick={() => {
                                const amount =
                                  origin === 'x' ?
                                    x_balance_amount :
                                    y_balance_amount

                                if (typeof amount === 'number') {
                                  setSwap(
                                    {
                                      ...swap,
                                      amount,
                                    }
                                  )

                                  setSwapAmount(true)
                                }
                              }}
                            >
                              <Balance
                                chainId={chain_id}
                                asset={asset}
                                contractAddress={
                                  (origin === 'x' ?
                                    x_asset_data :
                                    y_asset_data
                                  ).contract_address
                                }
                                decimals={
                                  (origin === 'x' ?
                                    x_asset_data :
                                    y_asset_data
                                  ).decimals
                                }
                                symbol={
                                  (origin === 'x' ?
                                    x_asset_data :
                                    y_asset_data
                                  ).symbol
                                }
                                hideSymbol={true}
                                trigger={balanceTrigger}
                              />
                            </button>
                          )
                        }
                      </div>
                      {
                        web3_provider &&
                        (
                          <button
                            disabled={disabled}
                            onClick={() => {
                              const amount =
                                origin === 'x' ?
                                  x_balance_amount :
                                  y_balance_amount

                              if (typeof amount === 'number') {
                                setSwap(
                                  {
                                    ...swap,
                                    amount,
                                  }
                                )

                                setSwapAmount(true)
                              }
                            }}
                            className={`${disabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400'} font-medium`}
                          >
                            Select Max
                          </button>
                        )
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center mt-0.5 sm:-mt-2 -mb-6 sm:-mb-12">
                  <button
                    disabled={
                      disabled ||
                      !pair
                    }
                    onClick={() => {
                      if (!disabled) {
                        setSwap(
                          {
                            ...swap,
                            origin:
                              origin === 'x' ?
                                'y' :
                                'x',
                            amount: null,
                          }
                        )

                        setSwapAmount(null)

                        setButtonDirection(
                          buttonDirection * -1
                        )

                        getBalances(chain)
                      }
                    }}
                    className={`bg-gray-200 hover:bg-gray-300 dark:bg-gray-900 dark:hover:bg-gray-800 ${disabled ? 'cursor-not-allowed' : ''} rounded-full sm:border dark:border-slate-800 flex items-center justify-center p-1.5 sm:p-4`}
                  >
                    <HiSwitchVertical
                      size={28}
                      style={
                        buttonDirection < 0 ?
                          {
                            transform: 'scaleX(-1)',
                          } :
                          undefined
                      }
                    />
                  </button>
                </div>
                <div className="space-y-2 -mt-0.5 sm:mt-1.5">
                  <span className="text-slate-600 dark:text-slate-200 text-sm font-medium">
                    Receive
                  </span>
                  <div className="bg-slate-100 dark:bg-gray-800 dark:bg-opacity-50 rounded-lg space-y-0.5 py-3.5 px-3">
                    <div className="flex items-center justify-between space-x-2">
                      <SelectAsset
                        disabled={disabled}
                        value={asset}
                        onSelect={(a, c) => {
                          setSwap(
                            {
                              ...swap,
                              asset: a,
                              amount: null,
                              origin:
                                [
                                  x_asset_data?.contract_address,
                                  y_asset_data?.contract_address,
                                ].findIndex(_c =>
                                  equals_ignore_case(
                                    _c,
                                    c,
                                  )
                                ) > -1 ?
                                  origin === 'x' ?
                                    equals_ignore_case(
                                      c,
                                      x_asset_data?.contract_address,
                                    ) ?
                                      'y' :
                                      origin :
                                    equals_ignore_case(
                                      c,
                                      y_asset_data?.contract_address,
                                    ) ?
                                      'x' :
                                      origin :
                                  origin,
                            }
                          )

                          getBalances(chain)
                        }}
                        chain={chain}
                        origin=""
                        is_pool={true}
                        data={
                          origin === 'x' ?
                            y_asset_data :
                            x_asset_data
                        }
                        className="flex items-center space-x-1.5 sm:space-x-2 sm:-ml-1"
                      />
                      {
                        swapAmount === true ?
                          <div className="w-36 sm:w-48 flex items-center justify-end py-1.5">
                            <div>
                              <Oval
                                color={loader_color(theme)}
                                width="20"
                                height="20"
                              />
                            </div>
                          </div> :
                          <DebounceInput
                            debounceTimeout={500}
                            size="small"
                            type="number"
                            placeholder="0.00"
                            disabled={
                              true ||
                              disabled ||
                              !asset ||
                              !pair
                            }
                            value={
                              typeof swapAmount === 'number' &&
                              swapAmount >= 0 ?
                                number_format(
                                  swapAmount,
                                  '0.00000000',
                                  true,
                                ) :
                                typeof amount === 'number' ?
                                  '0.00' :
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
                                      Number(
                                        origin === 'x' ?
                                          value / rate :
                                          value * rate
                                      )
                                      .toFixed(
                                        (origin === 'x' ?
                                          y_asset_data :
                                          x_asset_data
                                        )?.decimals
                                      )
                                    ) :
                                    value

                              setSwap(
                                {
                                  ...swap,
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
                            className={`w-36 sm:w-48 bg-transparent ${'cursor-default' || (disabled ? 'cursor-not-allowed' : '')} border-0 focus:ring-0 rounded-xl sm:text-lg font-semibold text-right py-1.5`}
                          />
                      }
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-1">
                        <div className="tracking-normal text-slate-400 dark:text-slate-500 text-sm font-medium">
                          Balance:
                        </div>
                        {
                          chain_data &&
                          asset &&
                          (origin === 'x' ?
                            y_asset_data :
                            x_asset_data
                          ) &&
                          (
                            <button
                              disabled={disabled}
                              onClick={() => {
                                const amount =
                                  origin === 'x' ?
                                    y_balance_amount :
                                    x_balance_amount

                                if (
                                  false &&
                                  amount > 0
                                ) {
                                  setSwap(
                                    {
                                      ...swap,
                                      amount:
                                        origin === 'x' ?
                                          amount / rate :
                                          amount * rate,
                                    }
                                  )
                                }
                              }}
                              className="cursor-default"
                            >
                              <Balance
                                chainId={chain_id}
                                asset={asset}
                                contractAddress={
                                  (origin === 'x' ?
                                    y_asset_data :
                                    x_asset_data
                                  ).contract_address
                                }
                                decimals={
                                  (origin === 'x' ?
                                    y_asset_data :
                                    x_asset_data
                                  ).decimals
                                }
                                symbol={
                                  (origin === 'x' ?
                                    y_asset_data :
                                    x_asset_data
                                  ).symbol
                                }
                                hideSymbol={true}
                                trigger={balanceTrigger}
                              />
                            </button>
                          )
                        }
                      </div>
                      {/*
                        web3_provider &&
                        (
                          <button
                            disabled={disabled}
                            onClick={() => {
                              const amount =
                                origin === 'x' ?
                                  y_balance_amount :
                                  x_balance_amount

                              if (amount > 0) {
                                setSwap(
                                  {
                                    ...swap,
                                    amount:
                                      origin === 'x' ?
                                        amount / rate :
                                        amount * rate,
                                  }
                                )
                              }
                            }}
                            className={`${disabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400'} text-sm font-medium`}
                          >
                            Select Max
                          </button>
                        )
                      */}
                    </div>
                  </div>
                </div>
              </div>
              {
                chain &&
                asset &&
                pair &&
                !pair.error &&
                amount > 0 &&
                (
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2.5 py-3.5 px-3">
                    <div className="flex items-center justify-between space-x-1">
                      <div className="tracking-normal whitespace-nowrap text-slate-400 dark:text-slate-500 font-medium">
                        Rate
                      </div>
                      <span className="tracking-normal whitespace-nowrap text-xs font-semibold space-x-1.5">
                        <span>
                          {number_format(
                            rate,
                            '0,0.000000',
                            true,
                          )}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start justify-between space-x-1">
                      <Tooltip
                        placement="top"
                        content="The maximum percentage you are willing to lose due to market changes."
                        className="z-50 bg-black text-white text-xs"
                      >
                        <div className="tracking-normal whitespace-nowrap text-slate-400 dark:text-slate-500 font-medium">
                          Slippage
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
                                      DEFAULT_SWAP_SLIPPAGE_PERCENTAGE :
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
                                    className={`${slippage === s ? 'bg-slate-200 dark:bg-slate-900 font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-900 hover:font-semibold'} rounded cursor-pointer text-xs py-1 px-1.5`}
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
                      typeof price_impact === 'number' &&
                      (
                        <div className="flex items-center justify-between space-x-1">
                          <div className="tracking-normal whitespace-nowrap text-slate-400 dark:text-slate-500 font-medium">
                            Price Impact
                          </div>
                          <span className="tracking-normal whitespace-nowrap text-xs font-semibold space-x-1.5">
                            <span>
                              {number_format(
                                price_impact,
                                '0,0.000000',
                                true,
                              )}
                              %
                            </span>
                          </span>
                        </div>
                      )
                    }
                  </div>
                )
              }
              {
                chain &&
                asset &&
                (origin === 'x' ?
                  x_balance :
                  y_balance
                ) &&
                web3_provider &&
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
                      connectChainId={chain_id}
                      className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl flex items-center justify-center text-white text-lg font-medium space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
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
                    !callResponse &&
                    (
                      amount > (
                        origin === 'x' ?
                          x_balance_amount :
                          y_balance_amount
                      ) ||
                      amount <= 0
                    ) ?
                      <Alert
                        color="bg-red-400 dark:bg-red-500 text-white text-sm font-medium"
                        icon={<BiMessageError
                          className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                        />}
                        closeDisabled={true}
                        rounded={true}
                        className="rounded-xl p-4.5"
                      >
                        <span>
                          {amount >
                            (
                              origin === 'x' ?
                                x_balance_amount :
                                y_balance_amount
                            ) ?
                            'Insufficient Balance' :
                            amount <= 0 ?
                              'The amount cannot be equal to or less than 0.' :
                              ''
                          }
                        </span>
                      </Alert> :
                      !(
                        callResponse ||
                        calculateSwapResponse
                      ) ?
                        <button
                          disabled={
                            disabled ||
                            !pair ||
                            !valid_amount
                          }
                          onClick={() => {
                            setSlippageEditing(false)
                            call()
                          }}
                          className={`w-full ${disabled || !pair || !valid_amount ? calling || approving ? 'bg-blue-400 dark:bg-blue-500 text-white' : 'bg-gray-200 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded-xl text-lg text-center py-3 sm:py-4 px-2 sm:px-3`}
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
                                    'Swapping' :
                                    typeof approving === 'boolean' ?
                                      'Please Confirm' :
                                      'Checking Approval' :
                                swapAmount === true ?
                                  'Calculating' :
                                  'Swap'
                              }
                            </span>
                          </span>
                        </button> :
                        (
                          callResponse ||
                          approveResponse ||
                          calculateSwapResponse
                        ) &&
                        (
                          [
                            callResponse ||
                            approveResponse ||
                            calculateSwapResponse,
                          ].map((r, i) => {
                            const {
                              status,
                              message,
                              code,
                              tx_hash,
                            } = { ...r }

                            return (
                              <Alert
                                key={i}
                                color={`${status === 'failed' ? 'bg-red-400 dark:bg-red-500' : status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white`}
                                icon={status === 'failed' ?
                                  <BiMessageError
                                    className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                  /> :
                                  status === 'success' ?
                                    <BiMessageCheck
                                      className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                    /> :
                                    status === 'pending' ?
                                      <div className="mr-3">
                                        <Watch
                                          color="white"
                                          width="20"
                                          height="20"
                                        />
                                      </div> :
                                      <BiMessageDetail
                                        className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3"
                                      />
                                }
                                closeDisabled={true}
                                rounded={true}
                                className="rounded-xl p-4.5"
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
                                        .trim(),
                                      128,
                                    )}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    {
                                      status === 'failed' &&
                                      message &&
                                      !calculateSwapResponse &&
                                      (
                                        <Copy
                                          size={20}
                                          value={message}
                                          className="cursor-pointer text-slate-200 hover:text-white"
                                        />
                                      )
                                    }
                                    {
                                      url &&
                                      tx_hash &&
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
                                          className="bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center text-white p-1"
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
                      onClick={() => call()}
                      className="w-full bg-gray-200 dark:bg-slate-800 bg-opacity-75 cursor-not-allowed rounded-xl text-slate-400 dark:text-slate-500 text-base sm:text-lg text-center py-3 sm:py-4 px-2 sm:px-3"
                    >
                      {
                        !asset ?
                          'Swap' :
                          pair === undefined ?
                            `Route doesn't exist` :
                            pair ?
                              pair.error ?
                                <div className="w-fit tracking-normal text-red-600 dark:text-red-400 text-sm mx-auto">
                                  {pair.error.message}
                                </div> :
                                'Enter amount' :
                              <div className="flex items-center justify-center space-x-2">
                                <div>
                                  <TailSpin
                                    color={loader_color(theme)}
                                    width="20"
                                    height="20"
                                  />
                                </div>
                                <span className="text-slate-400 dark:text-slate-500 text-lg">
                                  Fetching pair information ...
                                </span>
                              </div>
                      }
                    </button> :
                    <Wallet
                      connectChainId={chain_id}
                      buttonConnectTitle="Connect Wallet"
                      className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl text-white text-lg font-medium text-center sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
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
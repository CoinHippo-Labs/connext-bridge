import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, Contract, FixedNumber, constants, utils } from 'ethers'
import { TailSpin, Watch } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { TiArrowRight } from 'react-icons/ti'
import { MdClose } from 'react-icons/md'
import { HiSwitchHorizontal } from 'react-icons/hi'
import { BiMessageError, BiMessageCheck, BiMessageDetail, BiEditAlt, BiCheckCircle } from 'react-icons/bi'

import Info from './info'
import Options from './options'
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
  const [swapAmount, setSwapAmount] = useState(null)
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [buttonDirection, setButtonDirection] = useState(1)

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

    const params = params_to_obj(
      asPath?.indexOf('?') > -1 &&
      asPath.substring(
        asPath.indexOf('?') + 1,
      )
    )

    const {
      amount,
      from,
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
      path.includes('on-')
    ) {
      const paths = path
        .replace(
          '/swap/',
          '',
        )
        .split('-')

      const chain = paths[paths.indexOf('on') + 1]
      const asset = _.head(paths) !== 'on' ?
        _.head(paths) :
        process.env.NEXT_PUBLIC_NETWORK === 'testnet' ?
          'eth' :
          'usdc'

      const chain_data = chains_data?.find(c =>
        c?.id === chain
      )
      const asset_data = pool_assets_data?.find(a =>
        a?.id === asset ||
        equals_ignore_case(a?.symbol, asset)
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
        chains_data?.findIndex(c =>
          !c?.disabled &&
          c?.id === chain
        ) > -1
      ) {
        params.chain = chain

        if (
          asset &&
          pool_assets_data?.findIndex(a =>
            a?.id === asset &&
            a.contracts?.findIndex(c =>
              c?.chain_id === chains_data.find(_c =>
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

    /*if (
      !(
        params.chain ||
        params.asset
      ) &&
      pool_assets_data?.length > 0
    ) {
      const {
        id,
        contracts,
      } = { ..._.head(pool_assets_data) }

      params.chain =
        params.chain ||
        chains_data?.find(c =>
          c?.chain_id === _.head(contracts)?.chain_id
        )?.id

      params.asset =
        params.asset ||
        id
    }*/

    if (Object.keys(params).length > 0) {
      const {
        chain,
        asset,
      } = { ...params }

      delete params.chain
      delete params.asset

      router.push(
        `/swap/${chain ?
          `${asset ?
            `${asset.toUpperCase()}-` :
            ''
          }on-${chain}` :
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

    setApproveResponse(null)
    setCallResponse(null)
  }, [address, swap])

  // update balances
  useEffect(() => {
    let {
      chain,
    } = { ...swap }

    const {
      id,
    } = {
      ...chains_data?.find(c =>
        c?.chain_id === chain_id
      ),
    }

    if (
      asPath &&
      id &&
      !chain
    ) {
      const params = params_to_obj(
        asPath.indexOf('?') > -1 &&
        asPath.substring(
          asPath.indexOf('?') + 1,
        )
      )

      if (
        !params?.chain &&
        !asPath.includes('on-') &&
        chains_data?.findIndex(c =>
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
      } = { ...swap }

      if (
        sdk &&
        chain &&
        (
          !pair?.updated_at ||
          moment()
            .diff(
              moment(pair.updated_at),
              'seconds',
            ) > 30
        )
      ) {
        try {
          if (
            pair === undefined ||
            pair?.error
          ) {
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

          const chain_data = chains_data.find(c =>
            c?.id === chain
          )
          const {
            chain_id,
            domain_id,
          } = { ...chain_data }

          const asset_data = pool_assets_data.find(a =>
            a?.id === asset
          )
          const {
            contracts,
          } = { ...asset_data }

          const contract_data = contracts?.find(c =>
            c?.chain_id === chain_id
          )
          const {
            contract_address,
            is_pool,
          } = { ...contract_data }

          const pool =
            is_pool &&
            await sdk.nxtpSdkPool.getPool(
              domain_id,
              contract_address,
            )

          const rate =
            pool &&
            await sdk.nxtpSdkPool.getVirtualPrice(
              domain_id,
              contract_address,
            )

          let _pair =
            (
              pool ?
                [pool]
                  .map(p => {
                    const {
                      symbol,
                    } = { ...p }

                    const symbols = (symbol || '')
                      .split('-')
                      .filter(s => s)

                    const asset_data = pool_assets_data.find(a =>
                      symbols.findIndex(s =>
                        equals_ignore_case(s, a?.symbol)
                      ) > -1 ||
                      a?.contracts?.findIndex(c =>
                        c?.chain_id === chain_id &&
                        symbols.findIndex(s =>
                          equals_ignore_case(s, c?.symbol)
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
              equals_ignore_case(p?.domainId, domain_id) &&
              equals_ignore_case(p?.asset_data?.id, asset)
            )

          _pair =
            _pair &&
            {
              ..._pair,
              contract_data,
              rate: Number(
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

          calculateSwap(_pair)
        } catch (error) {
          setPair(
            {
              error,
            }
          )
          calculateSwap(null)
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

      if (
        balance ||
        !(
          balances_data?.[`${chain_id}`]?.findIndex(c =>
            equals_ignore_case(c?.contract_address, contract_address)
          ) > -1
        )
      ) {
        dispatch(
          {
            type: BALANCES_DATA,
            value: {
              [`${chain_id}`]: [{
                ...contract_data,
                amount: balance &&
                  Number(
                    utils.formatUnits(
                      balance,
                      decimals ||
                      18,
                    )
                  ),
              }],
            },
          }
        )
      }
    }

    const {
      chain_id,
      domain_id,
    } = { 
      ...chains_data?.find(c =>
        c?.id === chain
      ),
    }

    const contracts_data = _.uniqBy(
      _.concat(
        (pool_assets_data || [])
          .map(a => {
            const {
              contracts,
            } = { ...a }

            return {
              ...a,
              ...contracts?.find(c =>
                c?.chain_id === chain_id
              ),
            }
          }),
        (pools_data || [])
          .filter(p =>
            equals_ignore_case(p?.domainId, domain_id)
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
    const reset_swap = origin !== 'address'

    if (reset_swap) {
      setSwap(
        {
          ...swap,
          amount: null,
        }
      )
    }

    setOptions(DEFAULT_OPTIONS)

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
              filter(([k, v]) => !['contracts'].includes(k))
          ),
          ...(
            equals_ignore_case(_.head(tokens), contract_address) ?
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
              .filter(([k, v]) => !['contracts'].includes(k))
          ),
          ...(
            equals_ignore_case(_.last(tokens), contract_address) ?
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
      } = { ...options }
      let {
        deadline,
      } = { ...options }

      deadline =
        deadline &&
        moment()
          .add(deadline, 'minutes')
          .valueOf()

      let failed = false

      if (!amount) {
        failed = true

        setApproving(false)
      }
      else {
        amount = utils.parseUnits(
          amount.toString(),
          (origin === 'x' ?
            x_asset_data :
            y_asset_data
          )?.decimals ||
          18,
        )
        .toString()
      }

      const minDy = 0

      if (!failed) {
        try {
          const approve_request = await sdk.nxtpSdkBase.approveIfNeeded(
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

            const approve_response = await signer.sendTransaction(
              approve_request,
            )

            const {
              hash,
            } = { ...approve_response }

            setApproveResponse(
              {
                status: 'pending',
                message: `Wait for ${(origin === 'x' ?
                  x_asset_data :
                  y_asset_data
                )?.symbol} approval`,
                tx_hash: hash,
              }
            )

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
                  message: `Failed to approve ${(origin === 'x' ?
                    x_asset_data :
                    y_asset_data
                  )?.symbol}`,
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

          setApproveResponse(
            {
              status: 'failed',
              message:
                error?.data?.message ||
                error?.message,
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
              from: (origin === 'x' ?
                x_asset_data :
                y_asset_data
              )?.contract_address,
              to: (origin === 'x' ?
                y_asset_data :
                x_asset_data
              )?.contract_address,
              amount,
              minDy,
              deadline,
            },
          )

          const swap_request = await sdk.nxtpSdkPool.swap(
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
            let gasLimit = await signer.estimateGas(
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

            const swap_response = await signer.sendTransaction(
              swap_request,
            )

            const {
              hash,
            } = { ...swap_response }

            setCallProcessing(true)

            const swap_receipt = await signer.provider.waitForTransaction(
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
          setCallResponse(
            {
              status: 'failed',
              message:
                error?.data?.message ||
                error?.message,
            }
          )

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
                .filter(([k, v]) => !['contracts'].includes(k))
            ),
            ...(
              equals_ignore_case(_.head(tokens), contract_address) ?
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
                .filter(([k, v]) => !['contracts'].includes(k))
            ),
            ...(
              equals_ignore_case(_.last(tokens), contract_address) ?
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
          !(equals_ignore_case(domainId, pair?.domainId) &&
            equals_ignore_case(lpTokenAddress, pair?.lpTokenAddress))
        ) {
          setSwapAmount(true)
        }

        try {
          console.log(
            '[getPoolTokenIndex]',
            {
              domainId,
              contract_address,
              tokenAddress: (origin === 'x' ?
                x_asset_data :
                y_asset_data
              )?.contract_address,
            },
          )

          const tokenIndexFrom = await sdk.nxtpSdkPool.getPoolTokenIndex(
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
              tokenAddress: (origin === 'x' ?
                y_asset_data :
                x_asset_data
              )?.contract_address,
            })

          const tokenIndexTo = await sdk.nxtpSdkPool.getPoolTokenIndex(
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
 
          const _amount = await sdk.nxtpSdkPool.calculateSwap(
            domainId,
            contract_address,
            tokenIndexFrom,
            tokenIndexTo,
            amount,
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
  } = { ...pair }
  const {
    color,
  } = { ...asset_data }
  const {
    contract_address,
  } = { ...contract_data }

  const x_asset_data =
    _.head(tokens) &&
    {
      ...Object.fromEntries(
        Object.entries({ ...asset_data })
          .filter(([k, v]) => !['contracts'].includes(k))
      ),
      ...(
        equals_ignore_case(_.head(tokens), contract_address) ?
          contract_data :
          {
            chain_id,
            contract_address: _.head(tokens),
            decimals: _.head(decimals),
            symbol: _.head(symbols),
          }
      ),
    }

  const x_balance =
    x_asset_data &&
    balances_data?.[chain_id]?.find(b =>
      equals_ignore_case(b?.contract_address, x_asset_data.contract_address)
    )
  const x_balance_amount =
    x_balance &&
    Number(x_balance.amount)

  const y_asset_data =
    _.last(tokens) &&
    {
      ...Object.fromEntries(
        Object.entries({ ...asset_data })
          .filter(([k, v]) => !['contracts'].includes(k))
      ),
      ...(
        equals_ignore_case(_.last(tokens), contract_address) ?
          contract_data :
          {
            chain_id,
            contract_address: _.last(tokens),
            decimals: _.last(decimals),
            symbol: _.last(symbols),
          }
      ),
    }
  const y_balance =
    y_asset_data &&
    balances_data?.[chain_id]?.find(b =>
      equals_ignore_case(b?.contract_address, y_asset_data.contract_address)
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
                <h1 className="tracking-widest text-base sm:text-xl font-semibold">
                  Swap
                </h1>
                {
                  asPath?.includes('on-') &&
                  title &&
                  (
                    <h2 className="tracking-wider text-slate-700 dark:text-slate-300 text-xs font-medium">
                      {title.replace(
                        ' with Connext',
                        '',
                      )}
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
                        ].includes(k)
                      )
                  ),
                  Object.fromEntries(
                    Object.entries(DEFAULT_OPTIONS)
                      .filter(([k, v]) =>
                        ![
                        ].includes(k)
                      )
                  ),
                )}
                initialData={options}
                onChange={o => setOptions(o)}
              />
            </div>
            <div
              className="bg-white dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-50 rounded-3xl space-y-6 pt-4 sm:pt-6 pb-6 sm:pb-8 px-4 sm:px-6"
              style={amount > 0 ?
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
                  <div className="col-span-2 sm:col-span-2 flex items-center justify-start">
                    <span className="tracking-wider text-slate-600 dark:text-slate-200 text-lg font-medium ml-1 sm:ml-3">
                      Chain
                    </span>
                  </div>
                  <div className="col-span-3 sm:col-span-3 flex items-center justify-end">
                    <SelectChain
                      disabled={disabled}
                      value={chain}
                      onSelect={c => {
                        setSwap(
                          {
                            ...swap,
                            chain: c,
                            amount: null,
                          }
                        )

                        getBalances(c)
                      }}
                      origin=""
                    />
                  </div>
                </div>
                <div className="space-y-0">
                  <div className="tracking-wider text-slate-600 dark:text-slate-200 text-lg font-medium ml-1 sm:ml-3">
                    Asset
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-5 gap-3 sm:gap-6">
                    <div className="col-span-2 sm:col-span-2 flex flex-col items-center sm:items-start">
                      <SelectAsset
                        disabled={disabled}
                        value={asset}
                        onSelect={a => {
                          setSwap(
                            {
                              ...swap,
                              asset: a,
                              amount: null,
                            }
                          )

                          getBalances(chain)
                        }}
                        chain={chain}
                        origin=""
                        is_pool={true}
                        data={origin === 'x' ?
                          x_asset_data :
                          y_asset_data
                        }
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <button
                        disabled={
                          disabled ||
                          !pair
                        }
                        onClick={() => {
                          setSwap(
                            {
                              ...swap,
                              origin: origin === 'x' ?
                                'y' :
                                'x',
                              amount: null,
                            }
                          )

                          setButtonDirection(
                            buttonDirection * -1
                          )

                          getBalances(chain)
                        }}
                        className={/*`transform hover:-rotate-180 hover:animate-spin-one-time transition duration-300 ease-in-out */`bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 ${disabled ? 'cursor-not-allowed' : ''} rounded-full shadow dark:shadow-slate-700 flex items-center justify-center p-2.5`}
                      >
                        <HiSwitchHorizontal
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
                    <div className="col-span-2 sm:col-span-2 flex flex-col items-center sm:items-end">
                      <div className="w-32 sm:w-48 min-w-max h-10 sm:h-16 flex items-center justify-center">
                        <div className="w-32 sm:w-48 min-w-max bg-gray-100 dark:bg-slate-900 rounded-xl flex items-center justify-center space-x-1 sm:space-x-1.5 py-1.5 sm:py-2 px-2 sm:px-3">
                          {
                            (origin === 'x' ?
                              y_asset_data :
                              x_asset_data
                            )?.image && (
                              <>
                                <div className="flex sm:hidden">
                                  <Image
                                    src={(origin === 'x' ?
                                      y_asset_data :
                                      x_asset_data
                                    ).image}
                                    alt=""
                                    width={18}
                                    height={18}
                                    className="rounded-full"
                                  />
                                </div>
                                <div className="hidden sm:flex">
                                  <Image
                                    src={(origin === 'x' ?
                                      y_asset_data :
                                      x_asset_data
                                    ).image}
                                    alt=""
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                  />
                                </div>
                              </>
                            )
                          }
                          <span className="whitespace-nowrap text-sm sm:text-base font-semibold">
                            {
                              (origin === 'x' ?
                                y_asset_data :
                                x_asset_data
                              )?.symbol ||
                              (origin === 'x' ?
                                y_asset_data :
                                x_asset_data
                              )?.name ||
                              'To Token'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {
                chain &&
                asset &&
                (
                  pair === undefined ?
                    <div className="tracking-wider text-slate-400 dark:text-slate-200 text-lg text-center ml-1 sm:ml-3">
                      Route not supported
                    </div> :
                    pair ?
                      pair.error ?
                        <div className="w-fit tracking-wider text-red-600 dark:text-red-400 text-sm mx-auto">
                          {pair.error.message}
                        </div> :
                        <div className="grid grid-cols-5 sm:grid-cols-5 gap-6 ml-1 sm:ml-3">
                          <div className="col-span-2 sm:col-span-2 space-y-1">
                            <div className="flex items-center justify-start sm:justify-start space-x-1 sm:space-x-2.5">
                              <span className="tracking-wider text-slate-600 dark:text-slate-200 text-sm sm:text-base sm:font-medium">
                                Amount
                              </span>
                              {
                                address &&
                                (origin === 'x' ?
                                  x_balance :
                                  y_balance
                                ) &&
                                (
                                  <button
                                    disabled={disabled}
                                    onClick={() => {
                                      setSwap(
                                        {
                                          ...swap,
                                          amount: origin === 'x' ?
                                            x_balance_amount :
                                            y_balance_amount,
                                        }
                                      )
                                    }}
                                    className="bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-blue-400 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white text-xs sm:text-sm font-semibold py-0.5 px-2 sm:px-2.5"
                                  >
                                    Max
                                  </button>
                                )
                              }
                            </div>
                            {
                              chain_data &&
                              asset &&
                              (origin === 'x' ?
                                x_asset_data :
                                y_asset_data
                              ) &&
                              (
                                <div className="flex items-center space-x-1.5">
                                  <div className="tracking-wider text-slate-400 dark:text-slate-600 text-xs">
                                    Balance
                                  </div>
                                  <button
                                    disabled={disabled}
                                    onClick={() => {
                                      const amount = origin === 'x' ?
                                        x_balance_amount :
                                        y_balance_amount

                                      if (amount > 0) {
                                        setSwap(
                                          {
                                            ...swap,
                                            amount,
                                          }
                                        )
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
                                      trigger={balanceTrigger}
                                    />
                                  </button>
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

                                value = value < 0 ?
                                  0 :
                                  value

                                setSwap(
                                  {
                                    ...swap,
                                    amount:
                                      value &&
                                      !isNaN(value) ?
                                        Number(value) :
                                        value,
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
                        </div> :
                      <div className="flex items-center justify-center space-x-2">
                        <div>
                          <TailSpin
                            color={loader_color(theme)}
                            width="20"
                            height="20"
                          />
                        </div>
                        <span className="text-slate-400 dark:text-slate-200 text-lg">
                          Fetching pair information ...
                        </span>
                      </div>
                )
              }
              {
                chain &&
                asset &&
                pair &&
                !pair.error &&
                (
                  <Info
                    data={pair}
                    amount_received={swapAmount}
                    asset_data={
                      origin === 'x' ?
                        y_asset_data :
                        x_asset_data
                    }
                  />
                )
              }
              {
                chain &&
                asset &&
                (origin === 'x' ?
                  x_balance :
                  y_balance
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
                      connectChainId={chain_id}
                      className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl flex items-center justify-center text-white text-base sm:text-lg space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                    >
                      <span className="mr-1.5 sm:mr-2">
                        {is_walletconnect ?
                          'Reconnect' :
                          'Switch'
                        } to
                      </span>
                      {image && (
                        <Image
                          src={image}
                          alt=""
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      )}
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
                        color="bg-red-400 dark:bg-red-500 text-white text-base"
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
                              'The transfer amount cannot be equal or less than 0.' :
                              ''
                          }
                        </span>
                      </Alert> :
                      !callResponse ?
                        <button
                          disabled={
                            disabled ||
                            !pair ||
                            !valid_amount
                          }
                          onClick={() => call()}
                          className={`w-full ${disabled || !pair || !valid_amount ? calling || approving ? 'bg-blue-400 dark:bg-blue-500 text-white' : 'bg-gray-200 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-500' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer text-white'} rounded-xl text-base sm:text-lg text-center py-3 sm:py-4 px-2 sm:px-3`}
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
                                'Swap'
                              }
                            </span>
                          </span>
                        </button> :
                        (
                          callResponse ||
                          approveResponse
                        ) &&
                        (
                          [
                            callResponse ||
                            approveResponse,
                          ].map((r, i) => {
                            const {
                              status,
                              message,
                              tx_hash,
                            } = { ...r }

                            return (
                              <Alert
                                key={i}
                                color={`${status === 'failed' ? 'bg-red-400 dark:bg-red-500' : status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
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
                                  <span className="break-all">
                                    {ellipse(
                                      (message || '')
                                        .substring(
                                          0,
                                          status === 'failed' &&
                                          error_patterns.findIndex(c =>
                                            message?.indexOf(c) > -1
                                          ) > -1 ?
                                            message.indexOf(
                                              error_patterns.find(c =>
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
                        pair &&
                        !pair.error ?
                          'Enter Amount' :
                          'Swap'
                      }
                    </button> :
                    <Wallet
                      connectChainId={chain_id}
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
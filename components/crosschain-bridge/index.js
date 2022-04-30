import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { getDeployedTransactionManagerContract } from '@connext/nxtp-sdk'
import { getRandomBytes32, multicall, getHardcodedGasLimits } from '@connext/nxtp-utils'
import ERC20 from '@connext/nxtp-contracts/artifacts/contracts/interfaces/IERC20Minimal.sol/IERC20Minimal.json'
import contractDeployments from '@connext/nxtp-contracts/deployments.json'
import { dev, mainnet } from '@nomad-xyz/sdk'
import Web3 from 'web3'
import { constants, Contract, utils } from 'ethers'
import BigNumber from 'bignumber.js'
import { Img } from 'react-image'
import { TailSpin, Triangle } from 'react-loader-spinner'
import Switch from 'react-switch'
import Linkify from 'react-linkify'
import parse from 'html-react-parser'
import { MdSwapVerticalCircle, MdSwapHorizontalCircle, MdClose, MdLocalGasStation } from 'react-icons/md'
import { BsQuestionCircle } from 'react-icons/bs'
import { BiMessageError, BiMessageDots, BiMessageCheck, BiMessageDetail, BiChevronRight, BiChevronUp, BiInfinite, BiLock, BiArrowFromTop, BiUpArrowAlt, BiRefresh } from 'react-icons/bi'
import { FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa'
import { TiArrowRight, TiWarning } from 'react-icons/ti'
import { HiSpeakerphone } from 'react-icons/hi'

import Network from './network'
import Asset from './asset'
import AdvancedOptions from './advanced-options'
import TransactionState from './transaction-state'
import ActiveTransactions from './active-transactions'
import Faucets from './faucets'
import Wallet from '../wallet'
import Popover from '../popover'
import Alert from '../alerts'
import Notification from '../notifications'
import ModalConfirm from '../modals/modal-confirm'
import Copy from '../copy'

import { domains, getENS } from '../../lib/api/ens'
import { chainTitle } from '../../lib/object/chain'
import { getApproved, approve } from '../../lib/object/contract'
import { currency_symbol } from '../../lib/object/currency'
import { paramsToObject, numberFormat, ellipseAddress, sleep } from '../../lib/utils'
import meta from '../../lib/meta'

import { ENS_DATA, BALANCES_DATA, GAS_PRICES_DATA } from '../../reducers/types'

const expiry_hours = 72
const refresh_estimated_fees_seconds = 30
const bid_interval_seconds = 6
const approve_response_countdown_seconds = 10

const check_balances = !['testnet'].includes(process.env.NEXT_PUBLIC_NETWORK)
const min_amount = Math.pow(10, -6)

const protocols = [
  {
    id: 'connext',
    title: 'Connext',
    image: {
      light: '/logos/externals/connext/logo.png',
      dark: '/logos/externals/connext/logo_white.png',
    },
    estimated_time: '< 5 minutes',
  },
  {
    id: 'nomad',
    title: 'Nomad',
    image: {
      light: '/logos/externals/nomad/logo.png',
      dark: '/logos/externals/nomad/logo_white.png',
    },
    estimated_time: '35 - 60 minutes',
  },
]
const defaultInfiniteApproval = false
const defaultAdvancedOptions = {
  receiving_address: '',
  contract_address: '',
  call_data: '',
  preferred_router: '',
  initiator: '',
}

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function CrosschainBridge() {
  const dispatch = useDispatch()
  const { preferences, announcement, chains, assets, tokens, ens, chains_status, routers_status, routers_assets, wallet, sdk, rpcs, balances, gas_prices } = useSelector(state => ({ preferences: state.preferences, announcement: state.announcement, chains: state.chains, assets: state.assets, tokens: state.tokens, ens: state.ens, chains_status: state.chains_status, routers_status: state.routers_status, routers_assets: state.routers_assets, sdk: state.sdk, rpcs: state.rpcs, wallet: state.wallet, balances: state.balances, gas_prices: state.gas_prices }), shallowEqual)
  const { theme } = { ...preferences }
  const { announcement_data } = { ...announcement }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { tokens_data } = { ...tokens }
  const { ens_data } = { ...ens }
  const { chains_status_data } = { ...chains_status }
  const { routers_status_data } = { ...routers_status }
  const { routers_assets_data } = { ...routers_assets }
  const { sdk_data } = { ...sdk }
  const { rpcs_data } = { ...rpcs }
  const { wallet_data } = { ...wallet }
  const { provider, web3_provider, signer, chain_id, address } = { ...wallet_data }
  const { balances_data } = { ...balances }
  const { gas_prices_data } = { ...gas_prices }

  const router = useRouter()
  const { pathname, asPath } = { ...router }

  const [swapConfig, setSwapConfig] = useState({})
  const [bridgeProtocol, setBridgeProtocol] = useState(protocols[0]?.id)
  const [infiniteApproval, setInfiniteApproval] = useState(defaultInfiniteApproval)
  const [advancedOptions, setAdvancedOptions] = useState(defaultAdvancedOptions)

  const [controller, setController] = useState(null)
  const [estimateTrigger, setEstimateTrigger] = useState(null)
  const [fees, setFees] = useState(null)
  const [estimatingFees, setEstimatingFees] = useState(null)
  const [refreshEstimatedFeesSeconds, setRefreshEstimatedFeesSeconds] = useState(null)

  const [transactionId, setTransactionId] = useState(getRandomBytes32())
  const [estimatedAmount, setEstimatedAmount] = useState(null)
  const [estimatingAmount, setEstimatingAmount] = useState(null)
  const [estimatedAmountResponse, setEstimatedAmountResponse] = useState(null)
  const [bidIntervalSeconds, setBidIntervalSeconds] = useState(null)
  const [confirmFeesCollapsed, setConfirmFeesCollapsed] = useState(null)

  const [tokenApproved, setTokenApproved] = useState(null)
  const [tokenApproveResponse, setTokenApproveResponse] = useState(null)
  const [tokenApproveResponseCountDown, setTokenApproveResponseCountDown] = useState(null)

  const [startingSwap, setStartingSwap] = useState(null)
  const [swapData, setSwapData] = useState(null)
  const [swapResponse, setSwapResponse] = useState(null)

  const [activeTransactionOpen, setActiveTransactionOpen] = useState(null)
  const [activeTransactionTrigger, setActiveTransactionTrigger] = useState(null)

  // get query params
  useEffect(() => {
    let changed = false

    const query = paramsToObject(asPath?.indexOf('?') > -1 && asPath?.substring(asPath.indexOf('?') + 1))
    if (query && Object.keys(query).length > 0 && Object.keys(swapConfig).length < 1 && chains_data && assets_data) {
      if (query.sendingChainId && chains_data.findIndex(c => !c?.disabled && c.chain_id === Number(query.sendingChainId)) > -1) {
        swapConfig.fromChainId = Number(query.sendingChainId)

        if (query.sendingAssetId && assets_data.findIndex(a => a.contracts?.findIndex(c => c.chain_id === swapConfig.fromChainId && c.contract_address === query.sendingAssetId.toLowerCase()) > -1) > -1) {
          swapConfig.fromAssetId = assets_data.find(a => a.contracts?.findIndex(c => c.chain_id === swapConfig.fromChainId && c.contract_address === query.sendingAssetId.toLowerCase()) > -1).id
          swapConfig.toAssetId = swapConfig.fromAssetId
        }
      
        changed = true
      }
      if (query.receivingChainId && Number(query.receivingChainId) !== swapConfig.fromChainId && chains_data.findIndex(c => !c?.disabled && c.chain_id === Number(query.receivingChainId)) > -1) {
        swapConfig.toChainId = Number(query.receivingChainId)

        if (!swapConfig.fromAssetId && query.receivingAssetId && assets_data.findIndex(a => a.contracts?.findIndex(c => c.chain_id === swapConfig.toChainId && c.contract_address === query.receivingAssetId.toLowerCase()) > -1) > -1) {
          swapConfig.toAssetId = assets_data.find(a => a.contracts?.findIndex(c => c.chain_id === swapConfig.fromChainId && c.contract_address === query.receivingAssetId.toLowerCase()) > -1).id
          swapConfig.fromAssetId = swapConfig.toAssetId
        }
      
        changed = true
      }
      if (!isNaN(query.amount) && swapConfig.fromChainId && swapConfig.toChainId && swapConfig.fromAssetId && swapConfig.toAssetId) {
        swapConfig.amount = Number(query.amount)
        changed = true
      }
    }

    let path = !asPath ? '/' : asPath.toLowerCase()
    path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path
    if (path.includes('from-') && path.includes('to-')) {
      const paths = path.replace('/', '').split('-')
      const fromChainId = paths[paths.indexOf('from') + 1]
      const toChainId = paths[paths.indexOf('to') + 1]
      const fromChain = chains_data?.find(c => c.id === fromChainId)
      const toChain = chains_data?.find(c => c.id === toChainId)
      const assetId = paths[0] !== 'from' ? paths[0] : null
      const asset = assets_data?.find(a => a.id === assetId || a.symbol?.toLowerCase() === assetId)
      const fromContract = asset?.contracts?.find(c => c?.chain_id === fromChain?.chain_id)
      const toContract = asset?.contracts?.find(c => c?.chain_id === toChain?.chain_id)

      if (fromChain) {
        swapConfig.fromChainId = fromChain.chain_id
        changed = true
      }
      if (toChain) {
        swapConfig.toChainId = toChain.chain_id
        changed = true
      }
      if (asset) {
        swapConfig.fromAssetId = asset.id
        swapConfig.toAssetId = asset.id
        changed = true
      }
    }

    if (changed) {
      setSwapConfig(swapConfig)
    }
  }, [asPath, chains_data, assets_data])

  // wallet
  useEffect(() => {
    if (asPath && chain_id && (!swapConfig.fromChainId || !swapConfig.toChainId) && swapConfig.toChainId !== chain_id) {
      const query = paramsToObject(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      if (!query?.sendingChainId && !asPath?.includes('from-') && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === chain_id) > -1) {
        setSwapConfig({ ...swapConfig, fromChainId: chain_id })
      }
      getChainBalances(chain_id)
    }
  }, [asPath && chain_id, chains_data])

  useEffect(() => {
    dispatch({
      type: BALANCES_DATA,
      value: null,
    })

    if (address) {
      getDomains(address)
      if (swapConfig.fromChainId) {
        getChainBalances(swapConfig.fromChainId)
      }
      if (swapConfig.toChainId) {
        getChainBalances(swapConfig.toChainId)
      }
    }
    else {
      reset(true)
    }
  }, [address])

  useEffect(() => {
    const getData = () => {
      if (address && !startingSwap && !swapData && !['pending'].includes(tokenApproveResponse?.status)) {
        if (swapConfig.fromChainId) {
          getChainBalances(swapConfig.fromChainId)
        }
        if (swapConfig.toChainId) {
          getChainBalances(swapConfig.toChainId)
        }
      }
    }

    getData()

    const interval = setInterval(() => getData(), 0.25 * 60 * 1000)
    return () => clearInterval(interval)
  }, [rpcs_data])

  // gas prices
  useEffect(() => {
    const getData = () => {
      if (chains_data) {
        chains_data.filter(c => !c?.disabled).forEach(c => getChainGasPriceRPC(c.chain_id));
      }
    }

    getData()

    const interval = setInterval(() => getData(), 0.1 * 60 * 1000)
    return () => clearInterval(interval)
  }, [rpcs_data])

  // estimate
  useEffect(() => {
    let _controller

    if (estimateTrigger) {
      controller?.abort()
      _controller = new AbortController()
      setController(_controller)
      estimate(_controller)
    }

    return () => {
      _controller?.abort()
    }
  }, [estimateTrigger])

  // set query params
  useEffect(() => {
    if (swapConfig) {
      const _query = {}

      if (chains_data?.findIndex(c => !c?.disabled && c.chain_id === swapConfig.fromChainId) > -1) {
        _query.sendingChainId = swapConfig.fromChainId

        if (swapConfig.fromAssetId && assets_data?.findIndex(a => a.id === swapConfig.fromAssetId && a.contracts?.findIndex(c => c.chain_id === swapConfig.fromChainId) > -1) > -1) {
          _query.sendingAssetId = assets_data.find(a => a.id === swapConfig.fromAssetId && a.contracts?.findIndex(c => c.chain_id === swapConfig.fromChainId) > -1).contracts.find(c => c.chain_id === swapConfig.fromChainId).contract_address
        }
      }
      if (chains_data?.findIndex(c => !c?.disabled && c.chain_id === swapConfig.toChainId) > -1) {
        _query.receivingChainId = swapConfig.toChainId

        if (swapConfig.toAssetId && assets_data?.findIndex(a => a.id === swapConfig.toAssetId && a.contracts?.findIndex(c => c.chain_id === swapConfig.toChainId) > -1) > -1) {
          _query.receivingAssetId = assets_data.find(a => a.id === swapConfig.toAssetId && a.contracts?.findIndex(c => c.chain_id === swapConfig.toChainId) > -1).contracts.find(c => c.chain_id === swapConfig.toChainId).contract_address
        }
      }
      if (_query.sendingChainId && _query.sendingAssetId && swapConfig.amount) {
        _query.amount = swapConfig.amount
      }

      if (Object.keys(_query).length > 0) {
        const fromChain = chains_data?.find(c => c?.chain_id === swapConfig.fromChainId)
        const toChain = chains_data?.find(c => c?.chain_id === swapConfig.toChainId)
        const fromAsset = assets_data?.find(a => a?.id === swapConfig.fromAssetId)
        const toAsset = assets_data?.find(a => a?.id === swapConfig.toAssetId)

        if (fromChain && toChain) {
          delete _query.sendingChainId
          delete _query.receivingChainId

          if (fromAsset || toAsset) {
            delete _query.sendingAssetId
            delete _query.receivingAssetId
          }
        }

        router.push(`/${fromChain && toChain ? `${fromAsset || toAsset ? `${(fromAsset || toAsset).symbol}-` : ''}from-${fromChain.id}-to-${toChain.id}` : ''}${Object.keys(_query).length > 0 ? `?${new URLSearchParams(_query).toString()}` : ''}`, undefined, { shallow: true })
      }
    }

    setEstimateTrigger(moment().valueOf())
  }, [address, swapConfig, advancedOptions])

  useEffect(() => {
    if (balances_data?.[swapConfig?.fromChainId] && swapConfig.amount && !estimatedAmount) {
      setEstimateTrigger(moment().valueOf())
    }
  }, [balances_data])

  // fees
  useEffect(() => {
    if (typeof refreshEstimatedFeesSeconds === 'number') {
      if (refreshEstimatedFeesSeconds === 0) {
        if (typeof swapConfig.amount !== 'number') {
          setEstimateTrigger(moment().valueOf())
        }
      }
      else {
        const interval = setInterval(() => {
          if (refreshEstimatedFeesSeconds - 1 > -1) {
            setRefreshEstimatedFeesSeconds(refreshEstimatedFeesSeconds - 1)
          }
        }, 1000)
        return () => clearInterval(interval)
      }
    }
  }, [refreshEstimatedFeesSeconds])

  useEffect(() => {
    if (typeof estimatingFees === 'boolean' && !estimatingFees) {
      setRefreshEstimatedFeesSeconds(refresh_estimated_fees_seconds)
    }
  }, [estimatingFees])

  // bid
  useEffect(() => {
    if (typeof bidIntervalSeconds === 'number') {
      if (bidIntervalSeconds === -1) {
        setBidIntervalSeconds(bid_interval_seconds)
      }
      else {
        const interval = setInterval(() => {
          if (bidIntervalSeconds - 1 > -2) {
            setBidIntervalSeconds(bidIntervalSeconds - 1)
          }
        }, 1000)
        return () => clearInterval(interval)
      }
    }
  }, [bidIntervalSeconds])

  // approve
  useEffect(async () => {
    setTokenApproveResponse(null)
    const approved = await isTokenApproved()
    setTokenApproved(approved)
  }, [chain_id, address, swapConfig])

  useEffect(() => {
    if (tokenApproved === true || (tokenApproved && tokenApproved?.toNumber() >= constants.MaxUint256)) {
      setInfiniteApproval(true)
    }
  }, [tokenApproved])

  useEffect(() => {
    if (typeof tokenApproveResponseCountDown === 'number') {
      if (tokenApproveResponseCountDown === 0) {
        setTokenApproveResponse(null)
      }
      else {
        const interval = setInterval(() => {
          if (tokenApproveResponseCountDown - 1 > -1) {
            setTokenApproveResponseCountDown(tokenApproveResponseCountDown - 1)
          }
        }, 1000)
        return () => clearInterval(interval)
      }
    }
  }, [tokenApproveResponseCountDown])

  useEffect(() => {
    if (['success'].includes(tokenApproveResponse?.status)) {
      if (!tokenApproveResponseCountDown) {
        setTokenApproveResponseCountDown(approve_response_countdown_seconds)
      }
    }
  }, [tokenApproveResponse])

  const reset = async (is_from_address, is_from_switch_protocol) => {
    const isReset = !is_from_address || (address && swapData?.prepareResponse?.from?.toLowerCase() !== address.toLowerCase())

    if (isReset) {
      setSwapConfig({ ...swapConfig, amount: null })
      if (!is_from_switch_protocol) {
        setBridgeProtocol(protocols[0]?.id)
      }
    }
    setAdvancedOptions(defaultAdvancedOptions)

    setEstimateTrigger(null)
    setFees(null)
    setEstimatingFees(null)
    setRefreshEstimatedFeesSeconds(null)

    setTransactionId(getRandomBytes32())
    setEstimatedAmount(null)
    setEstimatingAmount(null)
    setEstimatedAmountResponse(null)
    setBidIntervalSeconds(null)
    setConfirmFeesCollapsed(null)

    setTokenApproved(null)
    setTokenApproveResponse(null)
    setTokenApproveResponseCountDown(null)

    setStartingSwap(null)
    if (isReset) {
      setSwapData(null)
    }
    setSwapResponse(null)

    setActiveTransactionOpen(null)
    setActiveTransactionTrigger(false)

    if (swapConfig?.fromChainId) {
      getChainBalances(swapConfig.fromChainId)
    }
    if (swapConfig?.toChainId) {
      getChainBalances(swapConfig.toChainId)
    }

    const approved = await isTokenApproved()
    setTokenApproved(approved)
  }

  const getDomains = async evmAddresses => {
    evmAddresses = (Array.isArray(evmAddresses) ? evmAddresses : [evmAddresses]).filter(a => a)

    if (evmAddresses.length > 0) {
      let ensData
      const addressChunk = _.chunk(evmAddresses, 25)

      for (let i = 0; i < addressChunk.length; i++) {
        const domainsResponse = await domains({ where: `{ resolvedAddress_in: [${addressChunk[i].map(id => `"${id?.toLowerCase()}"`).join(',')}] }` })
        ensData = _.concat(ensData || [], domainsResponse?.data || [])
      }

      if (ensData?.length > 0) {
        const ensResponses = {}
        for (let i = 0; i < evmAddresses.length; i++) {
          const evmAddress = evmAddresses[i]?.toLowerCase()
          const resolvedAddresses = ensData.filter(d => d?.resolvedAddress?.id?.toLowerCase() === evmAddress)
          if (resolvedAddresses.length > 1) {
            ensResponses[evmAddress] = await getENS(evmAddress)
          }
          else if (resolvedAddresses.length < 1) {
            ensData.push({ resolvedAddress: { id: evmAddress } })
          }
        }

        dispatch({
          type: ENS_DATA,
          value: Object.fromEntries(ensData.filter(d => !ensResponses?.[d?.resolvedAddress?.id?.toLowerCase()]?.reverseRecord || d?.name === ensResponses?.[d?.resolvedAddress?.id?.toLowerCase()].reverseRecord).map(d => [d?.resolvedAddress?.id?.toLowerCase(), { ...d }])),
        })
      }
    }
  }

  const getDeployedMulticallContract = chain_id => {
    const record = contractDeployments?.[chain_id?.toString()] || {}
    const name = Object.keys(record)[0]
    if (!name) {
      return undefined
    }
    const contract = record[name]?.contracts?.Multicall
    return contract
  }

  const getChainBalancesMulticall = async (chain_id, contract_addresses) => {
    const calls = contract_addresses.map(contract_address => {
      return {
        address: contract_address,
        name: 'balanceOf',
        params: [address],
      }
    })
    const multicallAddress = getDeployedMulticallContract(chain_id)?.address
    const rpcUrls = chains_data?.filter(c => c?.chain_id === chain_id).flatMap(c => c?.provider_params?.flatMap(p => p?.rpcUrls || [])) || []
    const rpcUrl = rpcUrls[Math.floor(Math.random() * (rpcUrls.length - 1))]
    return await multicall(ERC20.abi, calls, multicallAddress, rpcUrl)
  }

  const getChainTokenMulticall = async (chain_id, contracts) => {
    if (chain_id && contracts) {
      const balances = await getChainBalancesMulticall(chain_id, contracts?.map(c => c?.contract_address))

      if (balances) {
        const assets = []

        for (let i = 0; i < balances.length; i ++) {
          const balance = balances[i]?.toString()
          const contract = contracts[i]
          if (balance && contract) {
            const _balance = BigNumber(balance).shiftedBy(-contract.contract_decimals).toNumber()
            assets.push({
              ...contract,
              amount: _balance,
            })
          }
        }

        dispatch({
          type: BALANCES_DATA,
          value: { [`${chain_id}`]: assets },
        })
      }
    }
  }

  const getChainBalanceRPC = async (chain_id, contract_address) => {
    let balance

    if (address && rpcs_data?.[chain_id]) {
      const provider = rpcs_data[chain_id]
      if (contract_address === constants.AddressZero) {
        balance = await provider.getBalance(address)
      }
      else {
        const contract = new Contract(contract_address, ['function balanceOf(address owner) view returns (uint256)'], provider)
        balance = await contract.balanceOf(address)
      }
    }

    return balance
  }

  const getChainTokenRPC = async (chain_id, contract) => {
    if (chain_id && contract) {
      const balance = await getChainBalanceRPC(chain_id, contract.contract_address)

      if (balance) {
        const _balance = BigNumber(balance.toString()).shiftedBy(-contract.contract_decimals).toNumber()
        const asset = {
          ...contract,
          amount: _balance,
        }

        dispatch({
          type: BALANCES_DATA,
          value: { [`${chain_id}`]: [asset] },
        })
      }
    }
  }

  const getChainBalances = async chain_id => {
    if (chain_id && address) {
      const contracts = assets_data?.map(a => { return { ...a, ...a?.contracts?.find(c => c.chain_id === chain_id) } }).filter(a => a?.contract_address) || []
      const multicallAddress = getDeployedMulticallContract(chain_id)?.address

      if (!balances_data?.[chain_id]) {
        if (multicallAddress && ![1666600000].includes(chain_id)) {
          getChainTokenMulticall(chain_id, contracts?.filter(c => c.contract_address !== constants.AddressZero))
          contracts.filter(c => c.contract_address === constants.AddressZero).forEach(c => getChainTokenRPC(chain_id, c))
        }
        else {
          contracts.forEach(c => getChainTokenRPC(chain_id, c))
        }
      }
    }
  }

  const getChainBalance = (chain_id, side = 'from') => {
    const chain = chains_data?.find(c => c?.chain_id === chain_id)
    const asset = assets_data?.find(a => a?.id === swapConfig[`${side}AssetId`])
    return balances_data?.[chain_id]?.find(c => c?.contract_address === asset?.contracts?.find(_c => _c?.chain_id === chain_id)?.contract_address)
  }

  const getChainGasPriceRPC = async chain_id => {
    if (rpcs_data?.[chain_id]) {
      const provider = rpcs_data[chain_id]
      const gasPrice = await provider.getGasPrice();

      if (gasPrice) {
        let gasPriceGwei = Number(utils.formatUnits(gasPrice, 'gwei'));
        if (gasPriceGwei < 0.000001) {
          gasPriceGwei = 0
        }
        dispatch({
          type: GAS_PRICES_DATA,
          value: {
            [`${chain_id}`]: {
              gas_price: numberFormat(gasPriceGwei, '0,0'),
              updated_at: moment().valueOf(),
            },
          },
        })
      }
    }
  }

  const isSupport = () => {
    const fromAsset = assets_data?.find(a => a?.id === swapConfig.fromAssetId)
    const toAsset = assets_data?.find(a => a?.id === swapConfig.toAssetId)
    return fromAsset && toAsset &&
      !(swapConfig.fromChainId && fromAsset.contracts?.findIndex(c => c?.chain_id === swapConfig.fromChainId) < 0) &&
      !(swapConfig.toChainId && toAsset.contracts?.findIndex(c => c?.chain_id === swapConfig.toChainId) < 0)
  }

  const getChainSynced = chain_id => !chains_status_data || chains_status_data.find(c => c.chain_id === chain_id)?.synced

  const isTokenApproved = async is_after_approve => {
    let approved = false

    if (address && chain_id && swapConfig.fromAssetId && isSupport() && (is_after_approve || !tokenApproveResponse)) {
      const fromChainSynced = getChainSynced(swapConfig.fromChainId)
      const toChainSynced = getChainSynced(swapConfig.toChainId)
      const asset = assets_data?.find(a => a?.id === swapConfig.fromAssetId)
      const contract = asset?.contracts?.find(c => c?.chain_id === swapConfig.fromChainId)

      if (contract?.contract_address) {
        if (contract.contract_address === constants.AddressZero) {
          approved = true
        }
        else {
          if (is_after_approve) {
            await sleep(5000)
          }
          approved = await getApproved(signer, contract.contract_address, getDeployedTransactionManagerContract(swapConfig.fromChainId)?.address)
        }
      }
    }

    return approved
  }

  const approveToken = async () => {
    const asset = assets_data?.find(a => a?.id === swapConfig.fromAssetId)
    const contract = asset?.contracts?.find(c => c?.chain_id === swapConfig.fromChainId)

    setTokenApproveResponse(null)
    try {
      const tx_approve = await approve(signer, contract?.contract_address, getDeployedTransactionManagerContract(swapConfig.fromChainId)?.address, infiniteApproval ? constants.MaxUint256 : BigNumber(swapConfig.amount).decimalPlaces(6, BigNumber.ROUND_CEIL).shiftedBy(contract?.contract_decimals).toString())
      const tx_hash = tx_approve?.hash
      setTokenApproveResponse({ status: 'pending', message: `Wait for ${contract?.symbol || asset?.symbol} Approval Confirmation`, tx_hash })
      await tx_approve.wait()
      const approved = await isTokenApproved(true)
      setTokenApproved(approved)
      setTokenApproveResponse({ status: 'success', message: `${contract?.symbol || asset?.symbol} Approval Transaction Confirmed.`, tx_hash })
    } catch (error) {
      setTokenApproveResponse({ status: 'failed', message: error?.data?.message || error?.message })
    }
  }

  const getChainPrepareGasFee = async chain_id => {
    let gasFee

    if (chain_id && rpcs_data?.[chain_id]) {
      const chain = chains_data?.find(c => c?.chain_id === chain_id)
      if (chain) {
        const gasLimit = (await getHardcodedGasLimits(chain_id))?.prepare || 0
        const provider_url = _.head(rpcs_data[chain_id].providerConfigs?.map(p => p?.provider?.connection?.url))
        const web3 = new Web3(provider_url)
        const gasPrice = await web3.eth.getGasPrice()
        gasFee = BigNumber(gasPrice).multipliedBy(gasLimit).shiftedBy(-chain.provider_params?.[0]?.nativeCurrency?.decimals).toNumber()
      }
    }

    return gasFee
  }

  const estimate = async controller => {
    if (isSupport() && !swapData) {
      const fromAsset = swapConfig.fromChainId && swapConfig.fromAssetId && assets_data?.find(a => a?.id === swapConfig.fromAssetId && a.contracts?.findIndex(c => c?.chain_id === swapConfig.fromChainId) > -1)
      const toAsset = swapConfig.toChainId && swapConfig.toAssetId && assets_data?.find(a => a?.id === swapConfig.toAssetId && a.contracts?.findIndex(c => c?.chain_id === swapConfig.toChainId) > -1)
      const fromContract = fromAsset?.contracts?.find(c => c?.chain_id === swapConfig.fromChainId)
      const toContract = toAsset?.contracts?.find(c => c?.chain_id === swapConfig.toChainId)

      if (fromContract && toContract) {
        setEstimatedAmountResponse(null)
        if (typeof swapConfig.amount === 'number') {
          setTokenApproveResponse(null)

          if (sdk_data) {
            if (!controller.signal.aborted) {
              setEstimatingAmount(true)
              setEstimatingFees(false)
              setBidIntervalSeconds(bid_interval_seconds)
              setStartingSwap(false)
              setSwapData(null)
              setSwapResponse(null)
              try {
                const response = await sdk_data.getTransferQuote({
                  sendingChainId: swapConfig.fromChainId,
                  sendingAssetId: fromContract.contract_address,
                  receivingChainId: swapConfig.toChainId,
                  receivingAssetId: toContract.contract_address,
                  receivingAddress: advancedOptions?.receiving_address || address,
                  amount: BigNumber(swapConfig.amount).shiftedBy(fromContract.contract_decimals).toString(),
                  transactionId,
                  expiry: moment().add(expiry_hours, 'hours').unix(),
                  callTo: advancedOptions?.contract_address || undefined,
                  callData: advancedOptions?.call_data || undefined,
                  initiator: advancedOptions?.initiator || undefined,
                  preferredRouters: advancedOptions?.preferred_router?.length > 0 ? advancedOptions.preferred_router.split(',') : undefined,
                  dryRun: false,
                })
                if (!controller.signal.aborted) {
                  if (response?.bid?.sendingChainId === swapConfig.fromChainId && response?.bid?.receivingChainId === swapConfig.toChainId && response?.bid?.sendingAssetId === fromContract.contract_address) {
                    getDomains([address, response?.bid?.router, advancedOptions?.receiving_address])
                    const relayerFee = BigNumber(response?.metaTxRelayerFee || 0).shiftedBy(-toContract.contract_decimals).toNumber()
                    const gasFee = BigNumber(response?.gasFeeInReceivingToken || 0).shiftedBy(-toContract.contract_decimals).toNumber()
                    const routerFee = BigNumber(response?.routerFee || 0).shiftedBy(-toContract.contract_decimals).toNumber()
                    // const totalFee = BigNumber(response?.totalFee || 0).shiftedBy(-toContract.contract_decimals).toNumber()
                    /* hotfix */
                    const totalFee = BigNumber(response?.bid?.amount || 0).shiftedBy(-fromContract.contract_decimals).toNumber() - BigNumber(response?.bid?.amountReceived || 0).shiftedBy(-toContract.contract_decimals).toNumber() + relayerFee
                    setFees({
                      relayer: relayerFee,
                      gas: gasFee,
                      router: routerFee,
                      total: totalFee,
                      prepareGasFee: fromContract?.contract_address === constants.AddressZero && (fees?.prepareGasFee || await getChainPrepareGasFee(swapConfig.fromChainId)),
                    })
                    setEstimatedAmount(response)
                    setBidIntervalSeconds(null)
                  }
                }
              } catch (error) {
                if (!controller.signal.aborted) {
                  setEstimatedAmountResponse({ status: 'failed', message: error?.data?.message || error?.message })
                }
              }
              if (!controller.signal.aborted) {
                setEstimatingAmount(false)
              }
            }
          }
        }
        else {
          if (sdk_data) {
            if (!controller.signal.aborted) {
              setEstimatingFees(true)
              setEstimatedAmount(null)
              setEstimatingAmount(false)
              try {
                const response = await sdk_data.getEstimateReceiverAmount({
                  amount: '0',
                  sendingChainId: swapConfig.fromChainId,
                  sendingAssetId: fromContract?.contract_address,
                  receivingChainId: swapConfig.toChainId,
                  receivingAssetId: toContract?.contract_address,
                })
                if (!controller.signal.aborted) {
                  setFees({
                    relayer: BigNumber(response?.relayerFee || 0).shiftedBy(-toContract.contract_decimals).toNumber(),
                    gas: BigNumber(response?.gasFee || 0).shiftedBy(-toContract.contract_decimals).toNumber(),
                    router: BigNumber(response?.routerFee || 0).shiftedBy(-toContract.contract_decimals).toNumber(),
                    total: BigNumber(response?.totalFee || 0).shiftedBy(-toContract.contract_decimals).toNumber(),
                    prepareGasFee: fromContract?.contract_address === constants.AddressZero && await getChainPrepareGasFee(swapConfig.fromChainId),
                  })
                }
              } catch (error) {
                if (!controller.signal.aborted) {
                  setEstimatedAmountResponse({ status: 'failed', message: error?.data?.message || error?.message })
                }
              }
              if (!controller.signal.aborted) {
                setEstimatingFees(false)
              }
            }
          }
        }

        const approved = await isTokenApproved()
        setTokenApproved(approved)
      }
    }
  }

  const swap = async () => {
    setStartingSwap(true)
    if (sdk_data) {
      try {
        const response = await sdk_data.prepareTransfer(estimatedAmount, infiniteApproval)
        setSwapData({ ...response, sendingChainId: estimatedAmount?.bid?.sendingChainId, receivingChainId: estimatedAmount?.bid?.receivingChainId })
        setSwapResponse(null)
      } catch (error) {
        setSwapResponse({ status: 'failed', message: error?.data?.message || error?.message })
      }
      setTransactionId(getRandomBytes32())
      const approved = await isTokenApproved()
      setTokenApproved(approved)
    }
    setStartingSwap(false)
  }

  const swapNomad = async (fromChain, toChain, fromAsset, toAsset, fromContract, toContract) => {
    setStartingSwap(true)
    try {
      const isTestnet = ['testnet'].includes(process.env.NEXT_PUBLIC_NETWORK)
      const fromChainNomadId = fromChain?.nomad?.id
      const toChainNomadId = toChain?.nomad?.id
      const receivingAddress = advancedOptions?.receiving_address || address

      if (isTestnet) {
        dev.registerProvider(fromChainNomadId, rpcs_data?.[fromChain?.chain_id])
        dev.registerProvider(toChainNomadId, rpcs_data?.[toChain?.chain_id])
        dev.registerSigner(fromChainNomadId, signer)
      }
      else {
        mainnet.registerProvider(fromChainNomadId, rpcs_data?.[fromChain?.chain_id])
        mainnet.registerProvider(toChainNomadId, rpcs_data?.[toChain?.chain_id])
        mainnet.registerSigner(fromChainNomadId, signer)
      }

      const response = fromContract?.contract_address === constants.AddressZero ?
        await ((isTestnet ? dev : mainnet).sendNative(
          fromChainNomadId,
          toChainNomadId,
          BigNumber(swapConfig.amount).shiftedBy(fromContract?.contract_decimals).toString(),
          receivingAddress,
        ))
        :
        await ((isTestnet ? dev : mainnet).send(
          fromChainNomadId,
          toChainNomadId,
          { domain: fromChainNomadId, id: fromContract?.contract_address },
          BigNumber(swapConfig.amount).shiftedBy(fromContract?.contract_decimals).toString(),
          receivingAddress,
        ))
      setSwapResponse({ status: 'success', message: 'Sending through NOMAD', hash: response?.dispatch?.transactionHash })
    } catch (error) {
      setSwapResponse({ status: 'failed', message: error?.data?.message || error?.message })
    }
    setTransactionId(getRandomBytes32())
    setStartingSwap(false)
  }

  const isBreakAll = message => ['code=', ' 0x'].findIndex(p => message?.includes(p)) > -1

  const headMeta = meta(asPath, null, chains_data, assets_data)

  const fromChain = chains_data?.find(c => c?.chain_id === swapConfig.fromChainId)
  const toChain = chains_data?.find(c => c?.chain_id === swapConfig.toChainId)
  const fromAsset = assets_data?.find(a => a?.id === swapConfig.fromAssetId)
  const toAsset = assets_data?.find(a => a?.id === swapConfig.toAssetId)
  const fromContract = fromAsset?.contracts?.find(c => c?.chain_id === swapConfig.fromChainId)
  const toContract = toAsset?.contracts?.find(c => c?.chain_id === swapConfig.toChainId)
  const tokenPrice = tokens_data?.find(t => (t.chain_id === fromChain?.chain_id && t.contract_address === fromContract?.contract_address && typeof t.price === 'number') || (t.chain_id === toChain?.chain_id && t.contract_address === toContract?.contract_address && typeof t.price === 'number'))?.price

  const confirmFromChain = chains_data?.find(c => c?.chain_id === estimatedAmount?.bid?.sendingChainId)
  const confirmToChain = chains_data?.find(c => c?.chain_id === estimatedAmount?.bid?.receivingChainId) 
  const confirmFromAsset = assets_data?.find(a => a?.contracts?.findIndex(c => c.chain_id === estimatedAmount?.bid?.sendingChainId && c.contract_address?.toLowerCase() === estimatedAmount?.bid?.sendingAssetId?.toLowerCase()) > -1)
  const confirmToAsset = assets_data?.find(a => a?.contracts?.findIndex(c => c.chain_id === estimatedAmount?.bid?.receivingChainId && c.contract_address?.toLowerCase() === estimatedAmount?.bid?.receivingAssetId?.toLowerCase()) > -1)
  const confirmFromContract = confirmFromAsset?.contracts?.find(c => c?.chain_id === estimatedAmount?.bid?.sendingChainId)
  const confirmToContract = confirmToAsset?.contracts?.find(c => c?.chain_id === estimatedAmount?.bid?.receivingChainId)
  const confirmTokenPrice = tokens_data?.find(t => (t.chain_id === confirmToChain?.chain_id && t.contract_address === confirmToContract?.contract_address && typeof t.price === 'number') || (t.chain_id === confirmToChain?.chain_id && t.contract_address === confirmToContract?.contract_address && typeof t.price === 'number'))?.price

  const confirmAmount = confirmFromContract && estimatedAmount?.bid?.amount && BigNumber(estimatedAmount.bid.amount).shiftedBy(-confirmFromContract.contract_decimals).toNumber()
  const confirmRelayerFee = confirmToContract && estimatedAmount && BigNumber(estimatedAmount.metaTxRelayerFee || 0).shiftedBy(-confirmToContract.contract_decimals).toNumber()
  const confirmGasFee = confirmToContract && estimatedAmount && BigNumber(estimatedAmount.gasFeeInReceivingToken || 0).shiftedBy(-confirmToContract.contract_decimals).toNumber()
  const confirmRouterFee = confirmToContract && estimatedAmount && BigNumber(estimatedAmount.routerFee || 0).shiftedBy(-confirmToContract.contract_decimals).toNumber()
  const confirmAmountReceived = confirmToContract && estimatedAmount?.bid?.amountReceived && BigNumber(estimatedAmount.bid.amountReceived).shiftedBy(-confirmToContract.contract_decimals).toNumber() - confirmRelayerFee
  // const confirmFees = confirmToContract && estimatedAmount && BigNumber(estimatedAmount.totalFee || 0).shiftedBy(-confirmToContract.contract_decimals).toNumber()
  /* hotfix */
  const confirmFees = confirmToContract && estimatedAmount && (confirmAmount - confirmAmountReceived)
  const estimatedFees = typeof confirmFees === 'number' ? confirmFees : fees?.total
  /* hotfix */
  const feesPopover = children => children || (
    <Popover
      placement="bottom"
      title={<div className="flex items-center justify-between space-x-2.5">
        <span>{estimatedAmount ? '' : 'Estimated '}Fees:</span>
        <span className="font-mono space-x-1">
          <span>{typeof estimatedFees === 'number' ? `${estimatedAmount ? '' : '~'}${numberFormat(estimatedFees, '0,0.000000', true)}` : 'n/a'}</span>
          <span>{(estimatedAmount ? confirmToContract : toContract)?.symbol || (estimatedAmount ? confirmToAsset : toAsset)?.symbol}</span>
        </span>
      </div>}
      content={<div className="flex flex-col space-y-1">
        <div className="flex items-center justify-between space-x-2.5">
          <span className="font-medium">Dest. TX:</span>
          <span className="font-mono">{typeof (estimatedAmount ? confirmRelayerFee : fees?.relayer) === 'number' ? `${estimatedAmount ? '' : '~'}${numberFormat(estimatedAmount ? confirmRelayerFee : fees.relayer, '0,0.000000', true)}` : 'n/a'}</span>
        </div>
        <div className="flex items-center justify-between space-x-2.5">
          <span className="font-medium">Gas Fee:</span>
          <span className="font-mono">{typeof (estimatedAmount ? confirmGasFee : fees?.gas) === 'number' ? `${estimatedAmount ? '' : '~'}${numberFormat(estimatedAmount ? confirmGasFee : fees.gas, '0,0.000000', true)}` : 'n/a'}</span>
        </div>
        <div className="flex items-center justify-between space-x-2.5">
          <span className="font-medium">LP Fee:</span>
          <span className="font-mono">{typeof (estimatedAmount ? confirmRouterFee : fees?.router) === 'number' ? `${estimatedAmount ? '' : '~'}${numberFormat(estimatedAmount ? confirmRouterFee : fees.router, '0,0.000000', true)}` : `${process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT}%`}</span>
        </div>
      </div>}
      titleClassName="normal-case py-1.5"
    >
      {children}
    </Popover>
  )

  const maxTransfers = routers_assets_data && _.orderBy(
    Object.values(_.groupBy(routers_assets_data.flatMap(ra => ra?.asset_balances?.filter(ab => ab?.chain?.chain_id === toChain?.chain_id) || []), 'assetId')).map(a => {
      let assets_from_chains

      if (a && routers_status_data) {
        assets_from_chains = Object.fromEntries(chains_data?.filter(c => !c.disabled).map(c => {
          const assets = a.filter(_a => routers_status_data?.findIndex(r => r?.routerAddress?.toLowerCase() === _a?.router?.id?.toLowerCase() && r?.supportedChains?.includes(c?.chain_id) && r?.supportedChains?.includes(toChain?.chain_id) && r?.supportedChains?.includes(fromChain?.chain_id)) > -1)
          return [c.chain_id, _.maxBy(assets, 'amount')]
        }).filter(([key, value]) => key !== toChain?.chain_id && value))
      }

      return {
        ..._.maxBy(a, 'amount_value'),
        total_amount: _.sumBy(a, 'amount'),
        total_amount_value: _.sumBy(a, 'amount_value'),
        assets_from_chains,
      }
    }), ['value'], ['desc']
  )

  const fromBalance = getChainBalance(swapConfig.fromChainId, 'from')
  const toBalance = getChainBalance(swapConfig.toChainId, 'to')
  const fromBalanceAmount = fromBalance?.amount || 0
  const toBalanceAmount = toBalance?.amount || 0
  const fromBalanceComponent = address && swapConfig.fromChainId && fromAsset && (
    <div className={`flex items-center font-mono ${fromBalanceAmount > 0 ? 'text-green-500 dark:text-white font-semibold' : 'text-gray-400 dark:text-gray-600'} space-x-1`}>
      {balances_data?.[swapConfig.fromChainId] ?
        <>
          <span>{fromBalance ? numberFormat(fromBalanceAmount, '0,0.000000', true) : 'n/a'}</span>
          {fromBalance && (
            <span>{fromBalance?.symbol || fromContract?.symbol || fromAsset?.symbol}</span>
          )}
        </>
        :
        <TailSpin color={theme === 'dark' ? 'white' : '#2563EB'} width="20" height="20" />
      }
    </div>
  )
  const toBalanceComponent = address && swapConfig.toChainId && toAsset && (
    <div className={`flex items-center font-mono ${toBalanceAmount > 0 ? 'text-green-500 dark:text-white font-semibold' : 'text-gray-400 dark:text-gray-600'} space-x-1`}>
      {balances_data?.[swapConfig.toChainId] ?
        <>
          <span>{toBalance ? numberFormat(toBalanceAmount, '0,0.000000', true) : 'n/a'}</span>
          {toBalance && (
            <span>{toBalance?.symbol || toContract?.symbol || toAsset?.symbol}</span>
          )}
        </>
        :
        <TailSpin color={theme === 'dark' ? 'white' : '#2563EB'} width="20" height="20" />
      }
    </div>
  )

  const minAmount = estimatedFees || fees?.prepareGasFee || min_amount
  const maxBalanceAmount = fromBalanceAmount > minAmount ? fromBalanceAmount : 0
  let maxTransfer = maxTransfers?.find(t => t?.chain?.chain_id === swapConfig.toChainId && t?.contract_address === toContract?.contract_address)
  if (maxTransfer?.assets_from_chains?.[swapConfig.fromChainId]) {
    maxTransfer.amount = maxTransfer.assets_from_chains[swapConfig.fromChainId].amount
    maxTransfer.amount_value = maxTransfer.assets_from_chains[swapConfig.fromChainId].amount_value
  }
  else if (swapConfig.fromChainId) {
    maxTransfer = null;
  }
  let maxAmount = maxTransfer ? maxTransfer.amount < maxBalanceAmount ? maxTransfer.amount > minAmount ? maxTransfer.amount : 0 : maxBalanceAmount : 0
  if (maxAmount) {
    maxAmount = maxAmount - (fees?.prepareGasFee || 0)
    maxAmount = BigNumber(maxAmount).decimalPlaces(6, BigNumber.ROUND_FLOOR).toNumber()
  }
  const isExceedMaxLiquidity = typeof maxTransfer?.amount !== 'number' || (typeof swapConfig.amount === 'number' && swapConfig.amount > maxTransfer.amount)

  const supportNomad = swapConfig.fromChainId && swapConfig.toChainId &&
    fromAsset?.nomad_support?.findIndex(p => p?.from_chain_id === swapConfig.fromChainId && p?.to_chain_id === swapConfig.toChainId) > -1 &&
    toAsset?.nomad_support?.findIndex(p => p?.from_chain_id === swapConfig.fromChainId && p?.to_chain_id === swapConfig.toChainId) > -1
  const useNomad = supportNomad && bridgeProtocol === 'nomad'
  const nomadUrl = useNomad && (fromChain.optional_bridge_urls?.find(url => url?.includes('.nomad.')) || toChain.optional_bridge_urls?.find(url => url?.includes('.nomad.')))

  const mustApproveToken = isSupport() && fromContract && !(tokenApproved && (typeof tokenApproved === 'boolean' ? tokenApproved : tokenApproved.gte(BigNumber(swapConfig.amount).shiftedBy(fromContract.contract_decimals))))
  const unlimitAllowance = tokenApproved === true || (tokenApproved && tokenApproved?.toNumber() >= constants.MaxUint256)
  const actionDisabled = tokenApproveResponse?.status === 'pending' || startingSwap
  const allowanceComponent = (
    <>
      <div className={`flex items-center ${infiniteApproval || unlimitAllowance ? 'text-blue-500 dark:text-white' : 'text-gray-400 dark:text-gray-600'} space-x-0.5`}>
        {infiniteApproval || unlimitAllowance ?
          <BiInfinite size={16} />
          :
          <BiLock size={16} />
        }
        <span className="normal-case font-medium">{infiniteApproval || unlimitAllowance ? 'Infinite' : 'Exact'}</span>
      </div>
      <Switch
        disabled={actionDisabled || unlimitAllowance}
        checked={infiniteApproval || unlimitAllowance || false}
        onChange={() => setInfiniteApproval(!infiniteApproval)}
        onColor={theme === 'dark' ? '#D1D5DB' : '#BFDBFE'}
        onHandleColor={theme === 'dark' ? '#FFFFFF' : '#3B82F6'}
        offColor={theme === 'dark' ? '#374151' : '#E5E7EB'}
        offHandleColor={theme === 'dark' ? '#4B5563' : '#FFFFFF'}
        handleDiameter={24}
        uncheckedIcon={false}
        checkedIcon={false}
        boxShadow="0px 1px 5px rgba(0, 0, 0, 0.2)"
        activeBoxShadow="0px 1px 5px rgba(0, 0, 0, 0.2)"
        height={20}
        width={48}
        className="react-switch"
      />
    </>
  )

  const fromChainSynced = getChainSynced(swapConfig.fromChainId)
  const toChainSynced = getChainSynced(swapConfig.toChainId)
  const unsyncedChains = [!fromChainSynced && fromChain, !toChainSynced && toChain].filter(c => c)

  const receivingAddress = useNomad || !estimatedAmount?.bid?.receivingAddress ? advancedOptions?.receiving_address || address : estimatedAmount.bid.receivingAddress
  const mustChangeChain = swapConfig.fromChainId && chain_id !== swapConfig.fromChainId && !swapData && !activeTransactionOpen
  const isWalletConnect = provider?.constructor?.name === 'WalletConnectProvider'

  return (
    <>
      {tokenApproveResponse && (
        <Notification
          hideButton={true}
          outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
          innerClassNames={`${tokenApproveResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-600' : tokenApproveResponse.status === 'success' ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-600 dark:bg-blue-700'} text-white`}
          animation="animate__animated animate__fadeInDown"
          icon={tokenApproveResponse.status === 'failed' ?
            <FaTimesCircle className="w-4 h-4 stroke-current mr-2" />
            :
            tokenApproveResponse.status === 'success' ?
              <FaCheckCircle className="w-4 h-4 stroke-current mr-2" />
              :
              <FaClock className="w-4 h-4 stroke-current mr-2" />
          }
          content={<span className="flex flex-wrap items-center">
            <span className="mr-1.5">{tokenApproveResponse.message}</span>
            {tokenApproveResponse.status === 'pending' && (
              <TailSpin color={theme === 'dark' ? 'white' : 'white'} width="16" height="16" className="mr-1.5" />
            )}
            {fromChain?.explorer?.url && tokenApproveResponse.tx_hash && (
              <a
                href={`${fromChain.explorer.url}${fromChain.explorer.transaction_path?.replace('{tx}', tokenApproveResponse.tx_hash)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center font-semibold mx-1.5"
              >
                <span>View on {fromChain.explorer.name}</span>
                <TiArrowRight size={20} className="transform -rotate-45" />
              </a>
            )}
            {['success'].includes(tokenApproveResponse.status) && typeof tokenApproveResponseCountDown === 'number' && (
              <span className="font-mono">(close in {tokenApproveResponseCountDown}s)</span>
            )}
          </span>}
        />
      )}
      <div className="grid grid-flow-row grid-cols-1 lg:grid-cols-8 items-start gap-4">
        <div className="hidden lg:block col-span-0 lg:col-span-2" />
        <div className="col-span-1 lg:col-span-4">
          <div className="space-y-4 mt-8">
            {announcement_data?.data && (
              <Alert
                color="xl:max-w-lg bg-yellow-400 dark:bg-blue-600 text-white text-left mx-auto"
                icon={<HiSpeakerphone className="w-4 xl:w-6 h-4 xl:h-6 stroke-current mr-3" />}
                closeDisabled={true}
                rounded={true}
                className="items-start"
              >
                <div className="block leading-4 text-xs xl:text-base font-medium">
                  <span className="mr-1.5">
                    <Linkify>{parse(announcement_data?.data)}</Linkify>
                  </span>
                </div>
              </Alert>
            )}
            {chains_status_data?.filter(c => !c.disabled && !c.synced).filter(c => [swapConfig.fromChainId, swapConfig.toChainId].filter(_c => _c).length < 1 || [swapConfig.fromChainId, swapConfig.toChainId].includes(c.chain_id)).length > 0 && (
              <Alert
                color="xl:max-w-lg bg-yellow-400 dark:bg-red-500 text-white text-left mx-auto"
                icon={<TiWarning className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />}
                closeDisabled={true}
                rounded={true}
                className="items-start"
              >
                <div className="block leading-4 text-xs xl:text-base font-medium">
                  <span className="mr-1.5">
                    Transfers to and from <span className="font-semibold">{chains_status_data?.filter(c => !c.disabled && !c.synced).map(c => c?.title).join(', ')}</span> may be delayed temporarily. Funds are always safe! If you have active transactions, check their status
                  </span>
                  <a
                    href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}${address ? `/address/${address}` : '/status'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-bold"
                  >
                    here
                  </a>.
                </div>
              </Alert>
            )}
          </div>
          <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 my-6">
            <div className="w-full max-w-lg space-y-2">
              <div className="flex items-center justify-between space-x-2">
                <div>
                  <h1 className="uppercase text-base sm:text-lg font-semibold">Cross-Chain Transfer</h1>
                  {asPath?.includes('from-') && asPath?.includes('to-') && headMeta?.title && (
                    <h2 className="text-gray-400 dark:text-gray-600 text-xs sm:text-sm">{headMeta.title.replace(' with Connext', '')}</h2>
                  )}
                </div>
                {toChain && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/${toChain.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-max bg-gray-50 hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-900 cursor-pointer rounded-xl flex items-center text-blue-600 dark:text-white py-1.5 px-2.5"
                  >
                    <Img
                      src={toChain.image}
                      alt=""
                      className="w-5 h-5 rounded-full mr-2"
                    />
                    <span className="text-base font-medium">Liquidity</span>
                    <TiArrowRight size={20} className="transform -rotate-45 mt-0.5 -mr-1" />
                  </a>
                )}
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md space-y-8 sm:space-y-6 p-8 sm:p-6">
                <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-5 gap-6">
                  <div className="sm:col-span-2 flex flex-col items-center sm:items-start">
                    <div className="w-48 flex items-center justify-center space-x-1.5">
                      <span className="text-gray-400 dark:text-gray-600 text-lg font-medium text-center">From</span>
                      {gas_prices_data?.[fromChain?.chain_id]?.gas_price && (
                        <Popover
                          placement="bottom"
                          title={fromChain.title}
                          content={<div className="flex flex-col">
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-600 dark:text-gray-400">Gas Price:</span>
                              <span className="font-semibold">
                                {gas_prices_data[fromChain.chain_id].gas_price} Gwei
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-600 dark:text-gray-400">Updated at:</span>
                              <span className="font-semibold">
                                {Number(moment().diff(moment(gas_prices_data[fromChain.chain_id].updated_at), 'second')) > 59 ?
                                  moment(gas_prices_data[fromChain.chain_id].updated_at).fromNow()
                                  :
                                  <>{moment().diff(moment(gas_prices_data[fromChain.chain_id].updated_at), 'second')}s ago</>
                                }
                              </span>
                            </div>
                          </div>}
                          titleClassName="normal-case py-1"
                        >
                          <div className="flex items-center text-gray-400 dark:text-white space-x-1">
                            <MdLocalGasStation size={20} />
                            <span className="normal-case font-medium">
                              {gas_prices_data[fromChain.chain_id].gas_price} Gwei
                            </span>
                          </div>
                        </Popover>
                      )}
                    </div>
                    <Network
                      disabled={actionDisabled}
                      chain_id={swapConfig.fromChainId}
                      onSelect={chain_id => {
                        const fromChainId = chain_id
                        const toChainId = chain_id === swapConfig.toChainId ? swapConfig.fromChainId : swapConfig.toChainId

                        setSwapConfig({
                          ...swapConfig,
                          fromChainId,
                          toChainId,
                        })

                        if (fromChainId) {
                          getChainBalances(fromChainId)
                        }
                        if (toChainId) {
                          getChainBalances(toChainId)
                        }
                      }}
                      from={swapConfig.fromChainId}
                      to={swapConfig.toChainId}
                    />
                    <Asset
                      disabled={actionDisabled}
                      swapConfig={swapConfig}
                      onSelect={asset_id => {
                        setSwapConfig({
                          ...swapConfig,
                          fromAssetId: asset_id,
                          toAssetId: !swapConfig.toAssetId ?
                            swapConfig.fromChainId && swapConfig.fromChainId === swapConfig.toChainId ? null : asset_id // null
                            :
                            swapConfig.fromChainId && swapConfig.fromChainId === swapConfig.toChainId && asset_id === swapConfig.toAssetId ?
                              swapConfig.fromAssetId === asset_id ? null : swapConfig.fromAssetId
                              :
                              asset_id, // swapConfig.toAssetId,
                          amount: asset_id !== swapConfig.fromAssetId && typeof swapConfig.amount === 'number' ? null : swapConfig.amount,
                        })

                        if (asset_id !== swapConfig.fromAssetId) {
                          if (swapConfig.fromChainId) {
                            getChainBalances(swapConfig.fromChainId)
                          }
                          if (swapConfig.toChainId) {
                            getChainBalances(swapConfig.toChainId)
                          }
                        }
                      }}
                      from={swapConfig.fromAssetId}
                      to={swapConfig.toAssetId}
                    />
                    <div className="w-48 flex items-center justify-center">
                      {fromBalanceComponent}
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      disabled={actionDisabled}
                      onClick={() => {
                        setSwapConfig({
                          ...swapConfig,
                          fromChainId: swapConfig.toChainId,
                          toChainId: swapConfig.fromChainId,
                          fromAssetId: swapConfig.toAssetId,
                          toAssetId: swapConfig.fromAssetId,
                          amount: null,
                        })
                        setInfiniteApproval(defaultInfiniteApproval)

                        if (swapConfig.fromChainId) {
                          getChainBalances(swapConfig.fromChainId)
                        }
                        if (swapConfig.toChainId) {
                          getChainBalances(swapConfig.toChainId)
                        }
                      }}
                      className={`${actionDisabled ? 'cursor-not-allowed' : ''}`}
                    >
                      <MdSwapVerticalCircle size={40} className="sm:hidden rounded-full shadow text-blue-400 hover:text-blue-600 dark:text-gray-700 dark:hover:text-white" />
                      <MdSwapHorizontalCircle size={40} className="hidden sm:block rounded-full shadow text-blue-400 hover:text-blue-600 dark:text-gray-700 dark:hover:text-white" />
                    </button>
                  </div>
                  <div className="sm:col-span-2 flex flex-col items-center sm:items-end">
                    <div className="w-48 flex items-center justify-center space-x-1.5">
                      <span className="text-gray-400 dark:text-gray-600 text-lg font-medium text-center">To</span>
                      {gas_prices_data?.[toChain?.chain_id]?.gas_price && (
                        <Popover
                          placement="bottom"
                          title={toChain.title}
                          content={<div className="flex flex-col">
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-600 dark:text-gray-400">Gas Price:</span>
                              <span className="font-semibold">
                                {gas_prices_data[toChain.chain_id].gas_price} Gwei
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-600 dark:text-gray-400">Updated at:</span>
                              <span className="font-semibold">
                                {Number(moment().diff(moment(gas_prices_data[toChain.chain_id].updated_at), 'second')) > 59 ?
                                  moment(gas_prices_data[toChain.chain_id].updated_at).fromNow()
                                  :
                                  <>{moment().diff(moment(gas_prices_data[toChain.chain_id].updated_at), 'second')}s ago</>
                                }
                              </span>
                            </div>
                          </div>}
                          titleClassName="normal-case py-1"
                        >
                          <div className="flex items-center text-gray-400 dark:text-white space-x-1">
                            <MdLocalGasStation size={20} />
                            <span className="normal-case font-medium">
                              {gas_prices_data[toChain.chain_id].gas_price} Gwei
                            </span>
                          </div>
                        </Popover>
                      )}
                    </div>
                    <Network
                      disabled={actionDisabled}
                      chain_id={swapConfig.toChainId}
                      onSelect={chain_id => {
                        const fromChainId = chain_id === swapConfig.fromChainId ? swapConfig.toChainId : swapConfig.fromChainId
                        const toChainId = chain_id

                        setSwapConfig({
                          ...swapConfig,
                          fromChainId,
                          toChainId,
                        })

                        if (fromChainId) {
                          getChainBalances(fromChainId)
                        }
                        if (toChainId) {
                          getChainBalances(toChainId)
                        }
                      }}
                      from={swapConfig.fromChainId}
                      to={swapConfig.toChainId}
                      side="to"
                    />
                    <Asset
                      disabled={actionDisabled}
                      swapConfig={swapConfig}
                      onSelect={asset_id => {
                        setSwapConfig({
                          ...swapConfig,
                          fromAssetId: !swapConfig.fromAssetId ?
                            swapConfig.fromChainId && swapConfig.fromChainId === swapConfig.toChainId ? null : asset_id // null
                            :
                            swapConfig.fromChainId && swapConfig.fromChainId === swapConfig.toChainId && asset_id === swapConfig.fromAssetId ?
                              swapConfig.toAssetId === asset_id ? null : swapConfig.toAssetId
                              :
                              asset_id, // swapConfig.fromAssetId,
                          toAssetId: asset_id,
                          amount: asset_id !== swapConfig.toAssetId && typeof swapConfig.amount === 'number' ? null : swapConfig.amount,
                        })

                        if (asset_id !== swapConfig.toAssetId) {
                          if (swapConfig.fromChainId) {
                            getChainBalances(swapConfig.fromChainId)
                          }
                          if (swapConfig.toChainId) {
                            getChainBalances(swapConfig.toChainId)
                          }
                        }
                      }}
                      from={swapConfig.fromAssetId}
                      to={swapConfig.toAssetId}
                      side="to"
                    />
                    <div className="w-48 flex items-center justify-center">
                      {toBalanceComponent}
                    </div>
                  </div>
                </div>
                {supportNomad && (
                  <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-5 gap-6 sm:mx-3">
                    <div className="sm:col-span-2 flex items-center justify-center sm:justify-start">
                      <span className="text-gray-400 dark:text-gray-600 text-base">via Protocol</span>
                    </div>
                    <div className="sm:col-span-3 flex items-center justify-center sm:justify-end space-x-2.5">
                      {protocols.map((p, i) => (
                        <Popover
                          key={i}
                          placement="top"
                          title={p.title}
                          content={p.estimated_time}
                          titleClassName="normal-case py-1"
                        >
                          <button
                            onClick={() => {
                              setBridgeProtocol(p.id)
                              reset(false, true)
                            }}
                            className={`${p.id === bridgeProtocol ? 'ring-2 ring-blue-600 dark:ring-white' : ''} rounded-xl shadow py-1 px-2`}
                          >
                            <img
                              src={p.image?.[theme]}
                              alt=""
                              className="h-5"
                            />
                          </button>
                        </Popover>
                      ))}
                    </div>
                  </div>
                )}
                {swapConfig.fromAssetId && (
                  <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-5 gap-6 sm:ml-3">
                    <div className="sm:col-span-2 flex items-center justify-center sm:justify-start space-x-2.5">
                      <span className="text-gray-400 dark:text-gray-600 text-base">Amount</span>
                      {address && isSupport() && balances_data?.[swapConfig.fromChainId] && (
                        <Popover
                          placement="bottom"
                          title={<div className="flex items-center justify-between space-x-2.5">
                            <span>Transfers Size</span>
                            <span className="font-mono">{fromContract?.symbol || fromAsset?.symbol}</span>
                          </div>}
                          content={<div className="flex flex-col space-y-1">
                            {fees && fromContract?.contract_address === constants.AddressZero && (
                              <div className="flex items-center justify-between space-x-2.5">
                                <span className="font-medium">Gas:</span>
                                <span className="font-mono">{typeof fees.prepareGasFee === 'number' ? numberFormat(fees.prepareGasFee, fees.prepareGasFee > 100 ? '0,0.00' : '0,0.000000', true) : 'n/a'}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between space-x-2.5">
                              <span className="font-medium">Balance:</span>
                              <span className="font-mono">{typeof fromBalanceAmount === 'number' ? numberFormat(fromBalanceAmount, fromBalanceAmount > 1000 ? '0,0.00' : '0,0.000000', true) : 'n/a'}</span>
                            </div>
                            <div className="flex items-start justify-between space-x-2.5 pb-1">
                              <span className="font-medium">Max Size:</span>
                              {typeof maxTransfer?.amount === 'number' && supportNomad ?
                                <div className="flex flex-col items-end space-y-0.5">
                                  <div className="flex items-center space-x-1.5">
                                    <img
                                      src={protocols.find(p => p.id === 'nomad')?.image?.[theme]}
                                      alt=""
                                      className="h-4"
                                    />
                                    <div className="flex items-center space-x-0.5">
                                      <span className="font-mono">{numberFormat(maxTransfer.amount, maxTransfer.amount > 1000 ? '0,0.00' : '0,0.000000', true)}</span>
                                      <div>
                                        <BiUpArrowAlt size={16} className="-mr-1" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <img
                                      src={protocols.find(p => p.id === 'connext')?.image?.[theme]}
                                      alt=""
                                      className="h-4"
                                    />
                                    <div className="flex items-center space-x-0.5">
                                      <span className="font-mono">{numberFormat(maxTransfer.amount, maxTransfer.amount > 1000 ? '0,0.00' : '0,0.000000', true)}</span>
                                      <div>
                                        <BiArrowFromTop size={16} className="-mr-1" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                :
                                <span className="font-mono">{typeof maxTransfer?.amount === 'number' ? numberFormat(maxTransfer.amount, maxTransfer.amount > 1000 ? '0,0.00' : '0,0.000000', true) : 'n/a'}</span>
                              }
                            </div>
                            <div className="border-t flex items-center justify-between space-x-2.5 pt-2">
                              <span className="font-semibold">Min:</span>
                              <span className="font-mono font-semibold">{typeof minAmount === 'number' ? numberFormat(minAmount, minAmount > 10 ? '0,0.00' : '0,0.000000', true) : 'n/a'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">Max:</span>
                              <span className="font-mono font-semibold">{typeof maxAmount === 'number' ? numberFormat(maxAmount, maxAmount > 1000 ? '0,0.00' : '0,0.000000', true) : 'n/a'}</span>
                            </div>
                          </div>}
                          titleClassName="normal-case py-1.5"
                        >
                          <button
                            disabled={actionDisabled}
                            onClick={() => {
                              setSwapConfig({
                                ...swapConfig,
                                amount: maxAmount,
                              })
                            }}
                            className="bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl shadow font-mono text-blue-400 hover:text-blue-600 dark:text-gray-200 dark:hover:text-white text-base font-semibold py-0.5 px-2.5"
                          >
                            Max
                          </button>
                        </Popover>
                      )}
                    </div>
                    <div className="sm:col-span-3 flex items-center justify-center sm:justify-end">
                      <Asset
                        disabled={actionDisabled || !address}
                        swapConfig={swapConfig}
                        amountOnChange={amount => {
                          setSwapConfig({
                            ...swapConfig,
                            amount: amount && !isNaN(amount) ? Number(amount) : amount,
                          })
                        }}
                      />
                    </div>
                  </div>
                )}
                {isSupport() && web3_provider && !useNomad && (estimatingAmount || estimatingFees || typeof estimatedFees === 'number') && (
                  <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-5 gap-6 sm:mx-3">
                    <div className="sm:col-span-2 flex items-center justify-center sm:justify-start">
                      <span className="text-gray-400 dark:text-gray-600 text-base">{estimatedAmount || estimatingAmount ? '' : 'Estimated '}Fees</span>
                    </div>
                    <div className="sm:col-span-3 flex items-center justify-center sm:justify-end">
                      {estimatingAmount || estimatingFees || typeof estimatedFees !== 'number' ?
                        <div className="flex items-center space-x-1.5">
                          <span className="text-gray-400 dark:text-gray-600 text-base font-light">
                            {estimatedAmount || estimatingAmount ? 'Calculating' : 'Estimating'}
                          </span>
                          <Triangle color={theme === 'dark' ? 'white' : '#2563EB'} width="24" height="24" />
                        </div>
                        :
                        typeof estimatedFees === 'number' ?
                          <div className="flex flex-col items-center sm:items-end space-y-1">
                            {feesPopover(
                              <span className="flex items-center font-mono font-semibold space-x-1.5">
                                <span>{typeof estimatedFees === 'number' ? `${estimatedAmount ? '' : '~'}${numberFormat(estimatedFees, '0,0.000000', true)}` : 'n/a'}</span>
                                <span>{toContract?.symbol || toAsset?.symbol}</span>
                                {!estimatedAmount && (
                                  <span className="text-gray-400 dark:text-gray-600">
                                    ({refreshEstimatedFeesSeconds}s)
                                  </span>
                                )}
                              </span>
                            )}
                            {typeof tokenPrice === 'number' && (
                              <span className="font-mono text-red-500 text-xs font-medium sm:text-right">
                                ({currency_symbol}{numberFormat(estimatedFees * tokenPrice, '0,0.00')})
                              </span>
                            )}
                          </div>
                          :
                          <div className="font-mono text-gray-400 dark:text-gray-600">n/a</div>
                      }
                    </div>
                  </div>
                )}
                {isSupport() && web3_provider && !useNomad && typeof swapConfig.amount === 'number' && (
                  <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-5 gap-6 sm:mx-3">
                    <div className="sm:col-span-2 min-w-max flex items-center justify-center sm:justify-start space-x-2.5">
                      <span className="text-gray-400 dark:text-gray-600 text-base">Estimated Received</span>
                      {!swapData && !swapResponse && estimatedAmount && !estimatingAmount && (
                        <button
                          onClick={() => setEstimateTrigger(moment().valueOf())}
                          className="bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full shadow flex items-center justify-center text-blue-400 hover:text-blue-600 dark:text-gray-600 dark:hover:text-white p-1 z-10"
                        >
                          <BiRefresh size={20} />
                        </button>
                      )}
                    </div>
                    <div className="sm:col-span-3 flex flex-col items-center sm:items-end">
                      <div className="flex items-center justify-center sm:justify-start font-mono font-semibold space-x-1.5">
                        <div className="sm:w-48 flex items-center justify-end text-right">
                          {estimatingAmount || estimatingFees ?
                            <Triangle color={theme === 'dark' ? 'white' : '#2563EB'} width="24" height="24" />
                            :
                            typeof confirmAmountReceived === 'number' ?
                              <span>{numberFormat(confirmAmountReceived, '0,0.000000', true)}</span>
                              :
                              <span className="text-gray-400 dark:text-gray-600 font-normal">n/a</span>
                          }
                        </div>
                        <span>{confirmToContract?.symbol || confirmToAsset?.symbol || toContract?.symbol || toAsset?.symbol}</span>
                      </div>
                      {!estimatedAmountResponse && !estimatingAmount && estimatedAmount && typeof confirmTokenPrice === 'number' && (
                        <div className="font-mono text-green-500 text-xs font-medium">
                          ({currency_symbol}{numberFormat(confirmAmountReceived * confirmTokenPrice, '0,0.00')})
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!useNomad && address && swapConfig.fromAssetId && fromContract?.contract_address !== constants.AddressZero && typeof swapConfig.amount === 'number' && (
                  <div className="grid grid-flow-row grid-cols-2 sm:grid-cols-5 gap-6 sm:mx-3">
                    <div className="sm:col-span-2 flex items-center justify-start space-x-2">
                      <span className="text-gray-400 dark:text-gray-600 text-base">Allowance</span>
                      <Popover
                        placement="top"
                        title="Allowance"
                        content={<div className="w-72">
                          Only the exact amount is allowed to be transferred. You will need to reapprove for a subsequent transaction.
                        </div>}
                        titleClassName="py-1.5"
                      >
                        <BsQuestionCircle size={16} className="text-gray-400 dark:text-gray-600" />
                      </Popover>
                    </div>
                    <div className="sm:col-span-3 flex items-center justify-end space-x-1.5">
                      {unlimitAllowance ?
                        <Popover
                          placement="top"
                          title={`${fromContract?.symbol || fromAsset?.symbol} Allowance`}
                          content={<div className="w-36">Infinite allowance on</div>}
                          titleClassName="normal-case py-1"
                        >
                          <div className="flex items-center justify-end space-x-1.5">
                            {allowanceComponent}
                          </div>
                        </Popover>
                        :
                        allowanceComponent
                      }
                    </div>
                  </div>
                )}
                <AdvancedOptions
                  applied={!_.isEqual(advancedOptions, defaultAdvancedOptions)}
                  disabled={['pending'].includes(tokenApproveResponse?.status)}
                  initialOptions={advancedOptions}
                  updateOptions={o => setAdvancedOptions(o)}
                  useNomad={useNomad}
                />
                {isSupport() && (swapData || balances_data?.[swapConfig.fromChainId]) && (typeof swapConfig.amount === 'number' || (mustChangeChain && web3_provider)) ?
                  mustChangeChain && web3_provider ?
                    <Wallet
                      chainIdToConnect={swapConfig.fromChainId}
                      buttonDisconnectTitle={<>
                        <span>{isWalletConnect ? 'Reconnect' : 'Switch'} to</span>
                        <Img
                          src={fromChain?.image}
                          alt=""
                          className="w-6 sm:w-8 h-6 sm:h-8 rounded-full"
                        />
                        <span className="font-semibold">{fromChain?.title}</span>
                      </>}
                      buttonDisconnectClassName="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-2xl flex items-center justify-center text-white text-sm sm:text-base space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3"
                    />
                    :
                    !swapData && isExceedMaxLiquidity ?
                      <Alert
                        color="bg-red-400 dark:bg-red-500 text-white text-base"
                        icon={<BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />}
                        closeDisabled={true}
                        rounded={true}
                      >
                        <span>Amount is higher than the available transfer size.</span>
                      </Alert>
                      :
                      !swapData && swapConfig.amount < estimatedFees ?
                        <Alert
                          color="bg-red-400 dark:bg-red-500 text-white text-base"
                          icon={<BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />}
                          closeDisabled={true}
                          rounded={true}
                        >
                          <span>Send at least <span className="font-mono font-semibold mx-1.5">{numberFormat(estimatedFees, '0,0.000000', true)} {toContract?.symbol || toAsset?.symbol}</span> to cover fees.</span>
                        </Alert>
                        :
                        !swapData && check_balances && maxBalanceAmount < swapConfig.amount ?
                          <Alert
                            color="bg-red-400 dark:bg-red-500 text-white text-base"
                            icon={<BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />}
                            closeDisabled={true}
                            rounded={true}
                          >
                            <span>Insufficient Funds</span>
                          </Alert>
                          :
                          useNomad ?
                            swapResponse ?
                              <Alert
                                color={`${swapResponse.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : swapResponse.status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                                icon={swapResponse.status === 'failed' ? <BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> : swapResponse.status === 'success' ? <BiMessageCheck className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> : <BiMessageDetail className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />}
                                closeDisabled={true}
                                rounded={true}
                              >
                                <div className="flex items-center justify-between space-x-1">
                                  <div className="flex items-center space-x-2">
                                    <span className={`break-${isBreakAll(swapResponse.message) ? 'all' : 'words'}`}>{swapResponse.message}</span>
                                    {['success'].includes(swapResponse.status) && swapResponse.hash && nomadUrl && (
                                      <a
                                        href={`${nomadUrl}/tx/nomad/${fromChain?.nomad?.id}/${swapResponse.hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center font-semibold pr-1.5"
                                      >
                                        <span className="underline">View on {protocols.find(p => p.id === 'nomad')?.title}</span>
                                        <TiArrowRight size={18} className="transform -rotate-45" />
                                      </a>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => reset()}
                                    className={`${swapResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-400' : 'bg-green-500 dark:bg-green-400'} rounded-full text-white p-1`}
                                  >
                                    <MdClose size={20} />
                                  </button>
                                </div>
                              </Alert>
                              :
                              <ModalConfirm
                                onClick={() => {
                                  setTokenApproveResponse(null)
                                  setConfirmFeesCollapsed(true)
                                }}
                                buttonTitle={<>
                                  <span>Swap via</span>
                                  <Img
                                    src={protocols.find(p => p.id === 'nomad')?.image?.dark}
                                    alt=""
                                    className="h-6 sm:h-7"
                                  />
                                </>}
                                buttonClassName="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-2xl flex items-center justify-center text-white text-base sm:text-lg space-x-1 py-3 sm:py-4 px-2 sm:px-3"
                                title="Swap Confirmation"
                                body={<div className="flex flex-col space-y-4 -mb-2">
                                  <div className="flex items-center space-x-6 mx-auto pt-2 pb-1">
                                    <div className="flex flex-col items-center space-y-1">
                                      <Img
                                        src={fromChain?.image}
                                        alt=""
                                        className="w-10 h-10 rounded-full"
                                      />
                                      <span className="text-gray-400 dark:text-gray-600 font-medium">{chainTitle(fromChain)}</span>
                                    </div>
                                    <div className="flex flex-col items-center space-y-1">
                                      <Img
                                        src={protocols.find(p => p.id === 'nomad')?.image?.[theme]}
                                        alt=""
                                        className="h-6 sm:h-7"
                                      />
                                      <div className="h-4" />
                                    </div>
                                    <div className="flex flex-col items-center space-y-1">
                                      <Img
                                        src={toChain?.image}
                                        alt=""
                                        className="w-10 h-10 rounded-full"
                                      />
                                      <span className="text-gray-400 dark:text-gray-600 font-medium">{chainTitle(toChain)}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                                    <div className="flex items-center text-gray-400 dark:text-gray-600 text-lg md:text-sm lg:text-base">
                                      Receiving Address
                                      <span className="hidden sm:block">:</span>
                                    </div>
                                    {receivingAddress && (
                                      <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                                        {ens_data?.[receivingAddress.toLowerCase()]?.name && (
                                          <Img
                                            src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data?.[receivingAddress.toLowerCase()].name}`}
                                            alt=""
                                            className="w-6 h-6 rounded-full"
                                          />
                                        )}
                                        <span className="text-base sm:text-xs xl:text-base font-semibold">
                                          {ellipseAddress(ens_data?.[receivingAddress.toLowerCase()]?.name, 10) || ellipseAddress(receivingAddress, 10)}
                                        </span>
                                        <Copy size={18} text={receivingAddress} />
                                        {toChain?.explorer?.url && (
                                          <a
                                            href={`${toChain.explorer.url}${toChain.explorer.address_path?.replace('{address}', receivingAddress)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 dark:text-white"
                                          >
                                            {toChain.explorer.icon ?
                                              <Img
                                                src={toChain.explorer.icon}
                                                alt=""
                                                className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                                              />
                                              :
                                              <TiArrowRight size={20} className="transform -rotate-45" />
                                            }
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="h-1 border-t border-gray-200 dark:border-gray-600" />
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                                    <div className="flex items-center text-gray-400 dark:text-gray-600 text-lg md:text-sm lg:text-base">
                                      Send Amount
                                      <span className="hidden sm:block">:</span>
                                    </div>
                                    <div className="sm:text-right">
                                      <div className="font-mono text-lg font-semibold space-x-1.5">
                                        <span>{numberFormat(swapConfig.amount, '0,0.000000', true)}</span>
                                        <span>{fromContract?.symbol || fromAsset?.symbol}</span>
                                      </div>
                                      {swapConfig.amount && typeof tokenPrice === 'number' && (
                                        <div className="font-mono text-blue-500 sm:text-right">
                                          ({currency_symbol}{numberFormat(swapConfig.amount * tokenPrice, '0,0.00')})
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>}
                                cancelButtonTitle="Cancel"
                                cancelDisabled={startingSwap}
                                cancelButtonClassName="hidden"
                                confirmButtonTitle={<span className="flex items-center justify-center space-x-1.5 py-2">
                                  {startingSwap && (
                                    <TailSpin color={theme === 'dark' ? 'white' : 'white'} width="20" height="20" />
                                  )}
                                  <span className="text-base">{startingSwap ? 'Sending' : 'Confirm'}</span>
                                </span>}
                                confirmDisabled={startingSwap}
                                onConfirmHide={false}
                                onConfirm={() => swapNomad(fromChain, toChain, fromAsset, toAsset, fromContract, toContract)}
                                confirmButtonClassName="w-full btn btn-default btn-rounded bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-base sm:text-lg text-center"
                              />
                            :
                            !swapData && !(fromChainSynced && toChainSynced) ?
                              <Alert
                                color="bg-red-400 dark:bg-red-500 text-white text-base"
                                icon={<BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />}
                                closeDisabled={true}
                                rounded={true}
                              >
                                <span>
                                  {unsyncedChains.map((c, i) => (
                                    <span key={i} className="inline-flex items-baseline mr-1.5">
                                      <Img
                                        src={c.image}
                                        alt=""
                                        className="w-5 h-5 rounded-full self-center mr-1.5"
                                      />
                                      <span className="font-semibold">{chainTitle(c)}</span>
                                      {i < unsyncedChains.length - 1 && (
                                        <span className="ml-1.5">&</span>
                                      )}
                                    </span>
                                  ))}
                                  <span>subgraph{unsyncedChains.length > 1 ? 's' : ''} is out of sync. Please try again later.</span>
                                </span>
                              </Alert>
                              :
                              activeTransactionOpen ?
                                null
                                :
                                !swapData && !swapResponse && !estimatedAmountResponse && (estimatedAmount || estimatingAmount) ?
                                  <div>
                                    {!estimatingAmount && estimatedAmount && estimatedFees > confirmAmountReceived && (
                                      <div className="order-2 sm:col-span-5 flex items-center justify-center text-yellow-500 dark:text-yellow-400 space-x-1.5 mb-2">
                                        <TiWarning size={16} />
                                        <span>Fee is greater than estimated received.</span>
                                      </div>
                                    )}
                                    {estimatingAmount ?
                                      <button
                                        disabled={estimatingAmount}
                                        className={`w-full ${estimatingAmount ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'} rounded-2xl flex items-center justify-center text-white text-xs sm:text-lg space-x-1.5 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3`}
                                      >
                                        {estimatingAmount ?
                                          <>
                                            <TailSpin color={theme === 'dark' ? 'white' : 'white'} width="24" height="24" />
                                            <span>Searching Routes</span>
                                          </>
                                          :
                                          <span>Swap</span>
                                        }
                                        {estimatingAmount && typeof bidIntervalSeconds === 'number' && (
                                          <span className="font-mono text-white text-2xs sm:text-sm font-semibold">
                                            - Next bid in ({bidIntervalSeconds}s)
                                          </span>
                                        )}
                                      </button>
                                      :
                                      mustApproveToken ?
                                        (typeof tokenApproved === 'boolean' || tokenApproved) && (
                                          <button
                                            disabled={actionDisabled}
                                            onClick={() => approveToken()}
                                            className={`w-full ${actionDisabled ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'} rounded-2xl flex items-center justify-center text-white text-base sm:text-lg space-x-2 py-3 sm:py-4 px-2 sm:px-3`}
                                          >
                                            {tokenApproveResponse?.status === 'pending' ?
                                              <>
                                                <TailSpin color={theme === 'dark' ? 'white' : 'white'} width="24" height="24" />
                                                <span>Approving</span>
                                              </>
                                              :
                                              <span>Approve</span>
                                            }
                                            <span className="font-semibold">{fromContract?.symbol || fromAsset?.symbol}</span>
                                          </button>
                                        )
                                        :
                                        <ModalConfirm
                                          onClick={() => {
                                            setTokenApproveResponse(null)
                                            setConfirmFeesCollapsed(true)
                                          }}
                                          buttonTitle="Swap"
                                          buttonClassName="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-2xl flex items-center justify-center text-white text-base sm:text-lg space-x-1 py-3 sm:py-4 px-2 sm:px-3"
                                          title="Swap Confirmation"
                                          body={<div className="flex flex-col space-y-4 -mb-2">
                                            <div className="flex items-center space-x-6 mx-auto pt-2 pb-1">
                                              <div className="flex flex-col items-center space-y-1">
                                                <Img
                                                  src={confirmFromChain?.image}
                                                  alt=""
                                                  className="w-10 h-10 rounded-full"
                                                />
                                                <span className="text-gray-400 dark:text-gray-600 font-medium">{chainTitle(confirmFromChain)}</span>
                                              </div>
                                              <div className="flex flex-col items-center space-y-1">
                                                <Img
                                                  src={protocols.find(p => p.id === 'connext')?.image?.[theme]}
                                                  alt=""
                                                  className="w-10 h-10 rounded-full"
                                                />
                                                <div className="h-4" />
                                              </div>
                                              <div className="flex flex-col items-center space-y-1">
                                                <Img
                                                  src={confirmToChain?.image}
                                                  alt=""
                                                  className="w-10 h-10 rounded-full"
                                                />
                                                <span className="text-gray-400 dark:text-gray-600 font-medium">{chainTitle(confirmToChain)}</span>
                                              </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                                              <div className="flex items-center text-gray-400 dark:text-gray-600 text-lg md:text-sm lg:text-base">
                                                Receiving Address
                                                <span className="hidden sm:block">:</span>
                                              </div>
                                              {receivingAddress && (
                                                <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                                                  {ens_data?.[receivingAddress.toLowerCase()]?.name && (
                                                    <Img
                                                      src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data?.[receivingAddress.toLowerCase()].name}`}
                                                      alt=""
                                                      className="w-6 h-6 rounded-full"
                                                    />
                                                  )}
                                                  <span className="text-base sm:text-xs xl:text-base font-semibold">
                                                    {ellipseAddress(ens_data?.[receivingAddress.toLowerCase()]?.name, 10) || ellipseAddress(receivingAddress, 10)}
                                                  </span>
                                                  <Copy size={18} text={receivingAddress} />
                                                  {confirmToChain?.explorer?.url && (
                                                    <a
                                                      href={`${confirmToChain.explorer.url}${confirmToChain.explorer.address_path?.replace('{address}', receivingAddress)}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-blue-600 dark:text-white"
                                                    >
                                                      {confirmToChain.explorer.icon ?
                                                        <Img
                                                          src={confirmToChain.explorer.icon}
                                                          alt=""
                                                          className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                                                        />
                                                        :
                                                        <TiArrowRight size={20} className="transform -rotate-45" />
                                                      }
                                                    </a>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                                              <div className="flex items-center text-gray-400 dark:text-gray-600 text-lg md:text-sm lg:text-base">
                                                Router Address
                                                <span className="hidden sm:block">:</span>
                                              </div>
                                              <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                                                <span className="text-base sm:text-xs xl:text-base font-semibold">
                                                  {ens_data?.[estimatedAmount.bid?.router?.toLowerCase()]?.name || ellipseAddress(estimatedAmount.bid?.router?.toLowerCase(), 10)}
                                                </span>
                                                <Copy size={18} text={estimatedAmount.bid?.router} />
                                                <a
                                                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/router/${estimatedAmount.bid?.router?.toLowerCase()}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 dark:text-white"
                                                >
                                                  <TiArrowRight size={20} className="transform -rotate-45" />
                                                </a>
                                              </div>
                                            </div>
                                            <div className="h-1 border-t border-gray-200 dark:border-gray-600" />
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                                              <div className="flex items-center text-gray-400 dark:text-gray-600 text-lg md:text-sm lg:text-base">
                                                Send Amount
                                                <span className="hidden sm:block">:</span>
                                              </div>
                                              <div className="sm:text-right">
                                                <div className="font-mono text-lg font-semibold space-x-1.5">
                                                  <span>{numberFormat(confirmAmount, '0,0.000000', true)}</span>
                                                  <span>{confirmFromContract?.symbol || confirmFromAsset?.symbol}</span>
                                                </div>
                                                {confirmAmount && typeof confirmTokenPrice === 'number' && (
                                                  <div className="font-mono text-blue-500 sm:text-right">
                                                    ({currency_symbol}{numberFormat(confirmAmount * confirmTokenPrice, '0,0.00')})
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                                              <div className="flex items-center text-gray-400 dark:text-gray-600 text-lg md:text-sm lg:text-base">
                                                Fees
                                                <span className="hidden sm:block">:</span>
                                              </div>
                                              <div className="flex items-center space-x-1.5">
                                                <div className="w-full">
                                                  <button
                                                    onClick={() => setConfirmFeesCollapsed(!confirmFeesCollapsed)}
                                                    className="bg-transparent flex items-start text-sm space-x-1.5 sm:ml-auto"
                                                  >
                                                    {/* hotfix *//*confirmFeesCollapsed ?
                                                      <BiChevronRight size={20} className="text-gray-400 dark:text-gray-600 mt-1" />
                                                      :
                                                      <BiChevronUp size={20} className="text-gray-400 dark:text-gray-600 mt-1" />
                                                    */}
                                                    <div className="font-mono text-lg font-semibold space-x-1.5">
                                                      <span>{numberFormat(estimatedFees, '0,0.000000', true)}</span>
                                                      <span>{confirmToContract?.symbol || confirmToAsset?.symbol}</span>
                                                    </div>
                                                  </button>
                                                  {/* hotfix */false && !confirmFeesCollapsed && (
                                                    <div className="flex flex-col items-start sm:items-end py-1.5">
                                                      <div className="w-full grid grid-flow-row grid-cols-2 gap-1.5">
                                                        <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm mr-4">
                                                          Dest. TX
                                                          <Popover
                                                            placement="bottom"
                                                            title="Dest. TX"
                                                            content={<div className="w-48 text-xs">
                                                              Fee for relayer to deliver funds to user on receiving chain.
                                                            </div>}
                                                            titleClassName="normal-case py-1"
                                                          >
                                                            <BsQuestionCircle size={14} className="text-gray-400 dark:text-gray-600 ml-1.5" />
                                                          </Popover>
                                                        </span>
                                                        <div className="font-mono text-gray-400 dark:text-gray-600 text-sm text-right space-x-1">
                                                          <span>{numberFormat(confirmRelayerFee, '0,0.000000', true)}</span>
                                                          <span>{confirmToContract?.symbol || confirmToAsset?.symbol}</span>
                                                        </div>
                                                        <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm mr-4">
                                                          Gas Fee
                                                          <Popover
                                                            placement="bottom"
                                                            title="Gas Fee"
                                                            content={<div className="w-48 text-xs">
                                                              Covers gas expense for router transactions on sending and receiving chains."
                                                            </div>}
                                                            titleClassName="normal-case py-1"
                                                          >
                                                            <BsQuestionCircle size={14} className="text-gray-400 dark:text-gray-600 ml-1.5" />
                                                          </Popover>
                                                        </span>
                                                        <div className="font-mono text-gray-400 dark:text-gray-600 text-sm text-right space-x-1">
                                                          <span>{numberFormat(confirmGasFee, '0,0.000000', true)}</span>
                                                          <span>{confirmToContract?.symbol || confirmToAsset?.symbol}</span>
                                                        </div>
                                                        <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm mr-4">
                                                          LP Fee
                                                          <Popover
                                                            placement="bottom"
                                                            title="LP Fee"
                                                            content={<div className="w-44 text-xs">
                                                              Liquidity provider service fee.
                                                            </div>}
                                                            titleClassName="normal-case py-1"
                                                          >
                                                            <BsQuestionCircle size={14} className="text-gray-400 dark:text-gray-600 ml-1.5" />
                                                          </Popover>
                                                        </span>
                                                        <div className="font-mono text-gray-400 dark:text-gray-600 text-sm text-right space-x-1">
                                                          <span>{numberFormat(confirmRouterFee, '0,0.000000', true)}</span>
                                                          <span>{confirmToContract?.symbol || confirmToAsset?.symbol}</span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                  {estimatedFees && typeof confirmTokenPrice === 'number' && (
                                                    <div className="font-mono text-red-500 sm:text-right">
                                                      ({currency_symbol}{numberFormat(estimatedFees * confirmTokenPrice, '0,0.00')})
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-1 sm:space-y-0 sm:space-x-2 xl:space-x-2.5">
                                              <div className="flex items-center text-gray-400 dark:text-gray-600 text-lg sm:text-sm lg:text-base">
                                                Estimated Received
                                                <span className="hidden sm:block">:</span>
                                              </div>
                                              <div className="sm:text-right">
                                                <div className="font-mono text-lg font-semibold space-x-1.5">
                                                  <span>{numberFormat(confirmAmountReceived, '0,0.000000', true)}</span>
                                                  <span>{confirmToContract?.symbol || confirmToAsset?.symbol}</span>
                                                </div>
                                                {confirmAmountReceived && typeof confirmTokenPrice === 'number' && (
                                                  <div className="font-mono text-green-500 sm:text-right">
                                                    ({currency_symbol}{numberFormat(confirmAmountReceived * confirmTokenPrice, '0,0.00')})
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            {estimatedFees > confirmAmountReceived && (
                                              <div className="flex items-center text-base sm:text-lg font-medium space-x-1.5">
                                                <TiWarning size={20} className="text-yellow-500 dark:text-yellow-400" />
                                                <span>Are you sure that you want to swap?</span>
                                              </div>
                                            )}
                                          </div>}
                                          cancelButtonTitle="Cancel"
                                          cancelDisabled={startingSwap}
                                          cancelButtonClassName="hidden"
                                          confirmButtonTitle={<span className="flex items-center justify-center space-x-1.5 py-2">
                                            {startingSwap && (
                                              <TailSpin color={theme === 'dark' ? 'white' : 'white'} width="20" height="20" />
                                            )}
                                            <span className="text-base">{startingSwap ? 'Sending' : 'Confirm'}</span>
                                          </span>}
                                          confirmDisabled={startingSwap}
                                          onConfirmHide={false}
                                          onConfirm={() => swap()}
                                          confirmButtonClassName="w-full btn btn-default btn-rounded bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-base sm:text-lg text-center"
                                        />
                                    }
                                  </div>
                                  :
                                  !swapData && estimatedAmountResponse ?
                                    <Alert
                                      color={`${estimatedAmountResponse.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : estimatedAmountResponse.status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                                      icon={estimatedAmountResponse.status === 'failed' ? <BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> : estimatedAmountResponse.status === 'success' ? <BiMessageCheck className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> : <BiMessageDetail className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />}
                                      closeDisabled={true}
                                      rounded={true}
                                    >
                                      <div className="flex items-center justify-between space-x-2">
                                        <span className={`break-${isBreakAll(estimatedAmountResponse.message) ? 'all' : 'words'}`}>{estimatedAmountResponse.message}</span>
                                        <button
                                          onClick={() => setEstimateTrigger(moment().valueOf())}
                                          className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                                        >
                                          <BiRefresh size={20} />
                                        </button>
                                      </div>
                                    </Alert>
                                    :
                                    !swapData && swapResponse ?
                                      <Alert
                                        color={`${swapResponse.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : swapResponse.status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white text-base`}
                                        icon={swapResponse.status === 'failed' ? <BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> : swapResponse.status === 'success' ? <BiMessageCheck className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> : <BiMessageDetail className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />}
                                        closeDisabled={true}
                                        rounded={true}
                                      >
                                        <div className="flex items-center justify-between space-x-2">
                                          <span className={`break-${isBreakAll(swapResponse.message) ? 'all' : 'words'}`}>{swapResponse.message}</span>
                                          <button
                                            onClick={() => setEstimateTrigger(moment().valueOf())}
                                            className="bg-red-500 dark:bg-red-400 rounded-full flex items-center justify-center text-white p-1"
                                          >
                                            <BiRefresh size={20} />
                                          </button>
                                        </div>
                                      </Alert>
                                      :
                                      swapData ?
                                        <TransactionState
                                          data={swapData}
                                          onClose={() => {
                                            setActiveTransactionTrigger(true)
                                            reset()
                                          }}
                                          cancelDisabled={true}
                                          buttonTitle="View Transaction"
                                          buttonClassName="hidden w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-2xl text-white text-base sm:text-lg text-center py-3 sm:py-4 px-2 sm:px-3"
                                        />
                                        :
                                        estimateTrigger ?
                                          <Alert
                                            color="bg-blue-400 dark:bg-blue-500 text-left text-white"
                                            icon={<BiMessageDots className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />}
                                            closeDisabled={true}
                                            rounded={true}
                                          >
                                            <div className="flex items-center justify-between space-x-2">
                                              <span>Please wait a few seconds and refresh.</span>
                                              <button
                                                onClick={() => setEstimateTrigger(moment().valueOf())}
                                                className="bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center text-white p-1"
                                              >
                                                <BiRefresh size={20} />
                                              </button>
                                            </div>
                                          </Alert>
                                          :
                                          null
                  :
                  web3_provider ?
                    <button
                      disabled={true}
                      className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl cursor-not-allowed text-gray-400 dark:text-gray-600 text-base sm:text-lg text-center py-3 sm:py-4 px-2 sm:px-3"
                    >
                      Swap
                    </button>
                    :
                    <Wallet
                      chainIdToConnect={swapConfig.fromChainId}
                      buttonConnectTitle="Connect Wallet"
                      buttonConnectClassName="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-2xl text-white text-base sm:text-lg text-center py-3 sm:py-4 px-2 sm:px-3"
                    />
                }
              </div>
            </div>
            {!useNomad && isExceedMaxLiquidity && toChain?.optional_bridge_urls?.length > 0 && (
              <div className="text-yellow-500 dark:text-yellow-400 text-base sm:text-sm text-center">
                <span className="mr-1">Please try sending via</span>
                {toChain.optional_bridge_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold mr-1"
                  >
                    {new URL(url)?.hostname}
                  </a>
                ))}
              </div>
            )}
            {['testnet'].includes(process.env.NEXT_PUBLIC_NETWORK) && (
              <Faucets/>
            )}
          </div>
        </div>
        <div className="col-span-1 lg:col-span-2 mb-4">
          <ActiveTransactions
            setOpen={open => setActiveTransactionOpen(open)}
            trigger={activeTransactionTrigger}
          />
        </div>
      </div>
    </>
  )
}
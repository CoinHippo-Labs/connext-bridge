import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, Contract, FixedNumber, constants, utils } from 'ethers'
import { TailSpin, Oval, Watch } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { MdClose } from 'react-icons/md'
import { BiMessageError, BiMessageCheck, BiMessageDetail } from 'react-icons/bi'

import Announcement from '../announcement'
import GasPrice from '../gas-price'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import Balance from '../balance'
import Image from '../image'
import Wallet from '../wallet'
import Alert from '../alerts'
import Copy from '../copy'
import { currency_symbol } from '../../lib/object/currency'
import { params_to_obj, number_format, ellipse, equals_ignore_case, loader_color, sleep } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

const DEFAULT_POOL_SLIPPAGE_PERCENTAGE = Number(process.env.NEXT_PUBLIC_DEFAULT_POOL_SLIPPAGE_PERCENTAGE) || 0.5
const DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES = Number(process.env.NEXT_PUBLIC_DEFAULT_POOL_TRANSACTION_DEADLINE_MINUTES) || 60
const ACTIONS = ['add', 'remove']

export default () => {
  const dispatch = useDispatch()
  const { preferences, chains, assets, rpc_providers, dev, wallet, balances } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, rpc_providers: state.rpc_providers, dev: state.dev, wallet: state.wallet, balances: state.balances }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { rpcs } = { ...rpc_providers }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { chain_id, provider, web3_provider, address, signer } = { ...wallet_data }
  const { balances_data } = { ...balances }

  const router = useRouter()
  const { asPath } = { ...router }

  const [pool, setPool] = useState({})
  const [controller, setController] = useState(null)

  const [approving, setApproving] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [action, setAction] = useState(_.head(ACTIONS))
  const [calling, setCalling] = useState(null)
  const [callResponse, setCallResponse] = useState(null)

  const [poolsTrigger, setPoolsTrigger] = useState(null)

  // get pool from path
  useEffect(() => {
    let updated = false
    const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
    let path = !asPath ? '/' : asPath.toLowerCase()
    path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path
    if (path.includes('on-')) {
      const paths = path.replace('/', '').split('-')
      const chain = paths[paths.indexOf('on') + 1]
      const chain_data = chains_data?.find(c => c?.id === chain)
      const asset = paths[0] !== 'on' ? paths[0] : null
      const asset_data = assets_data?.find(a => a?.id === asset || equals_ignore_case(a?.symbol, asset))
      if (chain_data) {
        pool.chain = chain
        updated = true
      }
      if (asset_data) {
        pool.asset = asset
        updated = true
      }
      if (params?.amount) {
        pool.amount = Number(params.amount)
        updated = true
      }
    }
    if (updated) {
      setPool(pool)
    }
  }, [asPath, chains_data, assets_data])

  // set pool to path
  useEffect(() => {
    const params = {}
    if (pool) {
      const { chain, asset, amount } = { ...pool }
      if (chains_data?.findIndex(c => !c?.disabled && c?.id === chain) > -1) {
        params.chain = chain
        if (asset && assets_data?.findIndex(a => a?.id === asset && a.contracts?.findIndex(c => c?.chain_id === chains_data.find(_c => _c?.id === chain)?.chain_id) > -1) > -1) {
          params.asset = asset
        }
      }
      if (params.chain && params.asset && amount) {
        params.amount = amount
      }
    }
    if (Object.keys(params).length > 0) {
      const { chain, asset, amount } = { ...params }
      delete params.chain
      delete params.asset
      router.push(`/pool/${chain ? `${asset ? `${asset.toUpperCase()}-` : ''}on-${chain}` : ''}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`, undefined, { shallow: true })
    }
    setApproveResponse(null)
    setCallResponse(null)
  }, [address, pool])

  // update balances
  useEffect(() => {
    const { chain } = { ...pool }
    const _chain = chains_data?.find(c => c?.chain_id === chain_id)?.id
    if (asPath && _chain && !chain) {
      const params = params_to_obj(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      if (!params?.chain && !asPath.includes('on-') && chains_data?.findIndex(c => !c?.disabled && c?.id === _chain) > -1) {
        setPool({
          ...pool,
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
      const { chain } = { ...pool }
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
        const { chain } = { ...pool }
        getBalances(chain)
      }
    }
    getData()
    const interval = setInterval(() => getData(), 0.25 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [rpcs])

  const getBalances = chain => {
    const getBalance = async (chain_id, contract_data) => {
      const contract_address = contract_data?.contract_address 
      const decimals = contract_data?.contract_decimals || 18
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
            amount: balance ? Number(utils.formatUnits(balance, decimals)) : null,
          }],
        },
      })
    }
    const chain_id = chains_data?.find(c => c?.id === chain)?.chain_id
    const contracts = assets_data?.map(a => {
      return {
        ...a,
        ...a?.contracts?.find(c => c?.chain_id === chain_id),
      }
    }).filter(a => a?.contract_address)
    contracts?.forEach(c => getBalance(chain_id, c))
  }

  const checkSupport = () => {
    const { chain, asset } = { ...pool }
    const asset_data = assets_data?.find(a => a?.id === asset)
    return chain && asset_data &&
      !(asset_data.contracts?.findIndex(c => c?.chain_id === chains_data?.find(_c => _c?.id === chain)?.chain_id) < 0)
  }

  const reset = async origin => {
    const reset_pool = origin !== 'address'
    if (reset_pool) {
      setPool({
        ...pool,
        amount: null,
      })
    }

    setApproving(null)
    setApproveResponse(null)

    setCalling(null)
    setCallResponse(null)

    setPoolsTrigger(moment().valueOf())

    const { chain } = { ...pool }
    getBalances(chain)
  }

  const call = async () => {
    setCalling(true)
    let success = false
    if (sdk) {
      const { chain, asset, amount } = { ...pool }
      const chain_data = chains_data?.find(c => c?.id === chain)
      const asset_data = assets_data?.find(a => a?.id === asset)
      const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
      const symbol = contract_data?.symbol || asset_data?.symbol
      const decimals = contract_data?.contract_decimals || 18
      const callParams = {
      
      }
      let failed = false
      // try {
      //   const approve_request = await sdk.nxtpSdkBase.approveIfNeeded(xcallParams.params.originDomain, xcallParams.transactingAssetId, xcallParams.amount, infiniteApprove)
      //   if (approve_request) {
      //     setApproving(true)
      //     const approve_response = await signer.sendTransaction(approve_request)
      //     const tx_hash = approve_response?.hash
      //     setApproveResponse({ status: 'pending', message: `Wait for ${source_symbol} approval`, tx_hash })
      //     const approve_receipt = await signer.provider.waitForTransaction(tx_hash)
      //     setApproveResponse(approve_receipt?.status ?
      //       null : {
      //         status: 'failed',
      //         message: `Failed to approve ${source_symbol}`,
      //         tx_hash,
      //       }
      //     )
      //     failed = !approve_receipt?.status
      //     setApproving(false)
      //   }
      // } catch (error) {
      //   setApproveResponse({ status: 'failed', message: error?.data?.message || error?.message })
      //   failed = true
      //   setApproving(false)
      // }
      if (!failed) {
        // try {
        //   const xcall_request = await sdk.nxtpSdkBase.xcall(xcallParams)
        //   if (xcall_request) {
        //     let gas_limit = await signer.estimateGas(xcall_request)
        //     if (gas_limit) {
        //       gas_limit = FixedNumber.fromString(gas_limit.toString()).mulUnsafe(FixedNumber.fromString(GAS_LIMIT_ADJUSTMENT.toString())).round(0).toString().replace('.0', '');
        //       xcall_request.gasLimit = gas_limit
        //     }
        //     const xcall_response = await signer.sendTransaction(xcall_request)
        //     const tx_hash = xcall_response?.hash
        //     const xcall_receipt = await signer.provider.waitForTransaction(tx_hash)
        //     setXcall(xcall_receipt)
        //     failed = !xcall_receipt?.status
        //     setXcallResponse({
        //       status: failed ? 'failed' : 'success',
        //       message: failed ? 'Failed to send transaction' : `${source_symbol} transfer detected, waiting for execution.`,
        //       tx_hash,
        //     })
        //     success = true
        //   }
        // } catch (error) {
        //   setXcallResponse({ status: 'failed', message: error?.data?.message || error?.message })
        //   failed = true
        // }
      }
    }
    setCalling(false)
    if (sdk && address && success) {
      await sleep(2 * 1000)
      setPoolsTrigger(moment().valueOf())
    }
  }

  const { chain, asset, amount } = { ...pool }
  const chain_data = chains_data?.find(c => c?.id === chain)
  const asset_data = assets_data?.find(a => a?.id === asset)
  const native_contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
  const nomad_contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)  

  const native_balance = balances_data?.[chain_data?.chain_id]?.find(b => equals_ignore_case(b?.contract_address, native_contract_data?.contract_address))
  const native_amount = native_balance && Number(native_balance.amount)
  const native_symbol = native_contract_data?.symbol || asset_data?.symbol
  const nomad_balance = balances_data?.[chain_data?.chain_id]?.find(b => equals_ignore_case(b?.contract_address, nomad_contract_data?.contract_address))
  const nomad_amount = nomad_balance && Number(nomad_balance.amount)
  const nomad_decimals = nomad_contract_data?.contract_decimals || 18
  const nomad_symbol = nomad_contract_data?.symbol || asset_data?.symbol

  const max_amount = native_amount

  const wrong_chain = chain_data && chain_id !== chain_data.chain_id && !calling
  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'

  const disabled = calling || approving

  return (
    <div className="flex justify-center my-4">
      <div className="mt-8">
        <Announcement />
      </div>
      <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 my-6 mx-4">
        
      </div>
    </div>
  )
}
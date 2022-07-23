import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import moment from 'moment'
import { BigNumber, Contract, FixedNumber, constants, utils } from 'ethers'
import { RiArrowLeftCircleFill } from 'react-icons/ri'

import Announcement from '../announcement'
import Info from './info'
import Liquidity from './liquidity'
import { currency_symbol } from '../../lib/object/currency'
import { params_to_obj, number_format, ellipse, equals_ignore_case, sleep } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const { preferences, chains, assets, _pools, rpc_providers, dev, wallet, balances } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, _pools: state.pools, rpc_providers: state.rpc_providers, dev: state.dev, wallet: state.wallet, balances: state.balances }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { pools_data } = { ..._pools }
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
  const [approveProcessing, setApproveProcessing] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [calling, setCalling] = useState(null)
  const [callProcessing, setCallProcessing] = useState(null)
  const [callResponse, setCallResponse] = useState(null)

  const [pools, setPools] = useState(null)
  const [poolsTrigger, setPoolsTrigger] = useState(null)

  // get pool from path
  useEffect(() => {
    let updated = false
    const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
    let path = !asPath ? '/' : asPath.toLowerCase()
    path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path
    if (path.includes('on-')) {
      const paths = path.replace('/pool/', '').split('-')
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
      setPoolsTrigger(moment().valueOf())
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

  // get pools
  useEffect(() => {
    const getData = async () => {
      if (sdk && address && pool?.chain) {
        try {
          const { chain } = { ...pool }
          const chain_data = chains_data.find(c => c?.id === chain)
          const { domain_id } = { ...chain_data }
          const response = await sdk.nxtpSdkPool.getUserPools(domain_id, address)
          setPools(response?.map(p => {
            const { symbol } = { ...p }
            const asset_data = assets_data.find(a => equals_ignore_case(a?.symbol, symbol) || a?.contracts?.findIndex(c => c?.chain_id === chain_data?.chain_id && equals_ignore_case(c?.symbol, symbol)) > -1)
            return {
              ...p,
              chain_data,
              asset_data,
            }
          }) || pools || [])
        } catch (error) {}
      }
    }
    getData()
  }, [sdk, address, poolsTrigger])

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
    setApproveProcessing(null)
    setApproveResponse(null)

    setCalling(null)
    setCallProcessing(null)
    setCallResponse(null)

    setPoolsTrigger(moment().valueOf())

    const { chain } = { ...pool }
    getBalances(chain)
  }

  const { chain, asset, amount } = { ...pool }
  const chain_data = chains_data?.find(c => c?.id === chain)
  const asset_data = assets_data?.find(a => a?.id === asset)
  const poolData = {
    ...pool,
    ...pools?.find(p => p?.chain_data?.id === chain && p?.asset_data?.id === asset),
  }
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
    <div className="mb-4">
      <div className="flex justify-center">
        <div className="mt-4 sm:mt-8">
          <Announcement />
        </div>
        <div className="w-full flex flex-col space-y-4 my-6 my-4 sm:my-6 mx-1 sm:mx-4">
          <div className="flex items-center space-x-3">
            {/*<Link href="/pools">
              <a className="text-blue-400 hover:text-blue-600 dark:text-slate-200 dark:hover:text-white">
                <RiArrowLeftCircleFill size={36} />
              </a>
            </Link>*/}
            <h1 className="text-2xl font-bold">
              Manage Pool
            </h1>
          </div>
          <div className={`${poolData ? '' : 'h-188'} grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-6`}>
            <div className="lg:col-span-2">
              <Info
                pool={pool}
                data={poolData}
                onSelect={p => setPool(p)}
              />
            </div>
            <Liquidity
              data={poolData}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
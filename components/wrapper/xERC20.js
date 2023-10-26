import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Contract, constants } from 'ethers'
const { MaxUint256 } = { ...constants }
import moment from 'moment'
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'

import Spinner from '../spinner'
import Alert from '../alert'
import Balance from '../balance'
import Image from '../image'
import Wallet from '../wallet'
import { getChainData, getAssetData, getContractData, getBalanceData } from '../../lib/object'
import { parseUnits, isNumber } from '../../lib/number'
import { numberToFixed, parseError } from '../../lib/utils'

const ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount)',
  'function deposit(uint256 _amount) external',
  'function withdraw(uint256 _amount)',
]

const getInputFields = () => [
  {
    label: 'Amount',
    name: 'amount',
    type: 'number',
    placeholder: 'Amount to wrap / unwrap',
  },
]

export default (
  {
    tokenId = 'next',
    contractData,
    titleClassName = '',
    className = '',
  },
) => {
  const { chains, assets, wallet, balances } = useSelector(state => ({ chains: state.chains, assets: state.assets, wallet: state.wallet, balances: state.balances }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { chain_id, ethereum_provider, signer, address } = { ...wallet_data }
  const { balances_data } = { ...balances }

  const [data, setData] = useState(null)
  const [collapse, setCollapse] = useState(true)
  const [minting, setMinting] = useState(null)
  const [mintResponse, setMintResponse] = useState(null)
  const [withdrawing, setWithdrawing] = useState(null)
  const [withdrawResponse, setWithdrawResponse] = useState(null)
  const [trigger, setTrigger] = useState(moment().valueOf())

  useEffect(
    () => {
      if (chain_id && address) {
        const { chain } = { ...data }
        const { id } = { ...getChainData(chain_id, chains_data) }
        setData({ ...data, chain: id || chain, address: data ? data.address : address })
      }
    },
    [chain_id, address],
  )

  useEffect(
    () => {
      setMintResponse(null)
      setWithdrawResponse(null)
    },
    [data],
  )

  const { chain } = { ...data }
  const asset_data = getAssetData(tokenId, assets_data)
  const { contracts } = { ...asset_data }
  const { symbol } = { ...asset_data }

  const chain_data = getChainData(contractData?.chain_id || chain, chains_data)
  const { explorer, image } = { ...chain_data }
  const { url, transaction_path } = { ...explorer }

  const { contract_address, xERC20, decimals } = { ...(contractData || getContractData(chain_data?.chain_id, contracts)) }

  const mint = async () => {
    setMinting(true)
    setMintResponse(null)
    setWithdrawing(false)
    setWithdrawResponse(null)

    try {
      const contract_data = contractData || getContractData(chain_id, contracts)
      const { contract_address, lockbox, decimals } = { ...contract_data }
      const _amount = parseUnits(data?.amount, decimals)
      const token = new Contract(contract_address, ABI, signer)
      let failed
      const allowance = await token.allowance(address, lockbox)
      if (allowance.lt(MaxUint256)) {
        try {
          const tx = await token.approve(lockbox, MaxUint256)
          await tx.wait()
        } catch (error) {
          failed = true
        }
      }

      if (!failed) {
        console.log('[wrap]', { contract_address: lockbox, amount: _amount })
        const contract = new Contract(lockbox, ABI, signer)
        const response = await contract.deposit(_amount)
        const { hash } = { ...response }
        const receipt = await signer.provider.waitForTransaction(hash)
        const { status } = { ...receipt }

        setMintResponse({
          status: !status ? 'failed' : 'success',
          message: !status ? 'Failed to wrap' : 'Wrap Successful',
          ...response,
        })
      }
    } catch (error) {
      const response = parseError(error)
      console.log('[wrap error]', error)
      const { code } = { ...response }
      let { message } = { ...response }
      if (message?.includes('gas required exceeds')) {
        message = 'Insufficient balance when trying to wrap.'
      }
      switch (code) {
        case 'user_rejected':
          break
        default:
          setMintResponse({ status: 'failed', ...response, message })
          break
      }
    }

    setMinting(false)
    setTrigger(moment().valueOf())
  }

  const withdraw = async () => {
    setWithdrawing(true)
    setWithdrawResponse(null)
    setMinting(false)
    setMintResponse(null)

    try {
      const contract_data = contractData || getContractData(chain_id, contracts)
      const { xERC20, decimals, lockbox } = { ...contract_data }
      const _amount = parseUnits(data?.amount, decimals)

      console.log('[unwrap]', { contract_address: xERC20, amount: _amount })
      const contract = new Contract(lockbox, ABI, signer)
      const response = await contract.withdraw(_amount)
      const { hash } = { ...response }
      const receipt = await signer.provider.waitForTransaction(hash)
      const { status } = { ...receipt }

      setWithdrawResponse({
        status: !status ? 'failed' : 'success',
        message: !status ? 'Failed to unwrap' : 'Unwrap Successful',
        ...response,
      })
    } catch (error) {
      const response = parseError(error)
      console.log('[unwrap error]', error)
      const { code } = { ...response }
      let { message } = { ...response }
      if (message?.includes('gas required exceeds')) {
        message = 'Insufficient balance when trying to unwrap.'
      }
      switch (code) {
        case 'user_rejected':
          break
        default:
          setWithdrawResponse({ status: 'failed', ...response, message })
          break
      }
    }

    setWithdrawing(false)
    setTrigger(moment().valueOf())
  }

  const fields = getInputFields()
  const has_all_fields = fields.length === fields.filter(f => data?.[f.name]).length

  const native_amount = getBalanceData(chain_data?.chain_id, contract_address, balances_data)?.amount
  const wrapped_amount = getBalanceData(chain_data?.chain_id, xERC20, balances_data)?.amount
  const wrap_disabled = !!(isNumber(native_amount) && isNumber(data?.amount) && (Number(native_amount) < Number(data.amount) || Number(data.amount) <= 0))
  const unwrap_disabled = !!(isNumber(wrapped_amount) && isNumber(data?.amount) && (Number(wrapped_amount) < Number(data.amount) || Number(data.amount) <= 0))

  const callResponse = mintResponse || withdrawResponse
  const { status, message, hash } = { ...callResponse }
  const disabled = minting || withdrawing
  const is_walletconnect = ethereum_provider?.constructor?.name === 'WalletConnectProvider'

  return asset_data && (
    <div className={className || 'w-full max-w-md 3xl:max-w-xl bg-white dark:bg-slate-900 rounded border dark:border-slate-800 flex flex-col items-center justify-center space-y-2 mx-auto p-3 sm:p-6 3xl:p-8'}>
      <button
        onClick={() => setCollapse(!collapse)}
        className={`w-full flex items-center justify-center text-base font-semibold space-x-1.5 ${titleClassName}`}
      >
        {!signer && (
          <span className="whitespace-nowrap text-xs sm:text-base 3xl:text-2xl font-medium">
            Connect wallet to
          </span>
        )}
        <span className="whitespace-nowrap text-xs sm:text-base 3xl:text-2xl font-medium">
          {`Wrap or unwrap ${symbol}`}
        </span>
        {collapse ? <BiChevronDown size={18} /> : <BiChevronUp size={18} />}
      </button>
      {!collapse && (
        <div className="w-full 3xl:space-y-8">
          {signer && (
            <div className="form-element mt-2">
              <div className="form-label text-slate-600 dark:text-slate-200 font-medium">
                Balance
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Balance
                  chainId={contractData?.chain_id || chain_id}
                  asset={tokenId}
                  contractAddress={contract_address}
                  decimals={decimals || asset_data?.decimals}
                  symbol={symbol}
                  trigger={trigger}
                  className="bg-slate-100 dark:bg-slate-800 rounded py-1.5 px-2.5"
                />
                <Balance
                  chainId={contractData?.chain_id || chain_id}
                  asset={tokenId}
                  contractAddress={xERC20}
                  decimals={decimals || asset_data?.decimals}
                  symbol={`x${symbol}`}
                  trigger={trigger}
                  className="bg-slate-100 dark:bg-slate-800 rounded py-1.5 px-2.5"
                />
              </div>
            </div>
          )}
          {fields.map((f, i) => {
            const { label, name, type, placeholder } = { ...f }
            return (
              <div key={i} className="form-element 3xl:space-y-2">
                {label && (
                  <div className="form-label text-slate-600 dark:text-slate-200 3xl:text-xl font-medium">
                    {label}
                  </div>
                )}
                <input
                  type={type}
                  disabled={disabled}
                  placeholder={placeholder}
                  value={data?.[name]}
                  onChange={
                    e => {
                      let value
                      if (type === 'number') {
                        const regex = /^[0-9.\b]+$/
                        if (e.target.value === '' || regex.test(e.target.value)) {
                          value = e.target.value
                        }
                        if (typeof value === 'string') {
                          if (value.startsWith('.')) {
                            value = `0${value}`
                          }
                          value = numberToFixed(value)
                        }
                      }
                      else {
                        value = e.target.value
                      }
                      setData({ ...data, [f.name]: value })
                    }
                  }
                  className="form-input rounded border-0 focus:ring-0 3xl:text-2xl"
                />
              </div>
            )
          })}
          {signer && has_all_fields && (
            <div className="flex justify-end space-x-2 mb-2">
              <button
                disabled={disabled}
                onClick={
                  () => {
                    const { id } = { ...getChainData(chain_id, chains_data) }
                    setData({ ...data, chain: id, address })
                    setCollapse(!collapse)
                  }
                }
                className={`bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900 ${disabled ? 'cursor-not-allowed' : ''} rounded font-medium py-2 px-3`}
              >
                Cancel
              </button>
              {chain_data?.chain_id !== chain_id ?
                <Wallet
                  connectChainId={chain_data?.chain_id}
                  className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 ${disabled ? 'cursor-not-allowed' : ''} rounded flex items-center text-white text-sm font-medium space-x-1.5 py-2 px-3`}
                >
                  <span>{is_walletconnect ? 'Reconnect' : 'Switch'} to</span>
                  {image && (
                    <Image
                      src={image}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                  <span className="font-medium">
                    {chain_data?.name}
                  </span>
                </Wallet> :
                <>
                  <button
                    disabled={disabled || wrap_disabled}
                    onClick={() => mint()}
                    className={`${disabled || wrap_disabled ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} rounded flex items-center text-white font-semibold space-x-1.5 py-2 px-3`}
                  >
                    {minting && <div><Spinner width={18} height={18} color="white" /></div>}
                    <span>Wrap</span>
                  </button>
                  <button
                    disabled={disabled || unwrap_disabled}
                    onClick={() => withdraw()}
                    className={`${disabled || unwrap_disabled ? 'bg-red-400 dark:bg-red-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} rounded flex items-center text-white font-semibold space-x-1.5 py-2 px-3`}
                  >
                    {withdrawing && <div><Spinner width={18} height={18} color="white" /></div>}
                    <span>Unwrap</span>
                  </button>
                </>
              }
            </div>
          )}
        </div>
      )}
      {callResponse && (
        <div className="w-full mx-2 sm:mx-4">
          <Alert status={status} className="text-white mt-1 mb-2 mx-0">
            <div className="flex flex-wrap items-center justify-between">
              <span className="break-all leading-5 text-sm font-medium mr-1">
                {message}
              </span>
              {status === 'success' && hash && url && (
                <a
                  href={`${url}${transaction_path?.replace('{tx}', hash)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pr-1.5"
                >
                  <span className="whitespace-nowrap font-semibold">
                    View on {explorer.name}
                  </span>
                </a>
              )}
            </div>
          </Alert>
        </div>
      )}
    </div>
  )
}
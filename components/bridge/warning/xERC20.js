import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { useSwitchNetwork } from 'wagmi'
import { Contract } from 'ethers'
import moment from 'moment'
import { IoWarning } from 'react-icons/io5'

import Spinner from '../../spinner'
import Alert from '../../alert'
import Modal from '../../modal'
import { getChainData, getBalanceData } from '../../../lib/object'
import { parseUnits } from '../../../lib/number'
import { equalsIgnoreCase, parseError } from '../../../lib/utils'
import { GET_BALANCES_DATA } from '../../../reducers/types'

const AMOUNT_THRESHOLD = 0
const ABI = [
  'function withdraw(uint256 _amount)',
]

export default ({ asset, contract }) => {
  const { chains, balances, wallet } = useSelector(state => ({ chains: state.chains, balances: state.balances, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { balances_data } = { ...balances }
  const { wallet_data } = { ...wallet }
  const { signer } = { ...wallet_data }
  const wallet_chain_id = wallet_data?.chain_id

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { bridge } = { ...query }

  const [hidden, setHidden] = useState(false)
  const [networkSwitched, setNetworkSwitched] = useState(false)
  const [withdrawing, setWithdrawing] = useState(null)
  const [withdrawProcessing, setWithdrawProcessing] = useState(null)
  const [withdrawResponse, setWithdrawResponse] = useState(null)
  const [trigger, setTrigger] = useState(null)

  const { switchNetwork } = useSwitchNetwork()

  useEffect(
    () => {
      if (chain_id && contract_address && trigger) {
        const contract_data = { contract_address, chain_id, decimals, symbol }
        dispatch({ type: GET_BALANCES_DATA, value: { chain: chain_id, contract_data } })
      }
    },
    [trigger],
  )

  useEffect(
    () => {
      if (networkSwitched && chain_id && wallet_chain_id === chain_id) {
        withdraw()
      }
    },
    [networkSwitched, wallet_chain_id],
  )

  const withdraw = async () => {
    setWithdrawResponse(null)

    try {
      if (chain_id && wallet_chain_id !== chain_id) {
        switchNetwork(chain_id)
        setNetworkSwitched(true)
      }
      else {
        setNetworkSwitched(false)
        setWithdrawing(true)
        const { xERC20, decimals, lockbox } = { ...contract }
        const _amount = parseUnits(amount, decimals)

        console.log('[unwrap]', { contract_address: xERC20, amount: _amount })
        const lockbox_contract = new Contract(lockbox, ABI, signer)
        const response = await lockbox_contract.withdraw(_amount)
        const { hash } = { ...response }

        setWithdrawProcessing(true)
        const receipt = await signer.provider.waitForTransaction(hash)
        const { status } = { ...receipt }

        setWithdrawProcessing(false)
        setWithdrawResponse({
          status: !status ? 'failed' : 'success',
          message: !status ? 'Failed to unwrap' : 'Unwrap Successful',
          ...response,
        })
        if (status) {
          setTrigger(moment().valueOf())
          setHidden(true)
        }
      }
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
      setWithdrawProcessing(false)
    }

    setWithdrawing(false)
  }

  const { symbol } = { ...asset }
  const { contract_address, chain_id, decimals, xERC20 } = { ...contract }
  const { amount } = { ...getBalanceData(chain_id, xERC20, balances_data) }

  const { explorer } = { ...getChainData(chain_id, chains_data) }
  const { url, transaction_path } = { ...explorer }

  const { status, message, hash } = { ...withdrawResponse }
  const disabled = withdrawing

  return symbol && xERC20 && (
    !equalsIgnoreCase(contract_address, xERC20) ?
      Number(amount) > AMOUNT_THRESHOLD && (
        <Modal
          hidden={hidden}
          title={
            <div className="flex items-center justify-between">
              <span className="normal-case font-medium">
                {`It looks like you did not complete a previous ${symbol} transfer, so you currently have bridgeable x${symbol} in your wallet. Would you like to finish transferring x${symbol}?`}
              </span>
            </div>
          }
          body={
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Link href={`${pathname.replace('[bridge]', bridge)}?symbol=x${symbol}&amount=${amount}`} className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded ${disabled ? 'pointer-events-none' : ''} flex items-center justify-center text-white py-1.5 px-2`}>
                  <span className="whitespace-nowrap text-xs">
                    Yes, complete transfer
                  </span>
                </Link>
                <button
                  disabled={disabled}
                  onClick={() => withdraw()}
                  className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded ${disabled ? 'pointer-events-none' : ''} flex items-center justify-center text-white space-x-1.5 py-1.5 px-2`}
                >
                  {withdrawing && <div><Spinner width={14} height={14} color="white" /></div>}
                  <span className="whitespace-nowrap text-xs">
                    {withdrawing ? withdrawProcessing ? 'Unwrapping' : 'Please Confirm' : `No, unwrap back to ${symbol}`}
                  </span>
                </button>
              </div>
              {withdrawResponse && (
                <div className="w-full">
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
          }
          noCancelOnClickOutside={true}
          noButtons={true}
          onClose={() => setHidden(true)}
          modalClassName="max-w-md"
        />
      ) :
      Number(amount) > AMOUNT_THRESHOLD && (
        <div className="flex items-start space-x-1.5 3xl:space-x-2.5 mb-1.5">
          <IoWarning size={16} className="min-w-max 3xl:w-5 3xl:h-5 text-yellow-500 dark:text-yellow-400" />
          <div className="text-yellow-500 dark:text-yellow-400 text-xs 3xl:text-xl">
            {`You have a x${symbol} balance (bridgeable ${symbol}) in your wallet because a previous ${symbol} transfer was incomplete. Please complete the transfer of x${symbol} or unwrap back to ${symbol}.`}
          </div>
        </div>
      )
  )
}
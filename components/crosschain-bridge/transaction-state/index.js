import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { constants } from 'ethers'
import { Img } from 'react-image'
import Loader from 'react-loader-spinner'
import Pulse from 'react-reveal/Pulse'
import { MdOutlineRouter, MdPending } from 'react-icons/md'
import { TiArrowRight } from 'react-icons/ti'
import { FaCheckCircle, FaClock, FaTimesCircle, FaQuestion } from 'react-icons/fa'
import { BsFillCheckSquareFill, BsFillXSquareFill } from 'react-icons/bs'

import Wallet from '../../wallet'
import Notification from '../../notifications'
import Modal from '../../modals/modal-confirm'
import Copy from '../../copy'

import { transactions as getTransactions } from '../../../lib/api/subgraph'
import { domains } from '../../../lib/api/ens'
import { chainTitle } from '../../../lib/object/chain'
import { ellipseAddress } from '../../../lib/utils'

import { ENS_DATA } from '../../../reducers/types'

export default function TransactionState({ data, defaultHidden = false, buttonTitle, buttonClassName, onClose, cancelDisabled, onFinish }) {
  const dispatch = useDispatch()
  const { chains, assets, tokens, ens, wallet, sdk, preferences } = useSelector(state => ({ chains: state.chains, assets: state.assets, tokens: state.tokens, ens: state.ens, wallet: state.wallet, sdk: state.sdk, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { tokens_data } = { ...tokens }
  const { ens_data } = { ...ens }
  const { wallet_data } = { ...wallet }
  const { provider, web3_provider, chain_id, address } = { ...wallet_data }
  const { sdk_data } = { ...sdk }
  const { theme } = { ...preferences }

  const [hidden, setHidden] = useState(defaultHidden)
  const [transaction, setTransaction] = useState(null)

  const [fulfilling, setFulfilling] = useState(false)
  const [fulfillResponse, setFulfillResponse] = useState(null)

  const [cancelling, setCancelling] = useState(false)
  const [cancelResponse, setCancelResponse] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (data?.transactionId && chains_data) {
        const { transactionId, sendingChainId, receivingChainId } = { ...data }

        let sendingTx, receivingTx

        let response = await getTransactions({ chain_id: chains_data?.find(_chain => _chain.chain_id === sendingChainId)?.id }, chains_data, tokens_data, transactionId)
        sendingTx = response?.data?.[0]

        response = await getTransactions({ chain_id: chains_data?.find(_chain => _chain.chain_id === receivingChainId)?.id }, chains_data, tokens_data, transactionId)
        receivingTx = response?.data?.[0]

        getDomain((receivingTx || sendingTx)?.router?.id)
        getDomain(address)
        getDomain((receivingTx || sendingTx)?.sendingAddress)
        getDomain((receivingTx || sendingTx)?.receivingAddress)

        setTransaction({ transactionId, sendingChainId, receivingChainId, sendingTx, receivingTx })

        const finish = [sendingTx?.status, receivingTx?.status].includes('Cancelled') || ['Fulfilled'].includes(generalTx?.status)

        if (finish) {
          setFulfillResponse(null)
          setCancelResponse(null)

          if (onFinish) {
            onFinish()
          }
        }
      }
    }

    getData()

    const interval = setInterval(() => getData(), 15 * 1000)
    return () => clearInterval(interval)
  }, [data])

  const getDomain = async address => {
    if (address && !ens_data?.[address.toLowerCase()]) {
      const response = await domains({ where: `{ resolvedAddress_in: ["${address.toLowerCase()}"] }` })

      if (response?.data) {
        dispatch({
          type: ENS_DATA,
          value: Object.fromEntries(response.data.map(domain => [domain?.resolvedAddress?.id?.toLowerCase(), { ...domain }])),
        })
      }
    }
  }

  const fulfill = async txData => {
    setFulfilling(true)
    setFulfillResponse(null)

    if (sdk_data && txData) {
      try {
        setFulfillResponse({ status: 'pending', message: 'Wait for Claiming', tx_hash: response?.hash || response?.transactionHash, ...response })
      
        const response = await sdk_data.fulfillTransfer({
          txData: {
            ...txData,
            user: txData.user?.id,
            router: txData.router?.id,
            preparedBlockNumber: Number(txData.preparedBlockNumber),
            expiry: txData.expiry / 1000,
          },
          encryptedCallData: txData.encryptedCallData,
          encodedBid: txData.encodedBid,
          bidSignature: txData.bidSignature,
        })

        setFulfillResponse({ status: 'pending', message: 'Wait for Claiming Confirmation', tx_hash: response?.hash || response?.transactionHash, ...response })
      } catch (error) {
        setFulfillResponse({ status: 'failed', message: error?.message })
      }
    }

    setFulfilling(false)
  }

  const cancel = async (txData, _chain_id) => {
    setCancelling(true)
    setCancelResponse(null)

    if (sdk_data && txData) {
      try {
        const signature = '0x'

        const response = await sdk_data.cancel({
          txData: {
            ...txData,
            user: txData.user?.id,
            router: txData.router?.id,
            preparedBlockNumber: Number(txData.preparedBlockNumber),
            expiry: txData.expiry / 1000,
          },
          signature,
        }, _chain_id)

        setCancelResponse({ status: 'pending', message: 'Wait for Cancellation Confirmation', tx_hash: response?.hash, ...response })
      } catch (error) {
        setCancelResponse({ status: 'failed', message: error?.message })
      }
    }

    setCancelling(false)
  }

  const addTokenToMetaMask = async (_asset, _chain_id) => {
    if (_asset) {
      try {
        const response = await provider.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: _asset.contract_address || _asset?.contracts?.find(_contract => _contract.chain_id === _chain_id)?.contract_address,
              symbol: _asset.contract_ticker_symbol || _asset.symbol,
              decimals: _asset.contract_decimals || _asset?.contracts?.find(_contract => _contract.chain_id === _chain_id)?.contract_decimals,
              image: _asset.image || _.last(_asset.logo_url),
            },
          },
        })
      } catch (error) {}
    }
  }

  const { sendingTx, receivingTx } = { ...transaction }
  const generalTx = _.last([sendingTx, receivingTx].filter(tx => tx))

  const fromChain = chains_data?.find(_chain => _chain?.chain_id === generalTx?.sendingChainId || _chain?.chain_id === data?.sendingChainId)
  const toChain = chains_data?.find(_chain => _chain?.chain_id === generalTx?.receivingChainId || _chain?.chain_id === data?.receivingChainId)

  const toAsset = (assets_data?.find(_asset => _asset?.contracts?.find(_contract => _contract?.chain_id === generalTx?.receivingChainId && _contract?.contract_address === generalTx?.receivingAssetId)) || generalTx?.receivingAsset) && { ...assets_data?.find(_asset => _asset?.contracts?.find(_contract => _contract?.chain_id === generalTx?.receivingChainId && _contract?.contract_address === generalTx?.receivingAssetId)), ...generalTx?.receivingAsset }

  const loaded = data?.transactionId && transaction?.transactionId === data.transactionId && generalTx

  const finish = [sendingTx?.status, receivingTx?.status].includes('Cancelled') || ['Fulfilled'].includes(generalTx?.status)

  const canCancelSender = ['Prepared'].includes(sendingTx?.status) && moment().valueOf() >= sendingTx.expiry

  const actionDisabled = fulfilling || cancelling || cancelResponse?.status === 'pending' || fulfillResponse?.status === 'pending'

  const fulfillButton = (
    <button
      type="button"
      disabled={actionDisabled}
      onClick={() => fulfill(receivingTx)}
      className={`w-full max-w-md rounded-lg shadow-lg flex items-center justify-center ${actionDisabled ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed text-gray-200' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-gray-100 hover:text-white'} text-base sm:text-lg space-x-1.5 mx-auto py-4 px-3`}
    >
      {(fulfilling || fulfillResponse?.status === 'pending') && (
        <Loader type="Oval" color={theme === 'dark' ? '#FFFFFF' : '#FFFFFF'} width="24" height="24" />
      )}
      {!(fulfilling || fulfillResponse?.status === 'pending') && (
        <span className="font-light">Sign to</span>
      )}
      <span className="font-semibold">Claim{fulfilling || fulfillResponse?.status === 'pending' ? 'ing' : ''} Funds</span>
    </button>
  )

  return (
    <>
      <Modal
        hidden={hidden}
        buttonTitle={buttonTitle}
        onClick={() => setHidden(false)}
        buttonClassName={buttonClassName}
        title={<div className="flex items-center">
          <span className="whitespace-nowrap text-gray-400 dark:text-gray-600 text-sm sm:text-base font-medium mr-2">TX ID:</span>
          <div className="flex items-center space-x-1.5 mr-2">
            {transaction && (
              <>
                <a
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transaction.transactionId?.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 dark:text-gray-100 text-sm sm:text-base font-semibold"
                >
                  {ellipseAddress(transaction.transactionId?.toLowerCase(), 12)}
                </a>
                <Copy size={16} text={transaction.transactionId?.toLowerCase()} />
              </>
            )}
          </div>
          {transaction?.transactionId && (
            <a
              href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transaction.transactionId.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-indigo-600 dark:text-white text-sm font-semibold space-x-0 ml-auto"
            >
              <span className="hidden sm:block">View TX</span>
              <TiArrowRight size={20} className="transform -rotate-45" />
            </a>
          )}
        </div>}
        body={<div className="space-y-4 mt-1">
          <div className="overflow-x-scroll flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 mt-2">
            {loaded ?
              generalTx?.sendingAddress ?
                <div className="min-w-max">
                  <div className="flex items-center space-x-1.5">
                    <a
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${generalTx.sendingAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="text-gray-700 dark:text-gray-200 text-base sm:text-sm lg:text-base font-medium">
                        {ellipseAddress(ens_data?.[generalTx.sendingAddress?.toLowerCase()]?.name, 10) || ellipseAddress(generalTx.sendingAddress?.toLowerCase(), 6)}
                      </span>
                    </a>
                    <Copy size={18} text={generalTx.sendingAddress} />
                    {generalTx.sendingChain?.explorer?.url && (
                      <a
                        href={`${generalTx.sendingChain.explorer.url}${generalTx.sendingChain.explorer.address_path?.replace('{address}', generalTx.sendingAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-white"
                      >
                        {generalTx.sendingChain.explorer.icon ?
                          <Img
                            src={generalTx.sendingChain.explorer.icon}
                            alt=""
                            className="w-5 h-5 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={20} className="transform -rotate-45" />
                        }
                      </a>
                    )}
                  </div>
                  {generalTx.sendingChain && (
                    <div className="flex items-center justify-center sm:justify-start space-x-2 mt-1">
                      {generalTx.sendingChain.image && (
                        <img
                          src={generalTx.sendingChain.image}
                          alt=""
                          className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                        />
                      )}
                      <span className="text-gray-700 dark:text-gray-300 text-lg sm:text-base lg:text-lg font-semibold">{chainTitle(generalTx.sendingChain)}</span>
                    </div>
                  )}
                </div>
                :
                <span className="text-gray-400 dark:text-gray-600 font-light">Unknown</span>
              :
              data?.sendingChainId && data.prepareResponse?.from ?
                <div className="min-w-max">
                  <div className="flex items-center space-x-1.5">
                    <a
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${data.prepareResponse.from.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="text-gray-700 dark:text-gray-200 text-base sm:text-sm lg:text-base font-medium">
                        {ellipseAddress(ens_data?.[data.prepareResponse.from?.toLowerCase()]?.name, 10) || ellipseAddress(data.prepareResponse.from?.toLowerCase(), 6)}
                      </span>
                    </a>
                    <Copy size={18} text={data.prepareResponse.from.toLowerCase()} />
                    {fromChain?.explorer?.url && (
                      <a
                        href={`${fromChain.explorer.url}${fromChain.explorer.address_path?.replace('{address}', data.prepareResponse.from.toLowerCase())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-white"
                      >
                        {fromChain.explorer.icon ?
                          <Img
                            src={fromChain.explorer.icon}
                            alt=""
                            className="w-5 h-5 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={20} className="transform -rotate-45" />
                        }
                      </a>
                    )}
                  </div>
                  {fromChain && (
                    <div className="flex items-center justify-center sm:justify-start space-x-2 mt-1">
                      {fromChain.image && (
                        <img
                          src={fromChain.image}
                          alt=""
                          className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                        />
                      )}
                      <span className="text-gray-700 dark:text-gray-300 text-lg sm:text-base lg:text-lg font-semibold">{chainTitle(fromChain)}</span>
                    </div>
                  )}
                </div>
                :
                <div>
                  <div className="skeleton w-36 h-6 mt-1" />
                  <div className="skeleton w-20 h-6 lg:h-7 mt-2.5 mx-auto sm:mx-0" />
                </div>
            }
            <div className="mx-auto">
              <TiArrowRight size={24} className="transform rotate-90 sm:rotate-0 text-gray-400 dark:text-gray-600" />
            </div>
            <div className="flex flex-col items-center">
              {loaded ?
                <>
                  <div className={`max-w-min h-7 rounded-xl flex items-center bg-${sendingTx?.status ? ['Fulfilled'].includes(sendingTx.status) ? 'green-600' : ['Prepared'].includes(sendingTx.status) ? 'yellow-500' : 'red-700' : sendingTx?.chainId && chains_data?.findIndex(_chain => !_chain.disabled && _chain.chain_id === sendingTx?.chainId) < 0 ? 'gray-700' : 'indigo-500'} text-white space-x-1 py-1.5 px-2`}>
                    {sendingTx?.status ?
                      ['Fulfilled'].includes(sendingTx.status) ?
                        <FaCheckCircle size={14} />
                        :
                        ['Prepared'].includes(sendingTx.status) ?
                          <MdPending size={14} />
                          :
                          <FaTimesCircle size={14} />
                      :
                      sendingTx?.chainId && chains_data?.findIndex(_chain => !_chain.disabled && _chain.chain_id === sendingTx?.chainId) < 0 ?
                        <FaQuestion size={14} />
                        :
                        <Loader type="Puff" color={theme === 'dark' ? '#F9FAFB' : '#F9FAFB'} width="16" height="16" />
                    }
                    <div className="uppercase text-white text-xs font-semibold">
                      {sendingTx?.status || (
                        sendingTx?.chainId && chains_data?.findIndex(_chain => !_chain.disabled && _chain.chain_id === sendingTx?.chainId) ?
                          'Unknown'
                          :
                          'Preparing'
                        )
                      }
                    </div>
                  </div>
                  {sendingTx?.chainTx && sendingTx?.sendingChain?.explorer?.url && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Copy
                        size={12}
                        text={sendingTx.chainTx}
                        copyTitle={<span className="text-gray-400 dark:text-gray-400 text-xs font-normal">
                          {ellipseAddress(sendingTx.chainTx, 6)}
                        </span>}
                      />
                      <a
                        href={`${sendingTx.sendingChain.explorer.url}${sendingTx.sendingChain.explorer.transaction_path?.replace('{tx}', sendingTx.chainTx)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-white"
                      >
                        {sendingTx.sendingChain?.explorer?.icon ?
                          <Img
                            src={sendingTx.sendingChain.explorer.icon}
                            alt=""
                            className="w-4 sm:w-3 xl:w-4 h-4 sm:h-3 xl:h-4 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={16} className="transform -rotate-45" />
                        }
                      </a>
                    </div>
                  )}
                </>
                :
                <>
                  <div className="skeleton w-16 h-6 mt-1" />
                  {/*<div className="skeleton w-24 h-4 mt-2.5" />*/}
                  <div className="flex items-center text-gray-400 dark:text-gray-400 text-xs font-medium space-x-1 mt-0.5">
                    <span>fetching</span>
                    <span className="sm:hidden lg:block">status</span>
                    <Loader type="ThreeDots" color={theme === 'dark' ? '#9CA3AF' : '#9CA3AF'} width="16" height="16" className="mt-1" />
                  </div>
                </>
              }
            </div>
            <div className="mx-auto">
              <TiArrowRight size={24} className="transform rotate-90 sm:rotate-0 text-gray-400 dark:text-gray-600" />
            </div>
            <div className="flex flex-col items-center">
              <div className="min-w-max grid grid-flow-row grid-cols-3 gap-2 sm:mt-0 lg:-mt-2">
                {/*loaded ?
                  generalTx?.sendingChain && (
                    <Img
                      src={generalTx.sendingChain.image}
                      alt=""
                      className="w-6 sm:w-5 lg:w-6 h-6 sm:h-5 lg:h-6 rounded-full"
                    />
                  )
                  :
                  fromChain ?
                    <Img
                      src={fromChain.image}
                      alt=""
                      className="w-6 sm:w-5 lg:w-6 h-6 sm:h-5 lg:h-6 rounded-full"
                    />
                    :
                    <div className="skeleton w-6 sm:w-5 lg:w-6 h-6 sm:h-5 lg:h-6" style={{ borderRadius: '100%' }} />
                */}
                <span />
                <Img
                  src="/logos/connext/logo.png"
                  alt=""
                  className="w-8 sm:w-6 lg:w-10 h-8 sm:h-6 lg:h-10 rounded-full"
                />
                {/*loaded ?
                  generalTx?.receivingChain && (
                    <Img
                      src={generalTx.receivingChain.image}
                      alt=""
                      className="w-6 sm:w-5 lg:w-6 h-6 sm:h-5 lg:h-6 rounded-full"
                    />
                  )
                  :
                  toChain ?
                    <Img
                      src={toChain.image}
                      alt=""
                      className="w-6 sm:w-5 lg:w-6 h-6 sm:h-5 lg:h-6 rounded-full"
                    />
                    :
                    <div className="skeleton w-6 sm:w-5 lg:w-6 h-6 sm:h-5 lg:h-6" style={{ borderRadius: '100%' }} />
                */}
              </div>
              {generalTx?.router?.id && (
                ens_data?.[generalTx.router.id.toLowerCase()]?.name ?
                  <>
                    <div className="flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs font-medium space-x-1 mt-0.5">
                      <MdOutlineRouter size={16} className="mb-0.5" />
                      <a
                        href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/router/${generalTx.router.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {ens_data[generalTx.router.id.toLowerCase()].name}
                        </span>
                      </a>
                    </div>
                    <div className="flex justify-center">
                      <Copy
                        text={generalTx.router.id}
                        copyTitle={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">
                          {ellipseAddress(generalTx.router.id, 6)}
                        </span>}
                      />
                    </div>
                  </>
                  :
                  <>
                    <div className="flex items-center font-medium space-x-1 mt-0">
                      <a
                        href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/router/${generalTx.router.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="text-gray-400 dark:text-white text-xs font-medium">
                          {ellipseAddress(generalTx.router.id, 6)}
                        </span>
                      </a>
                      <Copy size={12} text={generalTx.router.id} />
                    </div>
                    <div className="flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs font-medium space-x-1 mt-0">
                      <MdOutlineRouter size={16} className="mb-0.5" />
                      <span>Router</span>
                    </div>
                  </>
              )}
            </div>
            <div className="mx-auto">
              <TiArrowRight size={24} className="transform rotate-90 sm:rotate-0 text-gray-400 dark:text-gray-600" />
            </div>
            <div className="flex flex-col items-center">
              {loaded ?
                <>
                  <div className={`min-w-max max-w-min h-7 rounded-xl flex items-center bg-${receivingTx?.status ? ['Fulfilled'].includes(receivingTx.status) ? 'green-600' : ['Prepared'].includes(receivingTx.status) ? 'yellow-500' : 'red-700' : sendingTx?.status === 'Cancelled' ? 'red-700' : receivingTx?.chainId && chains_data?.findIndex(_chain => !_chain.disabled && _chain.chain_id === receivingTx?.chainId) < 0 ? 'gray-700' : 'indigo-500'} text-white space-x-1 py-1.5 px-2`}>
                    {receivingTx?.status ?
                      ['Fulfilled'].includes(receivingTx.status) ?
                        <FaCheckCircle size={14} />
                        :
                        ['Prepared'].includes(receivingTx.status) ?
                          <MdPending size={14} />
                          :
                          <FaTimesCircle size={14} />
                      :
                      sendingTx?.status === 'Cancelled' ?
                        <FaTimesCircle size={14} />
                        :
                        receivingTx?.chainId && chains_data?.findIndex(_chain => !_chain.disabled && _chain.chain_id === receivingTx?.chainId) < 0 ?
                          <FaQuestion size={14} />
                          :
                          <Loader type="Puff" color={theme === 'dark' ? '#F9FAFB' : '#F9FAFB'} width="16" height="16" />
                    }
                    <div className="uppercase text-white text-xs font-semibold">
                      {receivingTx?.status ?
                        receivingTx.status
                        :
                        sendingTx?.status === 'Cancelled' ?
                          'Ignored'
                          :
                          receivingTx?.chainId && chains_data?.findIndex(_chain => !_chain.disabled && _chain.chain_id === receivingTx?.chainId) < 0 ?
                            'Unknown'
                            :
                            'Pending'
                      }
                    </div>
                  </div>
                  {receivingTx?.chainTx && receivingTx?.receivingChain?.explorer?.url && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Copy
                        size={12}
                        text={receivingTx.chainTx}
                        copyTitle={<span className="text-gray-400 dark:text-gray-400 text-xs font-normal">
                          {ellipseAddress(receivingTx.chainTx, 6)}
                        </span>}
                      />
                      <a
                        href={`${receivingTx.receivingChain.explorer.url}${receivingTx.receivingChain.explorer.transaction_path?.replace('{tx}', receivingTx.chainTx)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-white"
                      >
                        {receivingTx.receivingChain?.explorer?.icon ?
                          <Img
                            src={receivingTx.receivingChain.explorer.icon}
                            alt=""
                            className="w-4 sm:w-3 xl:w-4 h-4 sm:h-3 xl:h-4 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={16} className="transform -rotate-45" />
                        }
                      </a>
                    </div>
                  )}
                </>
                :
                <>
                  <div className="skeleton w-16 h-6 mt-1" />
                  {/*<div className="skeleton w-24 h-4 mt-2.5" />*/}
                  <div className="flex items-center text-gray-400 dark:text-gray-400 text-xs font-medium space-x-1 mt-0.5">
                    <span>fetching</span>
                    <span className="sm:hidden lg:block">status</span>
                    <Loader type="ThreeDots" color={theme === 'dark' ? '#9CA3AF' : '#9CA3AF'} width="16" height="16" className="mt-1" />
                  </div>
                </>
              }
            </div>
            <div className="mx-auto">
              <TiArrowRight size={24} className="transform rotate-90 sm:rotate-0 text-gray-400 dark:text-gray-600" />
            </div>
            {loaded ?
              generalTx?.receivingAddress ?
                <div className="min-w-max">
                  <div className="flex items-center space-x-1.5">
                    <a
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${generalTx.receivingAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="text-gray-700 dark:text-gray-200 text-base sm:text-sm lg:text-base font-medium">
                        {ellipseAddress(ens_data?.[generalTx.receivingAddress?.toLowerCase()]?.name, 10) || ellipseAddress(generalTx.receivingAddress?.toLowerCase(), 6)}
                      </span>
                    </a>
                    <Copy size={18} text={generalTx.receivingAddress} />
                    {generalTx.receivingChain?.explorer?.url && (
                      <a
                        href={`${generalTx.receivingChain.explorer.url}${generalTx.receivingChain.explorer.address_path?.replace('{address}', generalTx.receivingAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-white"
                      >
                        {generalTx.receivingChain.explorer.icon ?
                          <Img
                            src={generalTx.receivingChain.explorer.icon}
                            alt=""
                            className="w-5 h-5 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={20} className="transform -rotate-45" />
                        }
                      </a>
                    )}
                  </div>
                  {generalTx.receivingChain && (
                    <div className="flex items-center justify-center sm:justify-end space-x-2 mt-1">
                      {generalTx.receivingChain.image && (
                        <Img
                          src={generalTx.receivingChain.image}
                          alt=""
                          className="w-8 sm:w-6 xl:w-8 h-8 sm:h-6 xl:h-8 rounded-full"
                        />
                      )}
                      <span className="text-gray-700 dark:text-gray-300 text-lg sm:text-base lg:text-lg font-semibold">{chainTitle(generalTx.receivingChain)}</span>
                    </div>
                  )}
                </div>
                :
                <span className="text-gray-400 dark:text-gray-600 font-light sm:text-right">Unknown</span>
              :
              /*data?.receivingChainId && data.prepareResponse?.to ?
                <div className="min-w-max">
                  <div className="flex items-center space-x-1.5">
                    <a
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${data.prepareResponse.to.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="text-gray-700 dark:text-gray-200 text-base sm:text-sm lg:text-base font-medium">
                        {ellipseAddress(ens_data?.[data.prepareResponse.to?.toLowerCase()]?.name, 10) || ellipseAddress(data.prepareResponse.to?.toLowerCase(), 6)}
                      </span>
                    </a>
                    <Copy size={18} text={data.prepareResponse.to.toLowerCase()} />
                    {toChain?.explorer?.url && (
                      <a
                        href={`${toChain.explorer.url}${toChain.explorer.address_path?.replace('{address}', data.prepareResponse.to.toLowerCase())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-white"
                      >
                        {toChain.explorer.icon ?
                          <Img
                            src={toChain.explorer.icon}
                            alt=""
                            className="w-5 h-5 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={20} className="transform -rotate-45" />
                        }
                      </a>
                    )}
                  </div>
                  {toChain && (
                    <div className="flex items-center justify-center sm:justify-end space-x-2 mt-1">
                      {toChain.image && (
                        <img
                          src={toChain.image}
                          alt=""
                          className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                        />
                      )}
                      <span className="text-gray-700 dark:text-gray-300 text-lg sm:text-base lg:text-lg font-semibold">{chainTitle(toChain)}</span>
                    </div>
                  )}
                </div>
                :*/
                <div>
                  <div className="skeleton w-36 h-6 mt-1" />
                  {toChain && (
                    <div className="flex items-center justify-center sm:justify-end space-x-2 mt-1">
                      {toChain.image && (
                        <img
                          src={toChain.image}
                          alt=""
                          className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                        />
                      )}
                      <span className="text-gray-700 dark:text-gray-300 text-lg sm:text-base lg:text-lg font-semibold">{chainTitle(toChain)}</span>
                    </div>
                  )}
                  {/*<div className="skeleton w-20 h-6 lg:h-7 mt-2.5 mx-auto sm:mr-0" />*/}
                </div>
            }
          </div>
          {web3_provider && loaded && !finish && [sendingTx?.status, receivingTx?.status].includes('Prepared') && (['Prepared'].includes(receivingTx?.status) || canCancelSender) && (
            <div className="flex flex-col space-y-3 py-4">
              {(canCancelSender ? sendingTx : receivingTx) && address?.toLowerCase() !== (canCancelSender ? sendingTx?.sendingAddress?.toLowerCase() : receivingTx?.sendingAddress?.toLowerCase()) ?
                <span className="min-w-max flex flex-col text-gray-400 dark:text-gray-500 text-center mx-auto">
                  <span>Address not match.</span>
                  <span className="flex items-center">
                    (Your<span className="hidden sm:block ml-1">connected addr</span>: {ellipseAddress(ens_data?.[address?.toLowerCase()]?.name, 10) || ellipseAddress(address?.toLowerCase(), 6)})
                  </span>
                </span>
                :
                <>
                  {['Prepared'].includes(receivingTx?.status) && (
                    actionDisabled ?
                      fulfillButton
                      :
                      <Pulse duration={1500} forever>
                        {fulfillButton}
                      </Pulse>
                  )}
                  {(['Prepared'].includes(receivingTx?.status) || canCancelSender) && (
                    chain_id !== (canCancelSender ? generalTx?.sendingChainId : generalTx?.receivingChainId) ?
                      <Wallet
                        chainIdToConnect={canCancelSender ? generalTx?.sendingChainId : generalTx?.receivingChainId}
                        disabled={actionDisabled}
                        buttonDisconnectTitle={<>
                          <span className="font-medium">Cancel</span>
                          <Img
                            src={(canCancelSender ? fromChain : toChain)?.image}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="font-light">Transaction</span>
                        </>}
                        buttonDisconnectClassName={`w-auto bg-gray-100 dark:bg-gray-800 rounded-lg shadow flex items-center justify-center ${actionDisabled ? 'cursor-not-allowed text-gray-600 dark:text-gray-400' : ''} text-sm sm:text-base space-x-1.5 mx-auto py-2.5 px-3`}
                      />
                      :
                      <button
                        type="button"
                        disabled={actionDisabled}
                        onClick={() => cancel(canCancelSender ? sendingTx : receivingTx, canCancelSender ? generalTx?.sendingChainId : generalTx?.receivingChainId)}
                        className={`w-auto bg-gray-100 dark:bg-gray-800 rounded-lg shadow flex items-center justify-center ${actionDisabled ? 'cursor-not-allowed text-gray-600 dark:text-gray-400' : ''} text-sm sm:text-base space-x-1.5 mx-auto py-2.5 px-3`}
                      >
                        {(cancelling || cancelResponse?.status === 'pending') && (
                          <Loader type="Oval" color={theme === 'dark' ? '#FFFFFF' : '#6B7280'} width="16" height="16" />
                        )}
                        <span className="font-medium">Cancel{cancelling || cancelResponse?.status === 'pending' ? 'ling' : ''}</span>
                        <span className="font-light">Transaction</span>
                      </button>
                  )}
                </>
              }
            </div>
          )}
          {loaded && finish && (
            <div className="flex flex-col items-center space-y-5 py-6">
              {['Fulfilled'].includes(generalTx?.status) ?
                <FaCheckCircle size={48} className="text-green-500 dark:text-white" />
                :
                [sendingTx?.status, receivingTx?.status].includes('Cancelled') ?
                  <FaTimesCircle size={48} className="text-gray-300 dark:text-white" />
                  :
                  null
              }
              <div className="flex flex-col items-center space-y-1">
                {['Fulfilled'].includes(generalTx?.status) ?
                  <span className="text-lg font-medium">Claimed successful</span>
                  :
                  [sendingTx?.status, receivingTx?.status].includes('Cancelled') ?
                    <span className="text-lg font-medium">Cancelled successful</span>
                    :
                    null
                }
                {transaction?.transactionId && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transaction.transactionId.toLowerCase()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-indigo-600 dark:text-blue-600 text-base font-semibold space-x-0"
                  >
                    <span>View on Explorer</span>
                    <TiArrowRight size={24} className="transform -rotate-45 mt-0.4" />
                  </a>
                )}
              </div>
              {toAsset && ![toAsset.contract_address, toAsset.contracts?.find(_contract => _contract.chain_id === generalTx?.receivingChainId)?.contract_address].includes(constants.AddressZero) && (
                chain_id !== generalTx?.receivingChainId ?
                  <Wallet
                    chainIdToConnect={generalTx?.receivingChainId}
                    buttonDisconnectTitle={<>
                      <span>Add</span>
                      <span className={`${toAsset?.contract_ticker_symbol || toAsset?.symbol ? 'font-bold' : ''}`}>{toAsset?.contract_ticker_symbol || toAsset?.symbol || 'Token'}</span>
                      <span>to</span>
                      <span className="pr-0.5">MetaMask</span>
                      <Img
                        src="/logos/wallets/metamask.png"
                        alt=""
                        className="w-5 h-5"
                      />
                    </>}
                    buttonDisconnectClassName="w-auto bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center text-sm font-medium space-x-1.5 py-2.5 px-3"
                  />
                  :
                  <button
                    onClick={() => addTokenToMetaMask(toAsset)}
                    className="w-auto bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center text-sm font-medium space-x-1.5 py-2.5 px-3"
                  >
                    <span>Add</span>
                    <span className={`${toAsset?.contract_ticker_symbol || toAsset?.symbol ? 'font-bold' : ''}`}>{toAsset?.contract_ticker_symbol || toAsset?.symbol || 'Token'}</span>
                    <span>to</span>
                    <span className="pr-0.5">MetaMask</span>
                    <Img
                      src="/logos/wallets/metamask.png"
                      alt=""
                      className="w-5 h-5"
                    />
                  </button>
              )}
            </div>
          )}
          <div className="space-y-2">
            {/*<div className="font-semibold">
              You will need to sign 3 messages:
            </div>*/}
            <div className="space-y-1.5">
              <div className="flex items-start space-x-1.5">
                <BsFillCheckSquareFill size={20} className="text-green-500" />
                <span className="text-gray-900 dark:text-gray-400">Approve Token{/*Signature to approve token*/}</span>
              </div>
              <div className="flex items-start space-x-1.5">
                <BsFillCheckSquareFill size={20} className="text-green-500" />
                <span className="text-gray-900 dark:text-gray-400">Send Transaction{/*Transaction to send funds across chains*/}</span>
              </div>
              <div className="flex items-start space-x-1.5">
                {['Fulfilled'].includes(generalTx?.status) ?
                  <BsFillCheckSquareFill size={20} className="text-green-500" />
                  :
                  [sendingTx?.status, receivingTx?.status].includes('Cancelled') ?
                    <BsFillXSquareFill size={20} className="text-red-500" />
                    :
                    <Loader type={['Prepared'].includes(receivingTx?.status) ? 'Puff' : 'Rings'} color={theme === 'dark' ? '#F9FAFB' : '#9CA3AF'} width="20" height="20" />
                }
                <span className="text-gray-900 dark:text-gray-400">Sign to Claim{/*Signature to claim your Connext transaction on the destination chain*/}</span>
              </div>
            </div>
          </div>
          {transaction?.transactionId && !finish && !['Prepared'].includes(receivingTx?.status) && (
            <div className="space-y-2">
              <div className="flex items-center font-mono font-semibold space-x-1.5">
                <span className="text-indigo-600 dark:text-white">Transaction in progress</span>
                <Loader type="ThreeDots" width="20" color={theme === 'dark' ? '#F9FAFB' : '#4F46E5'} height="20" className="mt-1" />
              </div>
              <div className="font-mono text-gray-400 dark:text-gray-400">
                Please do not close this tab while the transaction is in progress. If you do, you will need to open up xpollinate again to manually claim your transaction.
              </div>
              <div className="font-mono text-gray-400 dark:text-gray-400">
                <span className="mr-2">Your transfer will automatically end up at your destination address once it is picked up and propagated by Connext's network. You can track its progress above or on</span>
                <a
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transaction.transactionId.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-indigo-600 dark:text-white font-semibold"
                >
                  ConnextScan
                </a>.
              </div>
            </div>
          )}
        </div>}
        cancelDisabled={cancelDisabled && !finish}
        onClose={() => {
          if (onClose) {
            onClose()
          }

          setHidden(true)
        }}
        noButtons={true}
        modalClassName="sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-screen lg:max-h-full overflow-y-scroll px-4 sm:px-0"
      />
      {fulfillResponse && !finish && (
        <Notification
          hideButton={true}
          onClose={() => setFulfillResponse(null)}
          outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
          innerClassNames={`${fulfillResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-600' : fulfillResponse.status === 'success' ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-600 dark:bg-blue-700'} text-white`}
          animation="animate__animated animate__fadeInDown"
          icon={fulfillResponse.status === 'failed' ?
            <FaTimesCircle className="w-4 h-4 stroke-current mr-2" />
            :
            fulfillResponse.status === 'success' ?
              <FaCheckCircle className="w-4 h-4 stroke-current mr-2" />
              :
              <FaClock className="w-4 h-4 stroke-current mr-2" />
          }
          content={<span className="flex flex-wrap items-center">
            <span className="mr-1.5">{fulfillResponse.message}</span>
            {fulfillResponse.status === 'pending' && (
              <Loader type="ThreeDots" color={theme === 'dark' ? '#FFFFFF' : '#FFFFFF'} width="16" height="16" className="mt-1 mr-1.5" />
            )}
            {toChain?.explorer?.url && fulfillResponse.tx_hash && (
              <a
                href={`${toChain.explorer.url}${toChain.explorer.transaction_path?.replace('{tx}', fulfillResponse.tx_hash)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center font-semibold"
              >
                <span>View on {toChain.explorer.name}</span>
                <TiArrowRight size={20} className="transform -rotate-45" />
              </a>
            )}
          </span>}
        />
      )}
      {cancelResponse && !finish && (
        <Notification
          hideButton={true}
          onClose={() => setCancelResponse(null)}
          outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
          innerClassNames={`${cancelResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-600' : cancelResponse.status === 'success' ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-600 dark:bg-blue-700'} text-white`}
          animation="animate__animated animate__fadeInDown"
          icon={cancelResponse.status === 'failed' ?
            <FaTimesCircle className="w-4 h-4 stroke-current mr-2" />
            :
            cancelResponse.status === 'success' ?
              <FaCheckCircle className="w-4 h-4 stroke-current mr-2" />
              :
              <FaClock className="w-4 h-4 stroke-current mr-2" />
          }
          content={<span className="flex flex-wrap items-center">
            <span className="mr-1.5">{cancelResponse.message}</span>
            {cancelResponse.status === 'pending' && (
              <Loader type="ThreeDots" color={theme === 'dark' ? '#FFFFFF' : '#FFFFFF'} width="16" height="16" className="mt-1 mr-1.5" />
            )}
            {(canCancelSender ? fromChain : toChain)?.explorer?.url && cancelResponse.tx_hash && (
              <a
                href={`${(canCancelSender ? fromChain : toChain).explorer.url}${(canCancelSender ? fromChain : toChain).explorer.transaction_path?.replace('{tx}', cancelResponse.tx_hash)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center font-semibold"
              >
                <span>View on {(canCancelSender ? fromChain : toChain).explorer.name}</span>
                <TiArrowRight size={20} className="transform -rotate-45" />
              </a>
            )}
          </span>}
        />
      )}
    </>
  )
}
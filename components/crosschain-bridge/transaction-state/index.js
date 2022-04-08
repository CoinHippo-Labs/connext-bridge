import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Web3 from 'web3'
import { providers, constants, utils } from 'ethers'
import BigNumber from 'bignumber.js'
import { Img } from 'react-image'
import { TailSpin, Puff, Bars, Triangle, Oval } from 'react-loader-spinner'
import Pulse from 'react-reveal/Pulse'
import Flip from 'react-reveal/Flip'
import LightSpeed from 'react-reveal/LightSpeed'
import { MdOutlineRouter } from 'react-icons/md'
import { TiArrowRight, TiWarning } from 'react-icons/ti'
import { FaCheckCircle, FaRegCheckCircle, FaClock, FaTimesCircle, FaQuestion } from 'react-icons/fa'
import { BsFillCheckCircleFill, BsFillXCircleFill } from 'react-icons/bs'

import Wallet from '../../wallet'
import Notification from '../../notifications'
import Modal from '../../modals/modal-confirm'
import Copy from '../../copy'
import Popover from '../../popover'

import { transactions } from '../../../lib/api/subgraph'
import { domains, getENS } from '../../../lib/api/ens'
import { chainTitle } from '../../../lib/object/chain'
import { numberFormat, ellipseAddress } from '../../../lib/utils'

import { ENS_DATA, WALLET_DATA } from '../../../reducers/types'

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function TransactionState({ defaultHidden = false, data, onClose, onFinish, cancelDisabled, buttonTitle, buttonClassName }) {
  const dispatch = useDispatch()
  const { preferences, chains, assets, tokens, ens, sdk, rpcs, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, tokens: state.tokens, ens: state.ens, sdk: state.sdk, rpcs: state.rpcs, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { tokens_data } = { ...tokens }
  const { ens_data } = { ...ens }
  const { sdk_data } = { ...sdk }
  const { rpcs_data } = { ...rpcs }
  const { wallet_data } = { ...wallet }
  const { provider, web3_provider, chain_id, address } = { ...wallet_data }

  const [hidden, setHidden] = useState(defaultHidden)
  const [transaction, setTransaction] = useState(null)
  const [routerBalance, setRouterBalance] = useState(null)
  const [transfering, setTransfering] = useState(null)
  const [transferResponse, setTransferResponse] = useState(null)
  const [web3, setWeb3] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [addTokenData, setAddTokenData] = useState(null)

  const { sendingTx, receivingTx } = { ...transaction }
  const generalTx = _.last([sendingTx, receivingTx].filter(t => t))

  useEffect(() => {
    if (!web3) {
      setWeb3(new Web3(Web3.givenProvider))
    }
    else {
      try {
        web3.currentProvider._handleChainChanged = async e => {
          try {
            setChainId(Web3.utils.hexToNumber(e?.chainId))

            const web3Provider = new providers.Web3Provider(provider)
            const signer = web3Provider.getSigner()
            const address = await signer.getAddress()

            dispatch({
              type: WALLET_DATA,
              value: {
                web3_provider: web3Provider,
                signer,
                chain_id: Web3.utils.hexToNumber(e?.chainId),
                address,
              },
            })
          } catch (error) {}
        }
      } catch (error) {}
    }
  }, [web3, provider])

  useEffect(() => {
    if (addTokenData?.chain_id === chainId && addTokenData?.contract) {
      addTokenToMetaMask(addTokenData.chain_id, addTokenData.contract)
    }
  }, [chainId, addTokenData])

  useEffect(() => {
    const getData = async is_interval => {
      if (data?.transactionId && chains_data) {
        const { transactionId, sendingChainId, receivingChainId } = { ...data }
        let sendingTx, receivingTx, response

        response = await transactions(sdk_data, sendingChainId, transactionId, null, chains_data, tokens_data)
        sendingTx = response?.data?.[0]
        response = await transactions(sdk_data, receivingChainId, transactionId, null, chains_data, tokens_data)
        receivingTx = response?.data?.[0]

        if (sdk_data && sendingTx?.amount/* && !receivingTx.relayerFee*/) {
          try {
            response = await sdk_data.getEstimateReceiverAmount({
              amount: sendingTx.amount,
              sendingChainId: receivingTx.sendingChainId,
              sendingAssetId: receivingTx.sendingAssetId,
              receivingChainId: receivingTx.receivingChainId,
              receivingAssetId: receivingTx.receivingAssetId,
            })

            if (response?.relayerFee && !receivingTx.relayerFee) {
              receivingTx.relayerFee = response.relayerFee
            }
            if (response?.receiverAmount) {
              receivingTx.estimateReceiverAmount = response.receiverAmount
            }
          } catch (error) {}
        }

        setTransaction({ transactionId, sendingChainId, receivingChainId, sendingTx, receivingTx })

        const finish = [sendingTx?.status, receivingTx?.status].includes('Cancelled') || ['Fulfilled'].includes(generalTx?.status)
        if (finish) {
          setTransfering(null)
          setTransferResponse(null)

          if (onFinish) {
            onFinish()
          }
        }

        if (!is_interval) {
          const evmAddresses = _.uniq([address, (receivingTx || sendingTx)?.router?.id, (receivingTx || sendingTx)?.user?.id, (receivingTx || sendingTx)?.sendingAddress, (receivingTx || sendingTx)?.receivingAddress].filter(id => id && !ens_data?.[id]))
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
      }
    }

    getData()

    const interval = setInterval(() => getData(true), 15 * 1000)
    return () => clearInterval(interval)
  }, [data])

  useEffect(async () => {
    if (chains_data && generalTx?.router?.id && !receivingTx && generalTx.receivingChainId && rpcs_data?.[generalTx.receivingChainId]) {
      const chain = chains_data.find(c => c?.chain_id === generalTx.receivingChainId)

      const decimals = chain?.provider_params?.[0]?.nativeCurrency?.decimals
      let _balance = await rpcs_data[generalTx.receivingChainId].getBalance(generalTx.router.id)
      try {
        _balance = BigNumber(_balance.toString()).shiftedBy(-(decimals || 18)).toNumber()
      } catch (error) {}

      setRouterBalance(_balance)
    }
    else {
      setRouterBalance(null)
    }
  }, [transaction, rpcs_data])

  const fulfill = async txData => {
    setTransfering('fulfill')
    setTransferResponse(null)

    if (sdk_data && txData) {
      try {
        setTransferResponse({ status: 'pending', message: 'Wait for Claiming' })
      
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

        setTransferResponse({ status: 'pending', message: 'Wait for Claiming Confirmation', tx_hash: response?.hash || response?.transactionHash, ...response })
      } catch (error) {
        setTransferResponse({ status: 'failed', message: error?.reason || error?.data?.message || error?.message })
      }
    }

    setTransfering(false)
  }

  const cancel = async (txData, chain_id) => {
    setTransfering('cancel')
    setTransferResponse(null)

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
        }, chain_id)

        setTransferResponse({ status: 'pending', message: 'Wait for Cancellation Confirmation', tx_hash: response?.hash, ...response })
      } catch (error) {
        setTransferResponse({ status: 'failed', message: error?.reason || error?.data?.message || error?.message })
        setTransfering(false)
      }
    }
  }

  const addTokenToMetaMask = async (chain_id, contract) => {
    if (web3 && contract) {
      if (chain_id === chainId) {
        try {
          const response = await web3.currentProvider.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: contract.contract_address,
                symbol: contract.symbol,
                decimals: contract.contract_decimals,
                image: `${contract.image?.startsWith('/') ? process.env.NEXT_PUBLIC_SITE_URL : ''}${contract.image}`,
              },
            },
          })
        } catch (error) {}

        setAddTokenData(null)
      }
      else {
        switchNetwork(chain_id, contract)
      }
    }
  }

  const switchNetwork = async (chain_id, contract) => {
    try {
      await web3.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: utils.hexValue(chain_id) }],
      })
    } catch (error) {
      if (error.code === 4902) {
        try {
          await web3.currentProvider.request({
            method: 'wallet_addEthereumChain',
            params: chains_data?.find(c => c.chain_id === chain_id)?.provider_params,
          })
        } catch (error) {}
      }
    }

    if (contract) {
      setAddTokenData({ chain_id, contract })
    }
  }

  const fromChain = chains_data?.find(c => c?.chain_id === generalTx?.sendingChainId || c?.chain_id === data?.sendingChainId)
  const toChain = chains_data?.find(c => c?.chain_id === generalTx?.receivingChainId || c?.chain_id === data?.receivingChainId)
  const fromAsset = (assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === generalTx?.sendingChainId && c?.contract_address === generalTx?.sendingAssetId) > -1) || generalTx?.sendingAsset) && {
    ...assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === generalTx?.sendingChainId && c?.contract_address === generalTx?.sendingAssetId) > -1),
    ...generalTx?.sendingAsset,
  }
  const toAsset = (assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === generalTx?.receivingChainId && c?.contract_address === generalTx?.receivingAssetId) > -1) || generalTx?.receivingAsset) && {
    ...assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === generalTx?.receivingChainId && c?.contract_address === generalTx?.receivingAssetId) > -1),
    ...generalTx?.receivingAsset,
  }
  const fromContract = Array.isArray(fromAsset?.contracts) && fromAsset.contracts.find(c => c?.chain_id === generalTx?.sendingChainId)
  const toContract = Array.isArray(toAsset?.contracts) && toAsset.contracts.find(c => c?.chain_id === generalTx?.receivingChainId)

  const fromAmount = sendingTx?.amount && fromContract?.contract_decimals && BigNumber(sendingTx.amount).shiftedBy(-fromContract.contract_decimals).toNumber()
  const toAmount = receivingTx?.amount && toContract?.contract_decimals && BigNumber(receivingTx.amount).shiftedBy(-toContract.contract_decimals).toNumber()
  const toRelayerFee = receivingTx?.relayerFee && toContract?.contract_decimals && BigNumber(receivingTx.relayerFee).shiftedBy(-toContract.contract_decimals).toNumber()
  const toEstimateAmount = receivingTx?.estimateReceiverAmount && toContract?.contract_decimals && BigNumber(receivingTx.estimateReceiverAmount).shiftedBy(-toContract.contract_decimals).toNumber()
  const isAmountDiff = typeof toAmount === 'number' && typeof toEstimateAmount === 'number' && toAmount < (1 - Number(process.env.NEXT_PUBLIC_WARN_AMOUNT_DIFF_PERCENT)) * toEstimateAmount

  const loaded = data?.transactionId && transaction?.transactionId === data.transactionId && generalTx
  const finish = [sendingTx?.status, receivingTx?.status].includes('Cancelled') || ['Fulfilled'].includes(generalTx?.status)
  const canCancelSendingTx = sendingTx?.status === 'Prepared' && moment().valueOf() >= sendingTx.expiry && !(transferResponse && !['failed'].includes(transferResponse.status))
  const actionDisabled = transfering || transferResponse?.status === 'pending'

  const fulfillButton = (
    <button
      type="button"
      disabled={actionDisabled}
      onClick={() => fulfill(receivingTx)}
      className={`w-full max-w-xs rounded-2xl shadow-lg flex items-center justify-center ${actionDisabled ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed text-gray-100' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-gray-100 hover:text-white'} text-base sm:text-lg space-x-${transfering === 'fulfill' ? 2.5 : 1.5} mx-auto py-3.5 px-2.5`}
    >
      {transfering === 'fulfill' ?
        <TailSpin color={theme === 'dark' ? 'white' : 'white'} width="24" height="24" />
        :
        <span className="font-medium">Sign to</span>
      }
      <span className={`${transfering === 'fulfill' ? 'font-semibold' : 'font-bold'}`}>
        Claim{transfering === 'fulfill' ? 'ing' : ''} Funds
      </span>
    </button>
  )
  const cancelButton = canCancelSendingTx && (
    chain_id !== (canCancelSendingTx ? generalTx?.sendingChainId : generalTx?.receivingChainId) ?
      <Wallet
        chainIdToConnect={canCancelSendingTx ? generalTx?.sendingChainId : generalTx?.receivingChainId}
        disabled={actionDisabled}
        buttonDisconnectTitle={<>
          <span className="font-semibold">Cancel</span>
          <Img
            src={(canCancelSendingTx ? fromChain : toChain)?.image}
            alt=""
            className="w-6 h-6 rounded-full"
          />
          <span className="font-normal">Transaction</span>
        </>}
        buttonDisconnectClassName={`w-auto bg-gray-100 dark:bg-gray-800 rounded-xl shadow flex items-center justify-center ${actionDisabled ? 'cursor-not-allowed text-gray-700 dark:text-gray-300' : ''} text-sm sm:text-base space-x-1.5 mx-auto py-2.5 px-3`}
      />
      :
      <button
        type="button"
        disabled={actionDisabled}
        onClick={() => cancel(canCancelSendingTx ? sendingTx : receivingTx, canCancelSendingTx ? generalTx?.sendingChainId : generalTx?.receivingChainId)}
        className={`w-auto bg-gray-100 dark:bg-gray-800 rounded-xl shadow flex items-center justify-center ${actionDisabled ? 'cursor-not-allowed text-gray-700 dark:text-gray-300' : ''} text-sm sm:text-base space-x-1.5 mx-auto py-2.5 px-3`}
      >
        {transfering === 'cancel' && (
          <TailSpin color={theme === 'dark' ? 'white' : '#2563EB'} width="16" height="16" />
        )}
        <span className="font-semibold">
          Cancel{transfering === 'cancel' ? 'ling' : ''}
        </span>
        <span className="font-normal">Transaction</span>
      </button>
  )

  const fromAssetAmount = typeof fromAmount === 'number' && fromAmount > 0 && (
    <div className={`min-w-max max-w-min bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center sm:justify-start space-x-2 mt-1.5 mx-auto ${finish ? 'sm:ml-0' : ''} py-1.5 px-2.5`}>
      <Img
        src={fromAsset.image}
        alt=""
        className="w-5 h-5 rounded-full"
      />
      <span className="flex items-center font-mono font-semibold">
        <span className="mr-1.5">{numberFormat(fromAmount, '0,0.000000', true)}</span>
        <span>{fromContract?.symbol || fromAsset?.symbol}</span>
      </span>
    </div>
  )
  const toAssetAmount = typeof toAmount === 'number' && toAmount > 0 && (
    <div className={`min-w-max max-w-min bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center sm:justify-end space-x-2 mt-1.5 mx-auto ${finish ? 'sm:mr-0' : ''} py-1.5 px-2.5`}>
      <Img
        src={toAsset.image}
        alt=""
        className="w-5 h-5 rounded-full"
      />
      <span className="flex items-center font-mono font-semibold">
        <span className="mr-1.5">{numberFormat(toAmount, '0,0.000000', true)}</span>
        <span>{toContract?.symbol || toAsset?.symbol}</span>
      </span>
    </div>
  )
  const toRelayerFeeAmount = typeof toRelayerFee === 'number' && toRelayerFee > 0 && (
    <div className="flex items-center space-x-2">
      <span className="whitespace-nowrap text-sm font-semibold">Relayer Fee:</span>
      <div className="min-w-max max-w-min bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center sm:justify-end space-x-2 mx-auto py-1 px-2.5">
        <Img
          src={toAsset.image}
          alt=""
          className="w-5 sm:w-4 lg:w-5 h-5 sm:h-4 lg:h-5 rounded-full"
        />
        <span className="flex items-center font-mono text-sm font-semibold">
          <span className="mr-1">{numberFormat(toRelayerFee, '0,0.000000', true)}</span>
          <span>{toContract?.symbol || toAsset?.symbol}</span>
        </span>
      </div>
    </div>
  )

  const addReceivingTokenToMetaMaskButton = toContract && generalTx?.receivingAssetId !== constants.AddressZero && (
    <button
      onClick={() => addTokenToMetaMask(generalTx?.receivingChainId, { ...toAsset, ...toContract })}
      className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-2xl flex items-center justify-center text-sm font-medium space-x-1.5 py-2.5 px-3"
    >
      <span>Add</span>
      <span className={`${toContract?.symbol || toAsset?.symbol ? 'font-bold' : ''}`}>
        {toContract?.symbol || toAsset?.symbol || 'Token'}
      </span>
      <span>to</span>
      <span className="pr-0.5">MetaMask</span>
      <Img
        src="/logos/wallets/metamask.png"
        alt=""
        className="w-5 h-5"
      />
    </button>
  )
  const manualClaimLink = transaction?.transactionId && (
    <a
      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transaction.transactionId.toLowerCase()}`}
      target="_blank"
      rel="noopener noreferrer"
      className="underline text-blue-600 dark:text-white font-semibold"
    >
      {process.env.NEXT_PUBLIC_EXPLORER_NAME}
    </a>
  )

  const outOfGas = !receivingTx && typeof routerBalance === 'number' && routerBalance < Number(process.env.NEXT_PUBLIC_LOW_GAS_THRESHOLD)

  return (
    <>
      {transferResponse && !finish && (
        <Notification
          hideButton={true}
          onClose={() => setTransferResponse(null)}
          outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
          innerClassNames={`${transferResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-600' : transferResponse.status === 'success' ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-600 dark:bg-blue-700'} text-white`}
          animation="animate__animated animate__fadeInDown"
          icon={transferResponse.status === 'failed' ?
            <FaTimesCircle className="w-4 h-4 stroke-current mr-2" />
            :
            transferResponse.status === 'success' ?
              <FaCheckCircle className="w-4 h-4 stroke-current mr-2" />
              :
              <FaClock className="w-4 h-4 stroke-current mr-2" />
          }
          content={<span className="flex flex-wrap items-center">
            <span className="mr-1.5">{transferResponse.message}</span>
            {transferResponse.status === 'pending' && (
              <TailSpin color={theme === 'dark' ? 'white' : 'white'} width="16" height="16" className="mr-1.5" />
            )}
            {(canCancelSendingTx && transfering === 'cancel' ? generalTx?.sendingChain : generalTx?.receivingChain)?.explorer?.url && transferResponse.tx_hash && (
              <a
                href={`${(canCancelSendingTx && transfering === 'cancel' ? generalTx?.sendingChain : generalTx?.receivingChain).explorer.url}${(canCancelSendingTx && transfering === 'cancel' ? generalTx?.sendingChain : generalTx?.receivingChain).explorer.transaction_path?.replace('{tx}', transferResponse.tx_hash)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center font-semibold ml-1.5"
              >
                <span>View on {(canCancelSendingTx && transfering === 'cancel' ? generalTx?.sendingChain : generalTx?.receivingChain).explorer.name}</span>
                <TiArrowRight size={20} className="transform -rotate-45" />
              </a>
            )}
          </span>}
        />
      )}
      <Modal
        hidden={hidden}
        onClick={() => setHidden(false)}
        buttonTitle={buttonTitle}
        buttonClassName={buttonClassName}
        title={transaction?.transactionId && (
          <div className="flex items-center">
            <span className="whitespace-nowrap text-gray-400 dark:text-gray-600 text-sm sm:text-base font-medium mr-2">TX ID:</span>
            <div className="flex items-center space-x-1.5 mr-2">
              <a
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transaction.transactionId.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-white text-sm sm:text-base font-semibold"
              >
                {ellipseAddress(transaction.transactionId?.toLowerCase(), 12)}
              </a>
              <Copy
                size={16}
                text={transaction.transactionId?.toLowerCase()}
              />
            </div>
            <a
              href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transaction.transactionId.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 dark:text-white text-sm font-medium ml-auto"
            >
              <span className="hidden sm:block">View TX</span>
              <TiArrowRight size={20} className="transform -rotate-45" />
            </a>
          </div>
        )}
        body={<div className="space-y-8 sm:space-y-4">
          <div className="overflow-x-scroll lg:overflow-x-visible flex flex-col sm:flex-row items-center sm:items-start sm:justify-between space-y-8 sm:space-y-0 mt-3">
            {loaded ?
              generalTx?.sendingAddress ?
                <div className="min-w-max">
                  <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                    {ens_data?.[generalTx.sendingAddress?.toLowerCase()]?.name && (
                      <Img
                        src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data?.[generalTx.sendingAddress.toLowerCase()].name}`}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <a
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${generalTx.sendingAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className={`text-gray-400 dark:text-gray-200 text-base sm:text-xs xl:text-sm ${ens_data?.[generalTx.sendingAddress?.toLowerCase()]?.name ? 'font-semibold' : 'font-medium'}`}>
                        {ellipseAddress(ens_data?.[generalTx.sendingAddress?.toLowerCase()]?.name, 10) || ellipseAddress(generalTx.sendingAddress?.toLowerCase(), 6)}
                      </span>
                    </a>
                    <Copy size={18} text={generalTx.sendingAddress} />
                    {generalTx.sendingChain?.explorer?.url && (
                      <a
                        href={`${generalTx.sendingChain.explorer.url}${generalTx.sendingChain.explorer.address_path?.replace('{address}', generalTx.sendingAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-white"
                      >
                        {generalTx.sendingChain.explorer.icon ?
                          <Img
                            src={generalTx.sendingChain.explorer.icon}
                            alt=""
                            className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={20} className="transform -rotate-45" />
                        }
                      </a>
                    )}
                  </div>
                  {generalTx.sendingChain && (
                    <div className="flex items-center justify-center sm:justify-start space-x-2.5 mt-1.5">
                      <Img
                        src={generalTx.sendingChain.image}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">{chainTitle(generalTx.sendingChain)}</span>
                    </div>
                  )}
                  {finish && (
                    <Flip right>
                      {fromAssetAmount}
                    </Flip>
                  )}
                </div>
                :
                <span className="font-mono text-gray-400 dark:text-gray-600 font-light">Unknown</span>
              :
              data?.sendingChainId && data.prepareResponse?.from ?
                <div className="min-w-max">
                  <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                    {ens_data?.[data.prepareResponse.from.toLowerCase()]?.name && (
                      <Img
                        src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data?.[data.prepareResponse.from.toLowerCase()].name}`}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <a
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${data.prepareResponse.from.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className={`text-gray-400 dark:text-gray-200 text-base sm:text-xs xl:text-sm ${ens_data?.[data.prepareResponse.from.toLowerCase()]?.name ? 'font-semibold' : 'font-medium'}`}>
                        {ellipseAddress(ens_data?.[data.prepareResponse.from.toLowerCase()]?.name, 10) || ellipseAddress(data.prepareResponse.from.toLowerCase(), 6)}
                      </span>
                    </a>
                    <Copy size={18} text={data.prepareResponse.from.toLowerCase()} />
                    {fromChain?.explorer?.url && (
                      <a
                        href={`${fromChain.explorer.url}${fromChain.explorer.address_path?.replace('{address}', data.prepareResponse.from.toLowerCase())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-white"
                      >
                        {fromChain.explorer.icon ?
                          <Img
                            src={fromChain.explorer.icon}
                            alt=""
                            className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={20} className="transform -rotate-45" />
                        }
                      </a>
                    )}
                  </div>
                  {fromChain && (
                    <div className="flex items-center justify-center sm:justify-start space-x-2.5 mt-1.5">
                      <Img
                        src={fromChain.image}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">{chainTitle(fromChain)}</span>
                    </div>
                  )}
                </div>
                :
                <div className="flex flex-col space-y-2.5">
                  <div className="skeleton w-40 h-6" />
                  <div className="skeleton w-24 h-6 mx-auto sm:ml-0" />
                </div>
            }
            <div className="flex flex-col items-center justify-center mx-auto">
              {loaded ?
                <>
                  <div className={`max-w-min h-6 bg-gray-100 dark:bg-${sendingTx?.status ? ['Fulfilled'].includes(sendingTx.status) ? 'green-600' : ['Prepared'].includes(sendingTx.status) ? 'yellow-500' : 'red-700' : sendingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === sendingTx.chainId) < 0 ? 'gray-700' : 'blue-600'} rounded-lg flex items-center space-x-1 py-1 px-1.5`}>
                    {sendingTx?.status ?
                      ['Fulfilled'].includes(sendingTx.status) ?
                        <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                        :
                        ['Prepared'].includes(sendingTx.status) ?
                          <FaRegCheckCircle size={14} className="text-yellow-500 dark:text-white" />
                          :
                          <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                      :
                      sendingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === sendingTx.chainId) < 0 ?
                        <FaQuestion size={14} className="text-gray-300 dark:text-white" />
                        :
                        <TailSpin color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                    }
                    <div className={`uppercase ${sendingTx?.status ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white'} text-xs font-semibold`}>{sendingTx?.status || (sendingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === sendingTx.chainId) < 0 ? 'Unknown' : 'Preparing')}</div>
                  </div>
                  {sendingTx?.chainTx && sendingTx?.sendingChain?.explorer?.url && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Copy
                        size={12}
                        text={sendingTx.chainTx}
                        copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-normal">
                          {ellipseAddress(sendingTx.chainTx, 6)}
                        </span>}
                      />
                      <a
                        href={`${sendingTx.sendingChain.explorer.url}${sendingTx.sendingChain.explorer.transaction_path?.replace('{tx}', sendingTx.chainTx)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-white"
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
                  {!finish && !receivingTx && !['Prepared'].includes(sendingTx?.status) && (
                    <LightSpeed left>
                      {fromAssetAmount}
                    </LightSpeed>
                  )}
                </>
                :
                <div className="flex flex-col items-center justify-center space-y-1.5 mx-auto">
                  <div className="skeleton w-24 h-7" />
                  <div className="skeleton w-28 h-4" />
                </div>
              }
            </div>
            <div className="mx-auto">
              <div className="min-w-max grid grid-flow-row grid-cols-3 gap-2">
                <span />
                <Img
                  src="/logos/externals/connext/logo.png"
                  alt=""
                  className="w-6 h-6 mx-auto"
                />
              </div>
              {loaded ?
                generalTx?.router?.id && (
                  ens_data?.[generalTx.router.id.toLowerCase()]?.name ?
                    <>
                      <div className="flex items-center justify-start sm:justify-center text-gray-400 dark:text-gray-600 text-xs font-medium space-x-1 mt-1.5">
                        <MdOutlineRouter size={16} className="mb-0.5" />
                        <a
                          href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/router/${generalTx.router.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="text-blue-600 dark:text-white font-semibold">
                            {ens_data[generalTx.router.id.toLowerCase()].name}
                          </span>
                        </a>
                      </div>
                      <div className="flex justify-center">
                        <Copy
                          text={generalTx.router.id}
                          copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-normal">
                            {ellipseAddress(generalTx.router.id, 6)}
                          </span>}
                        />
                      </div>
                    </>
                    :
                    <>
                      <div className="flex items-center justify-center font-medium space-x-1 mt-2">
                        <a
                          href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/router/${generalTx.router.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="text-blue-600 dark:text-white text-xs font-medium">
                            {ellipseAddress(generalTx.router.id, 6)}
                          </span>
                        </a>
                        <Copy size={12} text={generalTx.router.id} />
                      </div>
                      <div className="flex items-center justify-center text-gray-400 dark:text-gray-600 text-xs font-medium space-x-1 mt-0.5">
                        <MdOutlineRouter size={16} className="mb-0.5" />
                        <span>Router</span>
                      </div>
                    </>
                )
                :
                <div className="flex flex-col items-center justify-center space-y-2 mt-2.5 mx-auto">
                  <div className="skeleton w-24 h-4" />
                  <div className="skeleton w-20 h-3.5" />
                </div>
              }
              {!finish && !['Prepared'].includes(receivingTx?.status) && ['Prepared'].includes(sendingTx?.status) && (
                <LightSpeed left>
                  {fromAssetAmount}
                </LightSpeed>
              )}
            </div>
            <div className="flex flex-col items-center justify-center mx-auto">
              {loaded ?
                <>
                  <div className={`min-w-max max-w-min h-6 bg-gray-100 dark:bg-${receivingTx?.status ? ['Fulfilled'].includes(receivingTx.status) ? 'green-600' : ['Prepared'].includes(receivingTx.status) ? 'yellow-500' : 'red-700' : sendingTx?.status === 'Cancelled' ? 'red-700' : receivingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === receivingTx.chainId) < 0 ? 'gray-700' : 'blue-600'} rounded-lg flex items-center space-x-1 py-1 px-1.5`}>
                    {receivingTx?.status ?
                      ['Fulfilled'].includes(receivingTx.status) ?
                        <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                        :
                        ['Prepared'].includes(receivingTx.status) ?
                          <FaRegCheckCircle size={14} className="text-yellow-500 dark:text-white" />
                          :
                          <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                      :
                      sendingTx?.status === 'Cancelled' ?
                        <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                        :
                        receivingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === receivingTx.chainId) < 0 ?
                          <FaQuestion size={14} className="text-gray-300 dark:text-white" />
                          :
                          <TailSpin color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                    }
                    <div className={`uppercase ${receivingTx?.status ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white'} text-xs font-semibold`}>{receivingTx?.status ? receivingTx.status : sendingTx?.status === 'Cancelled' ? 'Skipped' : receivingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === receivingTx.chainId) < 0 ? 'Unknown' : 'Pending'}</div>
                  </div>
                  {outOfGas && (
                    <div className="mt-1">
                      <Popover
                        placement="top"
                        title={<span className="text-xs">Router out of gas</span>}
                        content={<div className="w-52 text-xs">Low Gas on Router, Transaction Might Not Complete Until Refilled</div>}
                      >
                        <span className="text-red-500 text-xs">Router out of gas</span>
                      </Popover>
                    </div>
                  )}
                  {receivingTx?.chainTx && receivingTx?.receivingChain?.explorer?.url && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Copy
                        size={12}
                        text={receivingTx.chainTx}
                        copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-normal">
                          {ellipseAddress(receivingTx.chainTx, 6)}
                        </span>}
                      />
                      <a
                        href={`${receivingTx.receivingChain.explorer.url}${receivingTx.receivingChain.explorer.transaction_path?.replace('{tx}', receivingTx.chainTx)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-white"
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
                  {!finish && ['Prepared'].includes(receivingTx?.status) && (
                    <LightSpeed left>
                      {toAssetAmount}
                    </LightSpeed>
                  )}
                </>
                :
                <div className="flex flex-col items-center justify-center space-y-1.5 mx-auto">
                  <div className="skeleton w-24 h-7" />
                  <div className="skeleton w-28 h-4" />
                </div>
              }
            </div>
            {loaded ?
              generalTx?.receivingAddress ?
                <div className="min-w-max">
                  <div className="flex items-center sm:justify-end space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                    {ens_data?.[generalTx.receivingAddress.toLowerCase()]?.name && (
                      <Img
                        src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data?.[generalTx.receivingAddress.toLowerCase()].name}`}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <a
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${generalTx.receivingAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className={`text-gray-400 dark:text-gray-200 text-base sm:text-xs xl:text-sm ${ens_data?.[generalTx.receivingAddress.toLowerCase()]?.name ? 'font-semibold' : 'font-medium'}`}>
                        {ellipseAddress(ens_data?.[generalTx.receivingAddress.toLowerCase()]?.name, 10) || ellipseAddress(generalTx.receivingAddress.toLowerCase(), 6)}
                      </span>
                    </a>
                    <Copy size={18} text={generalTx.receivingAddress} />
                    {generalTx.receivingChain?.explorer?.url && (
                      <a
                        href={`${generalTx.receivingChain.explorer.url}${generalTx.receivingChain.explorer.address_path?.replace('{address}', generalTx.receivingAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-white"
                      >
                        {generalTx.receivingChain.explorer.icon ?
                          <Img
                            src={generalTx.receivingChain.explorer.icon}
                            alt=""
                            className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={20} className="transform -rotate-45" />
                        }
                      </a>
                    )}
                  </div>
                  {generalTx.receivingChain && (
                    <div className="flex items-center justify-center sm:justify-end space-x-2.5 mt-1.5">
                      <Img
                        src={generalTx.receivingChain.image}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">{chainTitle(generalTx.receivingChain)}</span>
                    </div>
                  )}
                  {finish && ![sendingTx?.status, receivingTx?.status].includes('Cancelled') && (
                    <LightSpeed left>
                      {toAssetAmount}
                    </LightSpeed>
                  )}
                </div>
                :
                <span className="font-mono text-gray-400 dark:text-gray-600 font-light">Unknown</span>
              :
              <div className="flex flex-col space-y-2.5">
                <div className="skeleton w-40 h-6" />
                {toChain && (
                  <div className="flex items-center justify-center sm:justify-end space-x-2.5 mt-1.5">
                    <Img
                      src={toChain.image}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">{chainTitle(toChain)}</span>
                  </div>
                )}
              </div>
            }
          </div>
          <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 gap-16 sm:gap-4 py-4">
            {web3_provider && !finish && (
              <div className="sm:order-2 flex flex-col items-center justify-center space-y-3">
                {toRelayerFeeAmount}
                {loaded && [sendingTx?.status, receivingTx?.status].includes('Prepared') && (canCancelSendingTx || ['Prepared'].includes(receivingTx?.status)) ?
                  (canCancelSendingTx ? sendingTx : receivingTx) && address?.toLowerCase() !== (canCancelSendingTx ? sendingTx?.user?.id?.toLowerCase() : receivingTx?.user?.id?.toLowerCase()) ?
                    <span className="min-w-max flex flex-col text-gray-600 dark:text-gray-400 text-center mx-auto">
                      <span>address not match.</span>
                      <span className="flex items-center">(Your<span className="hidden sm:block ml-1">connected addr</span>: {ellipseAddress(ens_data?.[address?.toLowerCase()]?.name, 10) || ellipseAddress(address?.toLowerCase(), 6)})</span>
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
                      {cancelButton}
                      {/*isAmountDiff && (
                        <div className="flex items-center justify-center text-yellow-500 dark:text-yellow-400 text-xs space-x-1.5">
                          <TiWarning size={16} />
                          <span>The amount to be received is less than {numberFormat((1 - Number(process.env.NEXT_PUBLIC_WARN_AMOUNT_DIFF_PERCENT)) * 100, '0,0.00')}% of the estimation.</span>
                        </div>
                      )*/}
                    </>
                  :
                  <>
                    <Triangle color={theme === 'dark' ? 'white' : '#2563EB'} width="72" height="72" />
                    <div className="flex items-center space-x-1 ml-2">
                      <span className="text-blue-600 dark:text-white font-light">
                        {loaded ? transfering === 'fulfill' ? 'Claiming' : transfering === 'cancel' ? 'Cancelling' : 'Waiting for Router' : 'Loading'}
                      </span>
                      <Oval color={theme === 'dark' ? 'white' : '#2563EB'} width="14" height="14" />
                    </div>
                  </>
                }
              </div>
            )}
            {loaded && finish && (
              <div className="sm:order-2 flex flex-col items-center justify-center space-y-5">
                {['Fulfilled'].includes(generalTx?.status) ?
                  <FaCheckCircle size={48} className="text-green-500 dark:text-white" />
                  :
                  [sendingTx?.status, receivingTx?.status].includes('Cancelled') ?
                    <FaTimesCircle size={48} className="text-gray-300 dark:text-white" />
                    :
                    null
                }
                <div className="flex flex-col items-center">
                  {['Fulfilled'].includes(generalTx?.status) ?
                    <span className="text-lg font-medium">Claim Successful</span>
                    :
                    [sendingTx?.status, receivingTx?.status].includes('Cancelled') ?
                      <span className="text-lg font-medium">Cancel Successful</span>
                      :
                      null
                  }
                  {transaction?.transactionId && (
                    <a
                      href={toChain?.explorer && (receivingTx?.fulfillTransactionHash || receivingTx?.cancelTransactionHash) ? `${toChain.explorer.url}${toChain.explorer.transaction_path?.replace('{tx}', receivingTx?.fulfillTransactionHash || receivingTx?.cancelTransactionHash)}` : `${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transaction.transactionId.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 dark:text-blue-400 text-base font-semibold"
                    >
                      <span>View on Explorer</span>
                      <TiArrowRight size={24} className="transform -rotate-45 mt-0.5 -mr-2" />
                    </a>
                  )}
                </div>
                {addReceivingTokenToMetaMaskButton}
                {process.env.NEXT_PUBLIC_FEEDBACK_URL && (
                  <a
                    href={process.env.NEXT_PUBLIC_FEEDBACK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600 text-xs font-medium"
                  >
                    help us improve {process.env.NEXT_PUBLIC_APP_NAME}
                  </a>
                )}
              </div>
            )}
            <div className="sm:order-1 flex flex-col items-center justify-center">
              <div className="text-lg">
                <div className="flex items-center space-x-3">
                  <BsFillCheckCircleFill size={32} className="text-green-500 dark:text-white" />
                  <span className="font-medium">Approve Token</span>
                </div>
                <div className="w-8 h-8 flex justify-center">
                  <div className="w-2 h-full bg-green-300 dark:bg-gray-100" />
                </div>
                <div className="flex items-center space-x-3">
                  <BsFillCheckCircleFill size={32} className="text-green-500 dark:text-white" />
                  <span className="font-medium">Send Transaction</span>
                </div>
                <div className="w-8 h-8 flex justify-center">
                  <div className={`w-2 h-full ${finish ? `bg-${['Fulfilled'].includes(generalTx?.status) ? 'green' : 'red'}-300 dark:bg-gray-100` : 'bg-gray-100 dark:bg-gray-600'}`} />
                </div>
                <div className="flex items-center space-x-3">
                  {['Fulfilled'].includes(generalTx?.status) ?
                    <BsFillCheckCircleFill size={32} className="text-green-500 dark:text-white" />
                    :
                    [sendingTx?.status, receivingTx?.status].includes('Cancelled') ?
                      <BsFillXCircleFill size={32} className="text-red-500 dark:text-white" />
                      :
                      <Puff color={theme === 'dark' ? '#4B5563' : '#9CA3AF'} width="32" height="32" />
                  }
                  <span className={`${finish ? 'font-medium' : 'text-gray-400 dark:text-gray-600'}`}>Sign to Claim</span>
                </div>
              </div>
            </div>
          </div>
          {transaction?.transactionId && !finish && !['Prepared'].includes(receivingTx?.status) && (
            <div className="space-y-2">
              <div className="flex items-center font-semibold space-x-2">
                <span className="text-blue-600 dark:text-white text-base">Transaction in progress</span>
                <Bars color={theme === 'dark' ? 'white' : '#2563EB'} width="18" height="18" />
              </div>
              <div className="text-gray-400 dark:text-gray-500">
                Your transfer will automatically end up at your destination address once it is picked up and propagated by <span className="text-black dark:text-white font-semibold">Connext</span>'s network. You can track its progress above or on {manualClaimLink}.
              </div>
              <div className="text-gray-400 dark:text-gray-500">
                Once the transaction status is <span className="text-black dark:text-white font-semibold">Prepared</span>, you can claim your transaction here on <span className="text-black dark:text-white font-semibold">{process.env.NEXT_PUBLIC_APP_NAME}</span> or claim it manually on {manualClaimLink}.
              </div>
            </div>
          )}
        </div>}
        cancelDisabled={false && (cancelDisabled || actionDisabled) && !finish}
        onClose={() => {
          if (onClose) {
            onClose()
          }
          setHidden(true)
        }}
        noButtons={true}
        modalClassName="sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-screen lg:max-h-full overflow-y-scroll px-4 sm:px-0"
      />
    </>
  )
}
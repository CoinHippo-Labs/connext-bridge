import { useSelector, shallowEqual } from 'react-redux'
import { useState, useEffect } from 'react'
import { XTransferStatus, XTransferErrorStatus } from '@connext/nxtp-utils'
import { Tooltip } from '@material-tailwind/react'
import { constants } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
import moment from 'moment'
import Fade from 'react-reveal/Fade'
import { TiArrowRight } from 'react-icons/ti'
import { HiOutlineCheckCircle } from 'react-icons/hi'
import { IoWarning } from 'react-icons/io5'
import { BsLightningChargeFill } from 'react-icons/bs'
import { BiInfoCircle } from 'react-icons/bi'

import ActionRequired from '../action-required'
import NumberDisplay from '../number'
import EnsProfile from '../profile/ens'
import Image from '../image'
import { NATIVE_WRAPPABLE_SYMBOLS, PERCENT_ROUTER_FEE } from '../../lib/config'
import { chainName, getChainData, getAssetData, getContractData } from '../../lib/object'
import { formatUnits } from '../../lib/number'
import { toArray, equalsIgnoreCase } from '../../lib/utils'

export default ({ data }) => {
  const { chains, assets, wallet, latest_bumped_transfers } = useSelector(state => ({ chains: state.chains, assets: state.assets, wallet: state.wallet, latest_bumped_transfers: state.latest_bumped_transfers }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }
  const { latest_bumped_transfers_data } = { ...latest_bumped_transfers }

  const [transferData, setTransferData] = useState(null)

  useEffect(
    () => {
      if (data) {
        setTransferData(data)
      }
    },
    [data],
  )

  const { transfer_id, status, error_status, origin_domain, origin_transacting_asset, origin_transacting_amount, destination_domain, destination_transacting_asset, destination_transacting_amount, destination_local_asset, receive_local, to, xcall_timestamp, execute_transaction_hash, routers, call_data } = { ...transferData }

  const source_chain_data = getChainData(origin_domain, chains_data)
  const destination_chain_data = getChainData(destination_domain, chains_data)
  const { native_token, explorer, unwrapper_contract } = { ...destination_chain_data }
  const { symbol } = { ...native_token }
  const { url, transaction_path } = { ...explorer }

  const source_asset_data = getAssetData(undefined, assets_data, { chain_id: source_chain_data?.chain_id, contract_address: origin_transacting_asset })
  let source_contract_data = getContractData(source_chain_data?.chain_id, source_asset_data?.contracts)
  // next asset
  if (source_contract_data?.next_asset && equalsIgnoreCase(source_contract_data.next_asset.contract_address, origin_transacting_asset)) {
    source_contract_data = { ...source_contract_data, ...source_contract_data.next_asset }
    delete source_contract_data.next_asset
  }
  // native asset
  if (!source_contract_data && equalsIgnoreCase(ZeroAddress, origin_transacting_asset)) {
    const { chain_id, native_token } = { ...source_chain_data }
    const { symbol } = { ...native_token }
    const { contracts } = { ...getAssetData(symbol, assets_data) }
    source_contract_data = { ...getContractData(chain_id, contracts), ...native_token, contract_address: origin_transacting_asset }
  }
  const _asset_data = getAssetData(source_asset_data?.id, assets_data, { chain_id: destination_chain_data?.chain_id })
  const _contract_data = getContractData(destination_chain_data?.chain_id, _asset_data?.contracts)
  const destination_asset_data = getAssetData(undefined, assets_data, { chain_id: destination_chain_data?.chain_id, contract_addresses: [destination_transacting_asset, _asset_data ? (receive_local ? _contract_data?.next_asset : _contract_data)?.contract_address : destination_local_asset] })
  let destination_contract_data = getContractData(destination_chain_data?.chain_id, destination_asset_data?.contracts)
  // next asset
  if (destination_contract_data?.next_asset && (equalsIgnoreCase(destination_contract_data.next_asset.contract_address, destination_transacting_asset) || receive_local)) {
    destination_contract_data = { ...destination_contract_data, ...destination_contract_data.next_asset }
    delete destination_contract_data.next_asset
  }
  // native asset
  const _destination_asset_data = getAssetData(NATIVE_WRAPPABLE_SYMBOLS.find(s => symbol?.endsWith(s)) || symbol, assets_data)
  if ((!destination_contract_data && equalsIgnoreCase(ZeroAddress, destination_transacting_asset)) || (destination_asset_data?.id === _destination_asset_data?.id && equalsIgnoreCase(to, unwrapper_contract))) {
    const { chain_id } = { ...destination_chain_data }
    const { contracts } = { ..._destination_asset_data }
    destination_contract_data = { ...getContractData(chain_id, contracts), ...native_token, contract_address: ZeroAddress }
  }

  const source_symbol = source_contract_data?.symbol || source_asset_data?.symbol
  const destination_symbol = destination_contract_data?.symbol || destination_asset_data?.symbol
  const source_decimals = source_contract_data?.decimals || 18
  const destination_decimals = destination_contract_data?.decimals || 18
  const source_asset_image = source_contract_data?.image || source_asset_data?.image
  const destination_asset_image = destination_contract_data?.image || destination_asset_data?.image
  const source_amount = formatUnits(origin_transacting_amount, source_decimals)
  const destination_amount = destination_transacting_amount ? formatUnits(destination_transacting_amount, destination_decimals) : source_amount * (1 - PERCENT_ROUTER_FEE / 100)

  const pending = ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status)
  const errored = error_status === XTransferErrorStatus.LowRelayerFee && !execute_transaction_hash && [XTransferStatus.XCalled, XTransferStatus.Reconciled].includes(status)
  const bumped = [XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.ExecutionError].includes(error_status) && toArray(latest_bumped_transfers_data).findIndex(d => equalsIgnoreCase(d.transfer_id, transfer_id) && moment().diff(moment(d.updated), 'minutes', true) <= 5) > -1

  return transferData && (
    <div className="bg-slate-100 dark:bg-slate-900 max-w-xs sm:max-w-none rounded mx-auto py-5 px-4">
      <div className="flex items-center justify-between space-x-2">
        <div className="flex items-center space-x-1.5">
          {source_chain_data?.image && (
            <Image
              src={source_chain_data.image}
              width={20}
              height={20}
              className="3xl:w-6 3xl:h-6 rounded-full"
            />
          )}
          <span className="text-xs 3xl:text-xl font-medium">
            {chainName(source_chain_data)}
          </span>
        </div>
        {pending && !errored && (
          <div className="flex items-center justify-center">
            <div className="w-12 h-0.5 border-t border-slate-300 dark:border-slate-700 mt-px ml-2" />
            <Fade left distance="64px" duration={2500} forever>
              <div className="w-2 h-2 rounded-full" style={{ background: `${source_asset_data?.color || '#3b82f6'}aa` }} />
            </Fade>
          </div>
        )}
        <div className="flex items-center justify-end space-x-1.5">
          {destination_chain_data?.image && (
            <Image
              src={destination_chain_data.image}
              width={20}
              height={20}
              className="3xl:w-6 3xl:h-6 rounded-full"
            />
          )}
          <span className="text-xs 3xl:text-xl font-medium">
            {chainName(destination_chain_data)}
          </span>
        </div>
      </div>
      <div className="flex items-start justify-between space-x-2 my-4">
        <div className="flex flex-col space-y-1.5">
          <NumberDisplay value={source_amount} />
          <div className="flex items-center justify-start space-x-1">
            {source_asset_image && (
              <Image
                src={source_asset_image}
                width={16}
                height={16}
                className="3xl:w-5 3xl:h-5 rounded-full"
              />
            )}
            <span className="text-xs 3xl:text-xl font-medium">
              {source_symbol}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          {errored ?
            <ActionRequired
              forceDisabled={[XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(error_status) || bumped}
              transferData={transferData}
              buttonTitle={
                <Tooltip content={error_status === XTransferErrorStatus.NoBidsReceived ? 'The transfer is not getting boosted by routers (fast path) and will complete in slow path eventually, if no new bids are received till the end.' : bumped ? 'Waiting for bump' : error_status}>
                  <div>
                    <IoWarning size={24} className="text-red-600 dark:text-red-500" />
                  </div>
                </Tooltip>
              }
              onTransferBumped={
                relayerFeeData => {
                  if (data) {
                    setTransferData({ ...data, ...relayerFeeData, error_status: null })
                  }
                }
              }
              onSlippageUpdated={
                slippage => {
                  if (data) {
                    setTransferData({ ...data, slippage, error_status: null })
                  }
                }
              }
            /> :
            pending ?
              null :
              <a
                href={`${url}${transaction_path?.replace('{tx}', execute_transaction_hash)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <HiOutlineCheckCircle size={32} className="3xl:w-10 3xl:h-10 text-green-500 dark:text-green-400" />
              </a>
          }
        </div>
        <div className="flex flex-col items-end space-y-1.5" style={{ minWidth: '4rem' }}>
          <NumberDisplay value={destination_amount} />
          <div className="flex items-center justify-center space-x-1">
            {destination_asset_image && (
              <Image
                src={destination_asset_image}
                width={16}
                height={16}
                className="3xl:w-5 3xl:h-5 rounded-full"
              />
            )}
            <span className="text-xs 3xl:text-xl font-medium">
              {destination_symbol}
            </span>
          </div>
        </div>
      </div>
      {to && toArray([address, unwrapper_contract]).findIndex(a => equalsIgnoreCase(a, to)) < 0 && (
        <div className="flex items-center justify-between space-x-2">
          <span className="text-sm font-medium">
            To:
          </span>
          <EnsProfile address={to} />
        </div>
      )}
      {xcall_timestamp && (
        <div className="flex items-center justify-between mt-0.5">
          {pending && !errored ?
            <div /> :
            errored ?
              <ActionRequired
                forceDisabled={[XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(error_status) || bumped}
                transferData={transferData}
                buttonTitle={
                  <Tooltip content={error_status === XTransferErrorStatus.NoBidsReceived ? 'The transfer is not getting boosted by routers (fast path) and will complete in slow path eventually, if no new bids are received till the end.' : bumped ? 'Waiting for bump' : error_status}>
                    <div className="whitespace-nowrap text-red-600 dark:text-red-500 text-xs font-semibold">
                      {bumped ? 'Waiting for bump' : error_status}
                    </div>
                  </Tooltip>
                }
                onTransferBumped={
                  relayerFeeData => {
                    if (data) {
                      setTransferData({ ...data, ...relayerFeeData, error_status: null })
                    }
                  }
                }
                onSlippageUpdated={
                  slippage => {
                    if (data) {
                      setTransferData({ ...data, slippage, error_status: null })
                    }
                  }
                }
              /> :
              <span>
                {call_data === '0x' && (
                  <Tooltip
                    placement="bottom"
                    content={routers?.length > 0 ? 'Boosted by routers.' : 'Pending router boost.'}
                  >
                    <div className="flex items-center">
                      <BsLightningChargeFill size={16} className={`3xl:w-5 3xl:h-5 ${routers?.length > 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-blue-300 dark:text-blue-200'}`} />
                      <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                    </div>
                  </Tooltip>
                )}
              </span>
          }
          <Tooltip content="Transferred at">
            <div className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
              {moment(xcall_timestamp * 1000).format('MMM D, YYYY h:mm:ss A')}
            </div>
          </Tooltip>
        </div>
      )}
      {transfer_id && (
        <div className="flex items-center justify-end mt-1 -mb-2">
          <a
            href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transfer_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-blue-500 text-xs 3xl:text-xl font-medium space-x-0 -mr-1"
          >
            <span>See more on explorer</span>
            <TiArrowRight size={16} className="3xl:w-5 3xl:h-5 transform -rotate-45 mt-0.5" />
          </a>
        </div>
      )}
    </div>
  )
}
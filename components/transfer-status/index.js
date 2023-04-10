import { useSelector, shallowEqual } from 'react-redux'
import { useState, useEffect } from 'react'
import _ from 'lodash'
import moment from 'moment'
import { constants, utils } from 'ethers'
import { XTransferStatus, XTransferErrorStatus } from '@connext/nxtp-utils'
import { Tooltip } from '@material-tailwind/react'
import Fade from 'react-reveal/Fade'
import { TiArrowRight } from 'react-icons/ti'
import { HiOutlineCheckCircle } from 'react-icons/hi'
import { IoWarning } from 'react-icons/io5'
import { BsLightningChargeFill } from 'react-icons/bs'
import { BiInfoCircle } from 'react-icons/bi'

import ActionRequired from '../action-required'
import Copy from '../copy'
import DecimalsFormat from '../decimals-format'
import EnsProfile from '../ens-profile'
import Image from '../image'
import { getChain, chainName } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { toArray, ellipse, equalsIgnoreCase, loaderColor } from '../../lib/utils'

const ROUTER_FEE_PERCENT = Number(process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT)

export default (
  {
    data,
  },
) => {
  const {
    preferences,
    chains,
    assets,
    wallet,
    latest_bumped_transfers,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        wallet: state.wallet,
        latest_bumped_transfers: state.latest_bumped_transfers,
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
    wallet_data,
  } = { ...wallet }
  const {
    address,
  } = { ...wallet_data }
  const {
    latest_bumped_transfers_data,
  } = { ...latest_bumped_transfers }

  const [transferData, setTransferData] = useState(null)

  useEffect(
    () => {
      if (data) {
        setTransferData(data)
      }
    },
    [data],
  )

  const {
    transfer_id,
    status,
    error_status,
    origin_domain,
    origin_transacting_asset,
    origin_transacting_amount,
    destination_domain,
    destination_transacting_asset,
    destination_transacting_amount,
    destination_local_asset,
    receive_local,
    to,
    xcall_timestamp,
    execute_transaction_hash,
    routers,
    call_data,
  } = { ...transferData }

  const source_chain_data = getChain(origin_domain, chains_data)
  const source_asset_data = getAsset(null, assets_data, source_chain_data?.chain_id, origin_transacting_asset)

  let source_contract_data = getContract(source_chain_data?.chain_id, source_asset_data?.contracts)
  // next asset
  if (source_contract_data?.next_asset && equalsIgnoreCase(source_contract_data.next_asset.contract_address, origin_transacting_asset)) {
    source_contract_data = {
      ...source_contract_data,
      ...source_contract_data.next_asset,
    }

    delete source_contract_data.next_asset
  }
  // native asset
  if (!source_contract_data && equalsIgnoreCase(constants.AddressZero, origin_transacting_asset)) {
    const {
      nativeCurrency,
    } = { ..._.head(source_chain_data?.provider_params) }

    const {
      symbol,
    } = { ...nativeCurrency }

    const _source_asset_data = getAsset(symbol, assets_data)

    source_contract_data = {
      ...getContract(source_chain_data?.chain_id, _source_asset_data?.contracts),
      ...nativeCurrency,
      contract_address: origin_transacting_asset,
    }
  }

  const source_symbol = source_contract_data?.symbol || source_asset_data?.symbol
  const source_decimals = source_contract_data?.decimals || 18
  const source_asset_image = source_contract_data?.image || source_asset_data?.image
  const source_amount =
    origin_transacting_amount &&
    Number(
      utils.formatUnits(
        BigInt(origin_transacting_amount).toString(),
        source_decimals,
      )
    )

  const destination_chain_data = getChain(destination_domain, chains_data)
  const _asset_data = getAsset(source_asset_data?.id, assets_data, destination_chain_data?.chain_id)
  const _contract_data = getContract(destination_chain_data?.chain_id, _asset_data?.contracts)
  const destination_asset_data = getAsset(null, assets_data, destination_chain_data?.chain_id, [destination_transacting_asset, _asset_data ? receive_local ? _contract_data?.next_asset?.contract_address : _contract_data?.contract_address : destination_local_asset])

  let destination_contract_data = getContract(destination_chain_data?.chain_id, destination_asset_data?.contracts)
  // next asset
  if (destination_contract_data?.next_asset && (equalsIgnoreCase(destination_contract_data.next_asset.contract_address, destination_transacting_asset) || receive_local)) {
    destination_contract_data = {
      ...destination_contract_data,
      ...destination_contract_data.next_asset,
    }

    delete destination_contract_data.next_asset
  }
  // native asset
  const {
    nativeCurrency,
  } = { ..._.head(destination_chain_data?.provider_params) }

  const {
    symbol,
  } = { ...nativeCurrency }

  const _destination_asset_data = getAsset(symbol?.endsWith('ETH') ? 'ETH' : symbol, assets_data)

  if ((!destination_contract_data && equalsIgnoreCase(constants.AddressZero, destination_transacting_asset)) || (destination_asset_data?.id === 'eth' && _destination_asset_data?.id === 'eth' && equalsIgnoreCase(to, destination_chain_data?.unwrapper_contract))) {
    destination_contract_data = {
      ...getContract(destination_chain_data?.chain_id, _destination_asset_data?.contracts),
      ...nativeCurrency,
      contract_address: constants.AddressZero,
    }
  }

  const destination_symbol = destination_contract_data?.symbol || destination_asset_data?.symbol
  const destination_decimals = destination_contract_data?.decimals || 18
  const destination_asset_image = destination_contract_data?.image || destination_asset_data?.image
  const destination_amount =
    destination_transacting_amount ?
      Number(
        utils.formatUnits(
          BigInt(destination_transacting_amount).toString(),
          destination_decimals,
        )
      ) :
      source_amount * (1 - ROUTER_FEE_PERCENT / 100)

  const pending = ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status)
  const errored = error_status === XTransferErrorStatus.LowRelayerFee && !execute_transaction_hash && [XTransferStatus.XCalled, XTransferStatus.Reconciled].includes(status)
  const bumped = [XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.ExecutionError].includes(error_status) && toArray(latest_bumped_transfers_data).findIndex(t => equalsIgnoreCase(t.transfer_id, value) && moment().diff(moment(t.updated), 'minutes', true) <= 5) > -1

  return (
    transferData &&
    (
      <div className={`bg-slate-100 dark:bg-slate-900 max-w-xs sm:max-w-none rounded ${errored ? 'border-0 border-red-500' : pending ? 'border-0 border-blue-500' : 'border-0 border-green-500'} mx-auto py-5 px-4`}>
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-1.5">
            {
              source_chain_data?.image &&
              (
                <Image
                  src={source_chain_data.image}
                  width={20}
                  height={20}
                  className="3xl:w-6 3xl:h-6 rounded-full"
                />
              )
            }
            <span className="text-xs 3xl:text-xl font-medium">
              {chainName(source_chain_data)}
            </span>
          </div>
          {
            pending && !errored &&
            (
              <div className="flex items-center justify-center">
                <div
                  className="w-12 h-0.5 border-t border-slate-300 dark:border-slate-700 mt-px ml-2"
                />
                <Fade
                  left
                  distance="64px"
                  duration={2500}
                  forever
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={
                      {
                        background: `${source_asset_data?.color || loaderColor(theme)}aa`,
                      }
                    }
                  />
                </Fade>
              </div>
            )
          }
          <div className="flex items-center justify-end space-x-1.5">
            {
              destination_chain_data?.image &&
              (
                <Image
                  src={destination_chain_data.image}
                  width={20}
                  height={20}
                  className="3xl:w-6 3xl:h-6 rounded-full"
                />
              )
            }
            <span className="text-xs 3xl:text-xl font-medium">
              {chainName(destination_chain_data)}
            </span>
          </div>
        </div>
        <div className="flex items-start justify-between space-x-2 my-4">
          <div className="flex flex-col space-y-1.5">
            {
              typeof source_amount === 'number' &&
              (
                <DecimalsFormat
                  value={source_amount}
                  className="text-sm 3xl:text-xl"
                />
              )
            }
            <div className="flex items-center justify-start space-x-1">
              {
                source_asset_image &&
                (
                  <Image
                    src={source_asset_image}
                    width={16}
                    height={16}
                    className="3xl:w-5 3xl:h-5 rounded-full"
                  />
                )
              }
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
                  <Tooltip
                    placement="top"
                    content={error_status === XTransferErrorStatus.NoBidsReceived ? 'The transfer is not getting boosted by routers (fast path) and will complete in slow path eventually, if no new bids are received till the end.' : bumped ? 'Waiting for bump' : error_status}
                    className="z-50 bg-dark text-white text-xs"
                  >
                    <div>
                      <IoWarning
                        size={24}
                        className="text-red-600 dark:text-red-500"
                      />
                    </div>
                  </Tooltip>
                }
                onTransferBumped={
                  relayer_fee_data => {
                    if (data) {
                      setTransferData(
                        {
                          ...data,
                          ...relayer_fee_data,
                          error_status: null,
                        }
                      )
                    }
                  }
                }
                onSlippageUpdated={
                  slippage => {
                    if (data) {
                      setTransferData(
                        {
                          ...data,
                          slippage,
                          error_status: null,
                        }
                      )
                    }
                  }
                }
              /> :
              pending ?
                null :
                <a
                  href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.transaction_path?.replace('{tx}', execute_transaction_hash)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <HiOutlineCheckCircle
                    size={32}
                    className="3xl:w-10 3xl:h-10 text-green-500 dark:text-green-400"
                  />
                </a>
            }
          </div>
          <div
            className="flex flex-col items-end space-y-1.5"
            style={{ minWidth: '4rem' }}
          >
            {
              typeof destination_amount === 'number' &&
              (
                <DecimalsFormat
                  value={destination_amount}
                  className="text-sm 3xl:text-xl"
                />
              )
            }
            <div className="flex items-center justify-center space-x-1">
              {
                destination_asset_image &&
                (
                  <Image
                    src={destination_asset_image}
                    width={16}
                    height={16}
                    className="3xl:w-5 3xl:h-5 rounded-full"
                  />
                )
              }
              <span className="text-xs 3xl:text-xl font-medium">
                {destination_symbol}
              </span>
            </div>
          </div>
        </div>
        {
          to && !equalsIgnoreCase(to, address) &&
          (
            <div className="flex items-center justify-between space-x-2">
              <span className="text-sm font-medium">
                To:
              </span>
              <EnsProfile
                address={to}
                fallback={
                  <Copy
                    value={to}
                    title={
                      <span className="cursor-pointer text-slate-600 dark:text-white text-sm 3xl:text-xl">
                        <span className="sm:hidden">
                          {ellipse(to, 12)}
                        </span>
                        <span className="hidden sm:block">
                          {ellipse(to, 8)}
                        </span>
                      </span>
                    }
                  />
                }
              />
            </div>
          )
        }
        {
          xcall_timestamp &&
          (
            <div className="flex items-center justify-between mt-0.5">
              {pending && !errored ?
                <div /> :
                errored ?
                  <ActionRequired
                    forceDisabled={[XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(error_status) || bumped}
                    transferData={transferData}
                    buttonTitle={
                      <Tooltip
                        placement="top"
                        content={error_status === XTransferErrorStatus.NoBidsReceived ? 'The transfer is not getting boosted by routers (fast path) and will complete in slow path eventually, if no new bids are received till the end.' : bumped ? 'Waiting for bump' : error_status}
                        className="z-50 bg-dark text-white text-xs"
                      >
                        <span className="whitespace-nowrap text-red-600 dark:text-red-500 text-xs font-semibold">
                          {bumped ? 'Waiting for bump' : error_status}
                        </span>
                      </Tooltip>
                    }
                    onTransferBumped={
                      relayer_fee_data => {
                        if (data) {
                          setTransferData(
                            {
                              ...data,
                              ...relayer_fee_data,
                              error_status: null,
                            }
                          )
                        }
                      }
                    }
                    onSlippageUpdated={
                      slippage => {
                        if (data) {
                          setTransferData(
                            {
                              ...data,
                              slippage,
                              error_status: null,
                            }
                          )
                        }
                      }
                    }
                  /> :
                  <span>
                    {
                      call_data === '0x' &&
                      (
                        <Tooltip
                          placement="bottom"
                          content={routers?.length > 0 ? 'Boosted by routers.' : 'Pending router boost.'}
                          className="z-50 bg-dark text-white text-xs"
                        >
                          <div className="flex items-center">
                            <BsLightningChargeFill
                              size={16}
                              className={`3xl:w-5 3xl:h-5 ${routers?.length > 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-blue-300 dark:text-blue-200'}`}
                            />
                            <BiInfoCircle
                              size={14}
                              className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                            />
                          </div>
                        </Tooltip>
                      )
                    }
                  </span>
              }
              <Tooltip
                placement="top"
                content="Transferred at"
                className="z-50 bg-dark text-white text-xs"
              >
                <div className="flex items-center">
                  <span className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl font-medium">
                    {moment(xcall_timestamp * 1000).format('MMM D, YYYY h:mm:ss A')}
                  </span>
                </div>
              </Tooltip>
            </div>
          )
        }
        {
          transfer_id &&
          (
            <div className="flex items-center justify-end mt-1 -mb-2">
              <a
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transfer_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-500 dark:text-blue-500 text-xs 3xl:text-xl font-medium space-x-0 -mr-1"
              >
                <span>
                  See more on explorer
                </span>
                <TiArrowRight
                  size={16}
                  className="3xl:w-5 3xl:h-5 transform -rotate-45 mt-0.5"
                />
              </a>
            </div>
          )
        }
      </div>
    )
  )
}
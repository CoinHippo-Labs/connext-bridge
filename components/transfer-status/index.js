import { useSelector, shallowEqual } from 'react-redux'
import { useState, useEffect } from 'react'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, constants, utils } from 'ethers'
import { XTransferStatus } from '@connext/nxtp-utils'
import { Tooltip } from '@material-tailwind/react'
import Fade from 'react-reveal/Fade'
import { TiArrowRight } from 'react-icons/ti'
import { HiOutlineCheckCircle } from 'react-icons/hi'
import { IoWarning } from 'react-icons/io5'
import { BsLightningCharge } from 'react-icons/bs'
import { BiInfoCircle } from 'react-icons/bi'

import ActionRequired from '../action-required'
import Image from '../image'
import EnsProfile from '../ens-profile'
import Copy from '../copy'
import DecimalsFormat from '../decimals-format'
import { chainName } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

const ROUTER_FEE_PERCENT =
  Number(
    process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT
  ) ||
  0.05

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
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        wallet: state.wallet,
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
    origin_chain,
    origin_domain,
    origin_transacting_asset,
    origin_transacting_amount,
    origin_bridged_asset,
    origin_bridged_amount,
    destination_chain,
    destination_domain,
    destination_transacting_asset,
    destination_transacting_amount,
    destination_local_asset,
    destination_local_amount,
    receive_local,
    to,
    xcall_timestamp,
    reconcile_transaction_hash,
    execute_transaction_hash,
    execute_timestamp,
  } = { ...transferData }
  let {
    force_slow,
  } = { ...transferData }

  force_slow =
    force_slow ||
    (status || '')
      .toLowerCase()
      .includes('slow') ||
    !!(
      reconcile_transaction_hash &&
      !execute_transaction_hash
    )

  const source_chain_data = (chains_data || [])
    .find(c =>
      c?.chain_id === Number(origin_chain) ||
      c?.domain_id === origin_domain
    )

  const source_asset_data = (assets_data || [])
    .find(a =>
      (a?.contracts || [])
        .findIndex(c =>
          c?.chain_id === source_chain_data?.chain_id &&
          [
            origin_transacting_asset,
            origin_bridged_asset,
          ].findIndex(_a =>
            [
              c?.next_asset?.contract_address,
              c?.contract_address,
            ]
            .filter(__a => __a)
            .findIndex(__a =>
              equals_ignore_case(
                __a,
                _a,
              )
            ) > -1
          ) > -1
        ) > -1
    )

  let source_contract_data = (source_asset_data?.contracts || [])
    .find(c =>
      c?.chain_id === source_chain_data?.chain_id
    )

  if (
    source_contract_data?.next_asset &&
    equals_ignore_case(
      source_contract_data.next_asset.contract_address,
      origin_transacting_asset,
    )
  ) {
    source_contract_data = {
      ...source_contract_data,
      ...source_contract_data.next_asset,
    }

    delete source_contract_data.next_asset
  }

  if (
    !source_contract_data &&
    equals_ignore_case(
      origin_transacting_asset,
      constants.AddressZero,
    )
  ) {
    const {
      nativeCurrency,
    } = {
      ...(
        _.head(source_chain_data?.provider_params)
      ),
    }
    const {
      symbol,
    } = { ...nativeCurrency }

    const _source_asset_data = (assets_data || [])
      .find(a =>
        [
          a?.id,
          a?.symbol,
        ].findIndex(s =>
          equals_ignore_case(
            s,
            symbol,
          )
        ) > -1
      )

    source_contract_data = {
      ...(
        (_source_asset_data?.contracts || [])
          .find(c =>
            c?.chain_id === source_chain_data?.chain_id,
          )
      ),
      contract_address: origin_transacting_asset,
      ...nativeCurrency,
    }
  }

  const source_symbol =
    source_contract_data?.symbol ||
    source_asset_data?.symbol

  const source_decimals =
    source_contract_data?.decimals ||
    18

  const source_asset_image =
    source_contract_data?.image ||
    source_asset_data?.image

  const source_amount =
    _.head(
      [
        origin_transacting_amount,
      ]
      .map(a =>
        [
          'number',
          'string',
        ].includes(typeof a) &&
        Number(
          utils.formatUnits(
            BigNumber.from(
              BigInt(a)
                .toString()
            ),
            source_decimals,
          )
        )
      )
      .filter(a =>
        typeof a === 'number'
      )
    )

  const destination_chain_data = (chains_data || [])
    .find(c =>
      c?.chain_id === Number(destination_chain) ||
      c?.domain_id === destination_domain
    )

  const destination_asset_data = (assets_data || [])
    .find(a =>
      (a?.contracts || [])
        .findIndex(c =>
          c?.chain_id === destination_chain_data?.chain_id &&
          [
            destination_transacting_asset,
            equals_ignore_case(
              source_asset_data?.id,
              a?.id,
            ) ?
              receive_local ?
                c?.next_asset?.contract_address :
                c?.contract_address :
              destination_local_asset,
          ].findIndex(_a =>
            [
              c?.next_asset?.contract_address,
              c?.contract_address,
            ]
            .filter(__a => __a)
            .findIndex(__a =>
              equals_ignore_case(
                __a,
                _a,
              )
            ) > -1
          ) > -1
        ) > -1
    )

  let destination_contract_data = (destination_asset_data?.contracts || [])
    .find(c =>
      c?.chain_id === destination_chain_data?.chain_id
    )

  if (
    destination_contract_data?.next_asset &&
    (
      equals_ignore_case(
        destination_contract_data.next_asset.contract_address,
        destination_transacting_asset,
      ) ||
      receive_local
    )
  ) {
    destination_contract_data = {
      ...destination_contract_data,
      ...destination_contract_data.next_asset,
    }

    delete destination_contract_data.next_asset
  }

  if (
    !destination_contract_data &&
    equals_ignore_case(
      destination_transacting_asset,
      constants.AddressZero,
    )
  ) {
    const {
      nativeCurrency,
    } = {
      ...(
        _.head(destination_chain_data?.provider_params)
      ),
    }
    const {
      symbol,
    } = { ...nativeCurrency }

    const _destination_asset_data = (assets_data || [])
      .find(a =>
        [
          a?.id,
          a?.symbol,
        ].findIndex(s =>
          equals_ignore_case(
            s,
            symbol,
          )
        ) > -1
      )

    destination_contract_data = {
      ...(
        (_destination_asset_data?.contracts || [])
          .find(c =>
            c?.chain_id === destination_chain_data?.chain_id,
          )
      ),
      contract_address: destination_transacting_asset,
      ...nativeCurrency,
    }
  }

  const destination_symbol =
    destination_contract_data?.symbol ||
    destination_asset_data?.symbol

  const destination_decimals =
    destination_contract_data?.decimals ||
    18

  const destination_asset_image =
    destination_contract_data?.image ||
    destination_asset_data?.image

  const destination_amount =
    _.head(
      [
        destination_transacting_amount,
      ]
      .map(a =>
        [
          'number',
          'string',
        ].includes(typeof a) &&
        Number(
          utils.formatUnits(
            BigNumber.from(
              BigInt(a)
                .toString()
            ),
            destination_decimals,
          )
        )
      )
      .filter(a =>
        typeof a === 'number'
      )
    ) ||
    (
      source_amount *
      (
        1 -
        ROUTER_FEE_PERCENT / 100
      )
    )

  const pending =
    ![
      XTransferStatus.Executed,
      XTransferStatus.CompletedFast,
      XTransferStatus.CompletedSlow,
    ]
    .includes(status)

  const errored =
    error_status &&
    ![
      XTransferStatus.CompletedFast,
      XTransferStatus.CompletedSlow,
    ]
    .includes(status)

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
                  className="rounded-full"
                />
              )
            }
            <span className="text-xs font-medium">
              {chainName(source_chain_data)}
            </span>
          </div>
          {
            pending &&
            !errored &&
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
                        background:
                          `${source_asset_data?.color ||
                          loader_color(theme)}aa`,
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
                  className="rounded-full"
                />
              )
            }
            <span className="text-xs font-medium">
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
                  value={
                    number_format(
                      source_amount,
                      '0,0.000000',
                      true,
                    )
                  }
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
                    className="rounded-full"
                  />
                )
              }
              <span className="text-xs font-medium">
                {source_symbol}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            {
              errored ?
                <ActionRequired
                  transferData={transferData}
                  buttonTitle={
                    <Tooltip
                      placement="top"
                      content={error_status}
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
                    relayer_fee => {
                      if (data) {
                        setTransferData(
                          {
                            ...data,
                            relayer_fee,
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
                      className="text-green-500 dark:text-green-400"
                    />
                  </a>
            }
          </div>
          <div
            className="flex flex-col items-end space-y-1.5"
            style={
              {
                minWidth: '4rem',
              }
            }
          >
            {
              typeof destination_amount === 'number' &&
              (
                <DecimalsFormat
                  value={
                    number_format(
                      destination_amount,
                      '0,0.000000',
                      true,
                    )
                  }
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
                    className="rounded-full"
                  />
                )
              }
              <span className="text-xs font-medium">
                {destination_symbol}
              </span>
            </div>
          </div>
        </div>
        {
          to &&
          !equals_ignore_case(
            to,
            address,
          ) &&
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
                      <span className="cursor-pointer text-slate-600 dark:text-white text-sm">
                        <span className="sm:hidden">
                          {ellipse(
                            to,
                            12,
                          )}
                        </span>
                        <span className="hidden sm:block">
                          {ellipse(
                            to,
                            8,
                          )}
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
              {
                pending &&
                !errored ?
                  <div /> :
                  errored ?
                    <ActionRequired
                      transferData={transferData}
                      buttonTitle={
                        <Tooltip
                          placement="top"
                          content={error_status}
                          className="z-50 bg-dark text-white text-xs"
                        >
                          <span className="whitespace-nowrap text-red-600 dark:text-red-500 text-xs font-semibold">
                            Action required
                          </span>
                        </Tooltip>
                      }
                      onTransferBumped={
                        relayer_fee => {
                          if (data) {
                            setTransferData(
                              {
                                ...data,
                                relayer_fee,
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
                        !force_slow &&
                        (
                          <Tooltip
                            placement="bottom"
                            content="Boosted by router liquidity."
                            className="z-50 bg-dark text-white text-xs"
                          >
                            <div className="flex items-center">
                              <BsLightningCharge
                                size={16}
                                className="text-yellow-600 dark:text-yellow-400"
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
                  <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                    {
                      moment(
                        xcall_timestamp * 1000
                      )
                      .format('MMM D, YYYY h:mm:ss A')
                    }
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
                className="flex items-center text-blue-500 dark:text-blue-500 text-xs font-medium space-x-0 -mr-1"
              >
                <span>
                  See more on explorer
                </span>
                <TiArrowRight
                  size={16}
                  className="transform -rotate-45 mt-0.5"
                />
              </a>
            </div>
          )
        }
      </div>
    )
  )
}
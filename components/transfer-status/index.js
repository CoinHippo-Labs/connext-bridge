import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { XTransferStatus } from '@connext/nxtp-utils'
import { TailSpin } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import Fade from 'react-reveal/Fade'
import { TiArrowRight } from 'react-icons/ti'
import { HiOutlineCheckCircle } from 'react-icons/hi'

import Image from '../image'
import EnsProfile from '../ens-profile'
import AddToken from '../add-token'
import Copy from '../copy'
import TimeSpent from '../time-spent'
import { chainName } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

const ROUTER_FEE_PERCENT =
  Number(
    process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT
  ) ||
  0.05

export default ({
  data,
}) => {
  const {
    preferences,
    chains,
    assets,
    dev,
    wallet,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        dev: state.dev,
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

  const {
    transfer_id,
    status,
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
    to,
    xcall_timestamp,
    reconcile_transaction_hash,
    execute_transaction_hash,
    execute_timestamp,
  } = { ...data }
  let {
    force_slow,
  } = { ...data }

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
            origin_bridged_asset,
            origin_transacting_asset,
          ].findIndex(a =>
            equals_ignore_case(
              c?.contract_address,
              a,
            )
          ) > -1
        ) > -1
    )
  const source_contract_data = (source_asset_data?.contracts || [])
    .find(c =>
      c?.chain_id === source_chain_data?.chain_id
    )
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
        origin_bridged_amount,
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
      .filter(a => a)
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
            destination_local_asset,
          ].findIndex(a =>
            equals_ignore_case(
              c?.contract_address,
              a,
            )
          ) > -1
        ) > -1
    )
  const destination_contract_data = (destination_asset_data?.contracts || [])
    .find(c =>
      c?.chain_id === destination_chain_data?.chain_id
    )
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
        // destination_local_amount,
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
      .filter(a => a)
    ) ||
    source_amount *
    (
      1 -
      ROUTER_FEE_PERCENT / 100
    )

  const pending =
    ![
      XTransferStatus.Executed,
      XTransferStatus.CompletedFast,
      XTransferStatus.CompletedSlow,
    ].includes(status)

  return data &&
    (
      <div className={`bg-zinc-50 dark:bg-zinc-900 max-w-xs sm:max-w-none rounded-xl ${pending ? 'border-0 border-blue-500' : 'border-0 border-green-500'} mx-auto py-5 px-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            {
              source_chain_data?.image &&
              (
                <Image
                  src={source_chain_data.image}
                  alt=""
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
                    style={{
                      background:
                        `${source_asset_data?.color ||
                        loader_color(theme)}aa`,
                    }}
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
                  alt=""
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
          <div className="flex flex-col space-y-1">
            {
              typeof source_amount === 'number' &&
              (
                <span className="font-semibold">
                  {number_format(
                    source_amount,
                    '0,0.000000',
                    true,
                  )}
                </span>
              )
            }
            <div className="flex items-center justify-center space-x-1">
              {
                source_asset_image &&
                (
                  <Image
                    src={source_asset_image}
                    alt=""
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                )
              }
              <span className="text-xs font-medium">
                {source_symbol}
              </span>
              {
                false &&
                source_asset_data &&
                (
                  <AddToken
                    token_data={{
                      ...source_asset_data,
                      ...source_contract_data,
                    }}
                  />
                )
              }
            </div>
          </div>
          <div className="flex flex-col items-center">
            {
              pending ?
                <TimeSpent
                  title="Time spent"
                  from_time={xcall_timestamp}
                  to_time={execute_timestamp}
                  className={`${pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-400'} font-semibold`}
                /> :
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
            className="flex flex-col items-end space-y-1"
            style={{ minWidth: '4rem' }}
          >
            {
              typeof destination_amount === 'number' &&
              (
                <span className="font-semibold">
                  {number_format(
                    destination_amount,
                    '0,0.000000',
                    true,
                  )}
                </span>
              )
            }
            <div className="flex items-center justify-center space-x-1">
              {
                destination_asset_image &&
                (
                  <Image
                    src={destination_asset_image}
                    alt=""
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                )
              }
              <span className="text-xs font-medium">
                {destination_symbol}
              </span>
              {
                false &&
                destination_asset_data &&
                (
                  <AddToken
                    token_data={{
                      ...destination_asset_data,
                      ...destination_contract_data,
                    }}
                  />
                )
              }
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
              <span className="text-sm font-normal">
                To:
              </span>
              <EnsProfile
                address={to}
                fallback={(
                  <Copy
                    value={to}
                    title={<span className="cursor-pointer text-slate-600 dark:text-white text-sm">
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
                    </span>}
                  />
                )}
              />
            </div>
          )
        }
        {
          xcall_timestamp &&
          (
            <div className="flex items-center justify-between mt-0.5">
              {pending ?
                <div className="flex items-center space-x-1">
                  <div className="tracking-normal whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs font-medium">
                    Est. time:
                  </div>
                  <Tooltip
                    placement="top"
                    content={
                      force_slow ?
                        'Unable to leverage fast liquidity. Your transfer will still complete.' :
                        'Fast transfer enabled by Connext router network.'
                    }
                    className="z-50 bg-black text-white text-xs"
                  >
                    <span className="tracking-normal whitespace-nowrap text-xs font-semibold space-x-1.5">
                      {
                        force_slow ?
                          <span className="text-yellow-500 dark:text-yellow-400">
                            90 mins
                          </span> :
                          <span className="text-green-500 dark:text-green-500">
                            4 mins
                          </span>
                      }
                    </span>
                  </Tooltip>
                </div> :
                <span>
                  {
                    force_slow &&
                    (
                      <div className={`rounded-lg border ${status === XTransferStatus.CompletedSlow ? 'border-green-500 dark:border-green-500 text-green-400 dark:text-green-400' : 'border-blue-500 dark:border-blue-500 text-blue-400 dark:text-blue-400'} flex items-center space-x-1 py-0.5 px-1.5`}>
                        <span className="uppercase text-xs font-bold">
                          Slow
                        </span>
                      </div>
                    )
                  }
                </span>
              }
              <Tooltip
                placement="top"
                content={
                  /*moment(
                    xcall_timestamp * 1000
                  )
                  .format('MMM D, YYYY h:mm:ss A')*/
                  'Transferred at'
                }
                className="z-50 bg-black text-white text-xs"
              >
                <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                  {
                    moment(
                      xcall_timestamp * 1000
                    )
                    .format('MMM D, YYYY h:mm:ss A')
                    // .fromNow()
                  }
                </span>
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
}
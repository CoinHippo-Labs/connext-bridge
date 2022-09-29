import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { XTransferStatus } from '@connext/nxtp-utils'
import { TailSpin } from 'react-loader-spinner'
import LightSpeed from 'react-reveal/LightSpeed'
import Fade from 'react-reveal/Fade'
import { TiArrowRight } from 'react-icons/ti'
import { HiOutlineCheckCircle } from 'react-icons/hi'

import Image from '../image'
import EnsProfile from '../ens-profile'
import AddToken from '../add-token'
import Copy from '../copy'
import { chainName } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

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
    destination_chain,
    destination_domain,
    destination_transacting_asset,
    destination_transacting_amount,
    execute_transaction_hash,
    to,
    force_slow,
    xcall_timestamp,
  } = { ...data }

  const source_chain_data = chains_data?.find(c =>
    c?.chain_id === Number(origin_chain) ||
    c?.domain_id === origin_domain
  )
  const source_asset_data = assets_data?.find(a =>
    a?.contracts?.findIndex(c =>
      c?.chain_id === source_chain_data?.chain_id &&
      equals_ignore_case(c?.contract_address, origin_transacting_asset)
    ) > -1
  )
  const source_contract_data = source_asset_data?.contracts?.find(c =>
    c?.chain_id === source_chain_data?.chain_id
  )
  const source_symbol = source_contract_data?.symbol ||
    source_asset_data?.symbol
  const source_decimals = source_contract_data?.decimals ||
    18
  const source_asset_image = source_contract_data?.image ||
    source_asset_data?.image
  const source_amount = [
    'number',
    'string',
  ].includes(typeof origin_transacting_amount) &&
    Number(
      utils.formatUnits(
        BigNumber.from(
          BigInt(origin_transacting_amount).toString()
        ),
        source_decimals,
      )
    )

  const destination_chain_data = chains_data?.find(c =>
    c?.chain_id === Number(destination_chain) ||
    c?.domain_id === destination_domain
  )
  const destination_asset_data = assets_data?.find(a =>
    a?.contracts?.findIndex(c =>
      c?.chain_id === destination_chain_data?.chain_id &&
      equals_ignore_case(c?.contract_address, destination_transacting_asset)
    ) > -1
  )
  const destination_contract_data = destination_asset_data?.contracts?.find(c =>
    c?.chain_id === destination_chain_data?.chain_id
  )
  const destination_symbol = destination_contract_data?.symbol ||
    destination_asset_data?.symbol
  const destination_decimals = destination_contract_data?.decimals ||
    18
  const destination_asset_image = destination_contract_data?.image ||
    destination_asset_data?.image
  const destination_amount = [
    'number',
    'string',
  ].includes(typeof destination_transacting_amount) &&
    Number(
      utils.formatUnits(
        BigNumber.from(
          BigInt(destination_transacting_amount).toString()
        ),
        destination_decimals,
      )
    )

  const pending = ![
    XTransferStatus.Executed,
    XTransferStatus.CompletedFast,
    XTransferStatus.CompletedSlow,
  ].includes(status)

  return data &&
    (
      <div className={`bg-zinc-100 dark:bg-zinc-900 max-w-xs sm:max-w-none rounded-xl ${pending ? 'border border-blue-500 shadow shadow-blue-500' : 'border-2 border-green-500'} mx-auto py-5 px-4`}>
        <div className="flex items-center justify-end -mt-2">
          <a
            href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transfer_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-blue-500 dark:text-blue-500 space-x-0.5 -mr-2"
          >
            <span>
              See more on explorer
            </span>
            <TiArrowRight
              size={20}
              className="transform -rotate-45 mt-0.5"
            />
          </a>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center space-x-1.5">
            {source_chain_data?.image && (
              <Image
                src={source_chain_data.image}
                alt=""
                width={20}
                height={20}
                className="rounded-full"
              />
            )}
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
                      background: `${source_asset_data?.color ||
                        loader_color(theme)}aa`,
                    }}
                  />
                </Fade>
              </div>
            )
          }
          <div className="flex items-center justify-end space-x-1.5">
            {destination_chain_data?.image && (
              <Image
                src={destination_chain_data.image}
                alt=""
                width={20}
                height={20}
                className="rounded-full"
              />
            )}
            <span className="text-xs font-medium">
              {chainName(destination_chain_data)}
            </span>
          </div>
        </div>
        <div className="flex items-start justify-between space-x-2 my-2.5">
          <LightSpeed left>
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
                {source_asset_image && (
                  <Image
                    src={source_asset_image}
                    alt=""
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                )}
                <span className="text-xs font-medium">
                  {source_symbol}
                </span>
                {source_asset_data && (
                  <AddToken
                    token_data={{
                      ...source_asset_data,
                      ...source_contract_data,
                    }}
                  />
                )}
              </div>
            </div>
          </LightSpeed>
          <div className="flex flex-col items-center">
            {
              !pending &&
              (
                <a
                  href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.transaction_path?.replace('{tx}', execute_transaction_hash)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <HiOutlineCheckCircle
                    size={36}
                    className="text-green-500 dark:text-green-400"
                  />
                </a>
              )
            }
          </div>
          <LightSpeed left>
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
                {destination_asset_image && (
                  <Image
                    src={destination_asset_image}
                    alt=""
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                )}
                <span className="text-xs font-medium">
                  {destination_symbol}
                </span>
                {destination_asset_data && (
                  <AddToken
                    token_data={{
                      ...destination_asset_data,
                      ...destination_contract_data,
                    }}
                  />
                )}
              </div>
            </div>
          </LightSpeed>
        </div>
        {
          to &&
          !equals_ignore_case(to, address) &&
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
            <div className="flex items-center justify-between">
              <span>
                {force_slow && (
                  <div className={`rounded-lg border ${status === XTransferStatus.CompletedSlow ? 'border-green-500 dark:border-green-500 text-green-400 dark:text-green-400' : 'border-blue-500 dark:border-blue-500 text-blue-400 dark:text-blue-400'} flex items-center space-x-1 py-0.5 px-1.5`}>
                    <span className="uppercase text-xs font-bold">
                      Slow
                    </span>
                  </div>
                )}
              </span>
              <span
                title={moment(xcall_timestamp * 1000).format('MMM D, YYYY h:mm:ss A')}
                className="text-slate-400 dark:text-slate-200 text-xs"
              >
                {moment(xcall_timestamp * 1000).fromNow()}
              </span>
            </div>
          )
        }
      </div>
    )
}
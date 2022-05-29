import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { XTransferStatus } from '@connext/nxtp-utils'
import { Bars, RotatingSquare } from 'react-loader-spinner'
import LightSpeed from 'react-reveal/LightSpeed'
import { TiArrowRight } from 'react-icons/ti'
import { HiCheckCircle } from 'react-icons/hi'

import Image from '../image'
import EnsProfile from '../ens-profile'
import AddToken from '../add-token'
import Copy from '../copy'
import { chainName } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

export default ({ data }) => {
  const { preferences, chains, assets, dev, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, dev: state.dev, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }

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
  const source_chain_data = chains_data?.find(c => c?.chain_id === Number(origin_chain) || c?.domain_id === Number(origin_domain))
  const source_asset_data = assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === source_chain_data?.chain_id && equals_ignore_case(c?.contract_address, origin_transacting_asset)) > -1)
  const source_contract_data = source_asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)
  const source_symbol = source_contract_data?.symbol || source_asset_data?.symbol
  const source_decimals = source_contract_data?.contract_decimals || 18
  const source_asset_image = source_contract_data?.image || source_asset_data?.image
  const source_amount = ['number', 'string'].includes(typeof origin_transacting_amount) && Number(utils.formatUnits(BigNumber.from(BigInt(origin_transacting_amount).toString()), source_decimals))
  const destination_chain_data = chains_data?.find(c => c?.chain_id === Number(destination_chain) || c?.domain_id === Number(destination_domain))
  const destination_asset_data = assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === destination_chain_data?.chain_id && equals_ignore_case(c?.contract_address, destination_transacting_asset)) > -1)
  const destination_contract_data = destination_asset_data?.contracts?.find(c => c?.chain_id === destination_chain_data?.chain_id)
  const destination_symbol = destination_contract_data?.symbol || destination_asset_data?.symbol
  const destination_decimals = destination_contract_data?.contract_decimals || 18
  const destination_asset_image = destination_contract_data?.image || destination_asset_data?.image
  const destination_amount = ['number', 'string'].includes(typeof destination_transacting_amount) && Number(utils.formatUnits(BigNumber.from(BigInt(destination_transacting_amount).toString()), destination_decimals))

  const pending = ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status)

  return data && (
    <div className={`rounded-xl ${pending ? 'border-2 border-blue-500 shadow shadow-blue-500' : 'border border-green-500 shadow shadow-green-500'} p-4`}>
      <div className="flex items-center justify-between space-x-2">
        <Copy
          value={transfer_id}
          title={<span className="cursor-pointer text-slate-700 dark:text-slate-300 text-sm font-bold">
            <span className="sm:hidden">
              {ellipse(transfer_id, 12)}
            </span>
            <span className="hidden sm:block">
              {ellipse(transfer_id, 8)}
            </span>
          </span>}
          size={18}
        />
        <a
          href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${transfer_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 dark:text-white"
        >
          <TiArrowRight size={20} className="transform -rotate-45" />
        </a>
      </div>
      <div className="flex items-start justify-between space-x-2 mt-3">
        <div className="flex items-center space-x-1">
          {source_chain_data?.image && (
            <Image
              src={source_chain_data.image}
              alt=""
              width={20}
              height={20}
              className="rounded-full"
            />
          )}
          <span className="text-xs font-semibold">
            {chainName(source_chain_data)}
          </span>
        </div>
        <div className="flex items-center justify-end space-x-1">
          {destination_chain_data?.image && (
            <Image
              src={destination_chain_data.image}
              alt=""
              width={20}
              height={20}
              className="rounded-full"
            />
          )}
          <span className="text-xs font-semibold">
            {chainName(destination_chain_data)}
          </span>
        </div>
      </div>
      <div className="flex items-start justify-between space-x-2 my-2">
        <LightSpeed left>
          <div className="flex flex-col">
            {source_amount ?
              <span className="font-mono font-bold">
                {number_format(source_amount, '0,0.000000', true)}
              </span>
              :
              <RotatingSquare color={loader_color(theme)} width="20" height="20" />
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
              <span className="text-xs font-semibold">
                {source_symbol}
              </span>
              {source_asset_data && (
                <AddToken
                  token_data={{ ...source_asset_data, ...source_contract_data }}
                />
              )}
            </div>
          </div>
        </LightSpeed>
        <div className="flex flex-col items-center">
          {!pending ?
            <a
              href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.transaction_path?.replace('{tx}', execute_transaction_hash)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <HiCheckCircle size={36} className="rounded-full shadow dark:shadow-white text-green-400 dark:text-green-200" />
            </a>
            :
            <Bars color={loader_color('light')} width="32" height="32" />
          }
        </div>
        <LightSpeed left>
          <div className="flex flex-col items-end" style={{ minWidth: '4rem' }}>
            {destination_amount ?
              <span className="font-mono font-bold">
                {number_format(destination_amount, '0,0.000000', true)}
              </span>
              :
              <RotatingSquare color={loader_color(theme)} width="20" height="20" />
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
              <span className="text-xs font-semibold">
                {destination_symbol}
              </span>
              {destination_asset_data && (
                <AddToken
                  token_data={{ ...destination_asset_data, ...destination_contract_data }}
                />
              )}
            </div>
          </div>
        </LightSpeed>
      </div>
      {to && !equals_ignore_case(to, address) && (
        <div className="flex items-center justify-between space-x-2">
          <span className="text-sm font-semibold">
            To:
          </span>
          <EnsProfile
            address={to}
            fallback={(
              <Copy
                value={to}
                title={<span className="text-slate-400 dark:text-white text-sm">
                  <span className="sm:hidden">
                    {ellipse(to, 12)}
                  </span>
                  <span className="hidden sm:block">
                    {ellipse(to, 8)}
                  </span>
                </span>}
                size={18}
              />
            )}
          />
        </div>
      )}
      {xcall_timestamp && (
        <div className="flex items-center justify-between">
          <span>
            {force_slow && (
              <div className={`rounded-lg border ${status === XTransferStatus.CompletedSlow ? 'border-green-500 dark:border-green-300 text-green-500 dark:text-green-300' : 'border-blue-500 dark:border-blue-300 text-blue-500 dark:text-blue-300'} flex items-center space-x-1 py-0.5 px-1.5`}>
                <span className="uppercase text-xs font-bold">
                  Slow
                </span>
              </div>
            )}
          </span>
          <span
            title={moment(xcall_timestamp * 1000).format('MMM D, YYYY h:mm:ss A')}
            className="text-slate-400 dark:text-slate-400 text-xs"
          >
            {moment(xcall_timestamp * 1000).fromNow()}
          </span>
        </div>
      )}
    </div>
  )
}
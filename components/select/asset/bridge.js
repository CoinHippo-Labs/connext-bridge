import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Puff } from 'react-loader-spinner'
import { IoRadioButtonOn } from 'react-icons/io5'
import { BiCode } from 'react-icons/bi'

import Balance from '../../balance'
import Image from '../../image'
import Search from './search'
import Modal from '../../modals'
import { chainName } from '../../../lib/object/chain'
import { loader_color } from '../../../lib/utils'

export default ({
  disabled = false,
  value,
  onSelect,
  source_chain,
  destination_chain,
}) => {
  const { preferences, chains, assets, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { web3_provider } = { ...wallet_data }

  const [hidden, setHidden] = useState(true)

  const onClick = id => {
    if (onSelect) {
      onSelect(id)
    }
    setHidden(!hidden)
  }

  const source_chain_data = chains_data?.find(c => c?.id === source_chain)
  const destination_chain_data = chains_data?.find(c => c?.id === destination_chain)
  const asset_data = assets_data?.find(c => c?.id === value)
  const source_contract_data = asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)
  const destination_contract_data = asset_data?.contracts?.find(c => c?.chain_id === destination_chain_data?.chain_id)
  const {
    image,
  } = { ...asset_data }
  const source_image = source_contract_data?.image || image
  const destination_image = destination_contract_data?.image || image

  return (
    <Modal
      id="modal-assets"
      noButtons={true}
      hidden={hidden}
      disabled={disabled}
      onClick={open => setHidden(!open)}
      buttonTitle={
        <>
          {assets_data ?
            <>
              {/*<div className="space-y-1 mx-auto">
                {web3_provider && source_contract_data && (
                  <>
                    <div className="text-slate-400 dark:text-slate-600 text-xs font-medium">
                      Balance
                    </div>
                    <Balance
                      chainId={source_chain_data?.chain_id}
                      asset={value}
                    />
                  </>
                )}
              </div>*/}
              <div className="sm:col-span-3 w-full min-w-max flex items-center justify-center space-x-1.5">
                {image && (
                  <div>
                    <div className="hidden sm:flex">
                      <Image
                        src={image}
                        alt=""
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    </div>
                    <div className="flex sm:hidden">
                      <Image
                        src={image}
                        alt=""
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </div>
                  </div>
                )}
                <span className="text-sm sm:text-lg font-semibold">
                  {asset_data ? asset_data.symbol : 'Select Token'}
                </span>
              </div>
              {/*<div className="space-y-1 mx-auto">
                {web3_provider && destination_contract_data && (
                  <>
                    <div className="text-slate-400 dark:text-slate-600 text-xs font-medium">
                      Balance
                    </div>
                    <Balance
                      chainId={destination_chain_data?.chain_id}
                      asset={value}
                    />
                  </>
                )}
              </div>*/}
            </>
            :
            <div className="sm:col-span-3 w-full flex items-center justify-center">
              <Puff color={loader_color(theme)} width="24" height="24" />
            </div>
          }
        </>
      }
      buttonClassName={`w-full min-w-max h-20 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl shadow dark:shadow-slate-500 ${disabled ? 'cursor-not-allowed' : ''} grid grid-flow-row grid-cols-3 sm:grid-cols-3 items-center gap-2 py-2 px-3`}
      buttonStyle={{ background: asset_data?.color ? `${asset_data.color}28` : null }}
      title={<div className="flex items-center justify-between">
        <span>
          Select Token
        </span>
        {source_chain_data && destination_chain_data && (
          <div className="flex items-center space-x-2">
            {source_chain_data && (
              <div className="flex items-center space-x-2">
                {source_chain_data.image && (
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
            )}
            <BiCode size={20} />
            {destination_chain_data && (
              <div className="flex items-center space-x-2">
                {destination_chain_data.image && (
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
            )}
          </div>
        )}
      </div>}
      body={(
        <Search
          value={value}
          onSelect={id => onClick(id)}
          chain={source_chain}
        />
      )}
    />
  )
}
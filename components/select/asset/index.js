import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Puff } from 'react-loader-spinner'
import { IoRadioButtonOn } from 'react-icons/io5'
import { BiChevronDown } from 'react-icons/bi'

import Image from '../../image'
import Search from './search'
import Modal from '../../modals'
import { chainName } from '../../../lib/object/chain'
import { loader_color } from '../../../lib/utils'

export default (
  {
    disabled = false,
    fixed = false,
    value,
    onSelect,
    chain,
    origin = 'from',
    is_pool = false,
    is_bridge = false,
    show_next_assets = false,
    show_native_assets = false,
    data,
    className = '',
  },
) => {
  const {
    preferences,
    chains,
    assets,
    pool_assets,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        pool_assets: state.pool_assets,
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
    pool_assets_data,
  } = { ...pool_assets }

  const [hidden, setHidden] = useState(true)

  const onClick = (
    id,
    address,
  ) => {
    if (onSelect) {
      onSelect(
        id,
        address,
      )
    }

    setHidden(!hidden)
  }

  const chain_data = (chains_data || [])
    .find(c =>
      c?.id === chain
    )
  const {
    chain_id,
  } = { ...chain_data }

  const _assets_data =
    is_pool ?
      pool_assets_data :
      assets_data

  const asset_data =
    data ||
    (_assets_data || [])
      .find(c =>
        c?.id === value
      )
  const {
    contracts,
  } = { ...asset_data }

  const contract_data = (contracts || [])
    .find(c =>
      c?.chain_id === chain_id
    )
  let {
    symbol,
    image,
  } = { ...contract_data }

  symbol =
    is_pool ?
      data?.symbol ||
      asset_data?.symbol ||
      'Select token' :
      data?.symbol ||
      symbol ||
      asset_data?.symbol ||
      'Token'
  image =
    is_pool &&
    !data ?
      asset_data?.image ||
      image :
      image ||
      asset_data?.image

  return (
    <Modal
      id="modal-assets"
      noButtons={true}
      hidden={hidden}
      disabled={
        disabled ||
        fixed
      }
      onClick={open => setHidden(!open)}
      buttonTitle={
        _assets_data ?
          <div
            className={
              fixed ?
                'cursor-default flex items-center space-x-1.5 sm:space-x-2 sm:-ml-1' :
                className ||
                'w-32 sm:w-48 min-w-max bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded border dark:border-slate-700 flex items-center justify-between space-x-1.5 sm:space-x-2 py-1.5 sm:py-2 px-2 sm:px-3'
            }
          >
            {
              image &&
              (
                <>
                  <div className="flex sm:hidden">
                    <Image
                      src={image}
                      alt=""
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  </div>
                  <div className="hidden sm:flex">
                    <Image
                      src={image}
                      alt=""
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  </div>
                </>
              )
            }
            <span className={`whitespace-nowrap sm:text-lg font-semibold ${!image ? 'sm:ml-3' : ''}`}>
              {symbol}
            </span>
            {
              !fixed &&
              (
                <BiChevronDown
                  size={18}
                  className="text-slate-400 dark:text-slate-200"
                />
              )
            }
          </div> :
          <Puff
            color={loader_color(theme)}
            width="24"
            height="24"
          />
      }
      buttonClassName={
        className ||
        `w-32 sm:w-48 min-w-max h-10 sm:h-12 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`
      }
      title={
        <div className="flex items-center justify-between space-x-2">
          <span className="flex items-center uppercase space-x-1">
            <span>
              {
                origin ||
                'select'
              }
            </span>
            <span>
              Token
            </span>
          </span>
          {
            chain_data &&
            (
              <div className="flex items-center space-x-2">
                {
                  chain_data.image &&
                  (
                    <Image
                      src={chain_data.image}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )
                }
                <span className="font-semibold">
                  {chainName(chain_data)}
                </span>
              </div>
            )
          }
        </div>
      }
      body={
        <Search
          value={value}
          onSelect={(a, c) =>
            onClick(
              a,
              c,
            )
          }
          chain={chain}
          is_pool={is_pool}
          is_bridge={is_bridge}
          show_next_assets={show_next_assets}
          show_native_assets={show_native_assets}
          fixed={fixed}
          data={data}
        />
      }
    />
  )
}
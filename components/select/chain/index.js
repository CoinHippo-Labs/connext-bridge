import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Puff } from 'react-loader-spinner'
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
    source,
    destination,
    origin = 'from',
    is_pool = false,
    no_shadow = true,
    className = '',
  },
) => {
  const {
    preferences,
    chains,
    wallet,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
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
    wallet_data,
  } = { ...wallet }
  const {
    address,
  } = { ...wallet_data }

  const [hidden, setHidden] = useState(true)

  const onClick = id => {
    if (onSelect) {
      onSelect(id)
    }

    setHidden(!hidden)
  }

  const chain_data = (chains_data || [])
    .find(c =>
      c?.id === value
    )
  const {
    image,
    color,
  } = { ...chain_data }

  const boxShadow =
    color &&
    !no_shadow &&
    `${color}${
      theme === 'light' ?
        '44' :
        '33'
    } 0px 4px 16px 8px`

  return (
    <Modal
      id="modal-chains"
      noButtons={true}
      hidden={hidden}
      disabled={
        disabled ||
        fixed
      }
      onClick={open => setHidden(!open)}
      buttonTitle={
        chains_data ?
          <div
            className={
              fixed ?
                'w-32 sm:w-40 min-w-max bg-slate-100 dark:bg-slate-900 cursor-default rounded border dark:border-slate-800 flex items-center justify-between space-x-1.5 sm:space-x-2 py-1.5 sm:py-2 px-2' :
                className ||
                'w-32 sm:w-40 min-w-max bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded border dark:border-slate-700 flex items-center justify-between space-x-1.5 sm:space-x-2 py-1.5 sm:py-2 px-2'
            }
          >
            <div className="flex items-center space-x-2">
              {
                image &&
                (
                  <>
                    <div className="flex sm:hidden">
                      <Image
                        src={image}
                        alt=""
                        width={18}
                        height={18}
                        className="rounded-full"
                      />
                    </div>
                    <div className="hidden sm:flex">
                      <Image
                        src={image}
                        alt=""
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    </div>
                  </>
                )
              }
              <span className="whitespace-nowrap sm:text-base font-semibold">
                {
                  chainName(chain_data) ||
                  (origin ?
                    'Chain' :
                    'Select chain'
                  )
                }
              </span>
            </div>
            {
              !fixed &&
              (
                <BiChevronDown
                  size={18}
                  className="text-slate-400 dark:text-slate-200 ml-1.5 -mr-1"
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
        `w-32 sm:w-40 min-w-max h-8 sm:h-10 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`
      }
      buttonStyle={
        {
          boxShadow,
          WebkitBoxShadow: boxShadow,
          MozBoxShadow: boxShadow,
        }
      }
      title={
        <span className="flex items-center space-x-1 pt-1 pb-2">
          <span className="capitalize">
            {
              origin ||
              'select'
            }
          </span>
          <span className="normal-case">
            chain
          </span>
        </span>
      }
      body={
        <Search
          value={value}
          onSelect={id => onClick(id)}
          source={source}
          destination={destination}
          is_pool={is_pool}
          fixed={fixed}
        />
      }
    />
  )
}
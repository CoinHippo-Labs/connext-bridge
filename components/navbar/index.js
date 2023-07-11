import { useSelector, shallowEqual } from 'react-redux'
import Linkify from 'react-linkify'
import parse from 'html-react-parser'
import { TbLogout } from 'react-icons/tb'

import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import Chains from './chains'
import EnsProfile from '../profile/ens'
import Wallet from '../wallet'
import Theme from './theme'
import Menus from './menus'
import Image from '../image'
import { ENVIRONMENT, STATUS_MESSAGE } from '../../lib/config'

export default () => {
  const { wallet } = useSelector(state => ({ wallet: state.wallet }), shallowEqual)
  const { wallet_data } = { ...wallet }
  const { chain_id, provider, ethereum_provider, address } = { ...wallet_data }

  let walletImageName
  let walletImageClassName = ''
  if (ethereum_provider) {
    const wallet_name = ethereum_provider.constructor?.name?.toLowerCase()
    if (wallet_name.includes('walletconnect')) {
      walletImageName = 'walletconnect.png'
      walletImageClassName = 'rounded-full'
    }
    else if (wallet_name.includes('portis')) {
      walletImageName = 'portis.png'
    }
    else if (['walletlink', 'coinbase'].findIndex(s => wallet_name.includes(s)) > -1) {
      walletImageName = 'coinbase.png'
      walletImageClassName = 'rounded-lg'
    }
    else if (ethereum_provider.isMetaMask) {
      walletImageName = 'metamask.png'
      walletImageClassName = 'w-4 h-4'
    }
  }

  return (
    <>
      <div className="navbar 3xl:pt-6">
        <div className="navbar-inner w-full sm:h-20 flex xl:grid xl:grid-cols-3 items-center justify-between gap-4">
          <div className="flex items-center">
            <Logo />
            <DropdownNavigations />
          </div>
          <div className="flex items-center justify-center">
            <Navigations />
          </div>
          <div className="flex items-center justify-end 3xl:space-x-4">
            {provider && <Chains chainId={chain_id} />}
            {provider && address && (
              <div className={`hidden sm:flex lg:hidden xl:flex items-center border border-slate-200 dark:border-slate-800 rounded-sm cursor-pointer whitespace-nowrap tracking-tight text-slate-500 dark:text-slate-500 font-semibold space-x-1.5 mx-2 pr-1.5 ${walletImageName ? 'rounded-l-full pl-0' : 'pl-2'}`}>
                {walletImageName && (
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-full p-1.5 m-0.5">
                    <Image
                      src={`/logos/wallets/${walletImageName}`}
                      width={20}
                      height={20}
                      className={`3xl:w-7 3xl:h-7 ${walletImageClassName}`}
                    />
                  </div>
                )}
                <div className="py-1">
                  <EnsProfile address={address} />
                </div>
              </div>
            )}
            <div className="mx-0">
              <Wallet>
                {!provider ?
                  <div className="border border-slate-400 dark:border-slate-600 rounded whitespace-nowrap text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 3xl:text-xl font-bold mx-2 py-1.5 3xl:py-2 px-2.5 3xl:px-3">
                    Connect Wallet
                  </div> :
                  <div className="flex items-center justify-center py-1.5 px-2.5">
                    <TbLogout size={18} className="3xl:w-6 3xl:h-6 text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300" />
                  </div>
                }
              </Wallet>
            </div>
            <Theme />
            <Menus />
          </div>
        </div>
      </div>
      {STATUS_MESSAGE && (
        <div className="w-full bg-blue-600 dark:bg-blue-700 overflow-x-auto flex items-center py-2 sm:py-2.5 3xl:py-4 px-2 sm:px-4 3xl:px-6">
          <div className="flex flex-wrap items-center text-white text-xs xl:text-sm 3xl:text-2xl font-bold text-center space-x-1.5 xl:space-x-2 3xl:space-x-3 mx-auto">
            <span className="status-message">
              <Linkify>
                {parse(STATUS_MESSAGE)}
              </Linkify>
            </span>
          </div>
        </div>
      )}
    </>
  )
}
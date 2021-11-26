import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import { FiMenu, FiMoon, FiSun } from 'react-icons/fi'

import Logo from './logo'
import DropdownNavigation from './navigation/dropdown'
import Navigation from './navigation'
import Network from './network'
import Wallet from '../wallet'
import Copy from '../copy'

import { chains } from '../../lib/api/bridge_config'
import { ellipseAddress } from '../../lib/utils'

import { THEME, CHAINS_DATA } from '../../reducers/types'

export default function Navbar() {
  const dispatch = useDispatch()
  const { wallet, preferences } = useSelector(state => ({ wallet: state.wallet, preferences: state.preferences }), shallowEqual)
  const { wallet_data } = { ...wallet }
  const { web3_provider, chain_id, address } = { ...wallet_data }
  const { theme } = { ...preferences }

  useEffect(() => {
    const getData = async () => {
      const response = await chains()

      dispatch({
        type: CHAINS_DATA,
        value: response || [],
      })
    }

    getData()
  }, [])

  return (
    <div className="navbar dark:bg-gray-900 border-b">
      <div className="navbar-inner w-full flex items-center">
        <Logo />
        <DropdownNavigation />
        <Navigation />
        <div className="flex items-center ml-auto">
          {web3_provider && address && (
            <div className="hidden sm:block mx-2">
              <Copy
                size={16}
                text={address}
                copyTitle={<span className="text-gray-400 dark:text-white text-xs font-semibold">
                  {ellipseAddress(address, 8)}
                </span>}
              />
            </div>
          )}
          <div className="mx-2">
            <Wallet />
          </div>
          {web3_provider && (<Network chain_id={chain_id} />)}
          <button
            onClick={() => {
              dispatch({
                type: THEME,
                value: theme === 'light' ? 'dark' : 'light',
              })
            }}
            className="w-10 sm:w-12 h-16 btn-transparent flex items-center justify-center"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              {theme === 'light' ? (
                <FiMoon size={16} />
              ) : (
                <FiSun size={16} />
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
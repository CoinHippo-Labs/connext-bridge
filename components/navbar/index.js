import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import { FiMenu, FiMoon, FiSun } from 'react-icons/fi'
import { TiArrowRight } from 'react-icons/ti'

import Logo from './logo'
import DropdownNavigation from './navigation/dropdown'
import Navigation from './navigation'
import Network from './network'
import Wallet from '../wallet'
import Copy from '../copy'

import { chains, assets } from '../../lib/api/bridge_config'
import { ellipseAddress } from '../../lib/utils'

import { THEME, CHAINS_DATA, ASSETS_DATA } from '../../reducers/types'

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

  useEffect(() => {
    const getData = async () => {
      const response = await assets()

      dispatch({
        type: ASSETS_DATA,
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
            <>
              <a
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center uppercase text-indigo-500 dark:text-indigo-300 text-3xs sm:text-2xs xl:text-sm font-medium mx-0 xl:mx-2"
              >
                <span className="block xl:hidden">View Txs</span>
                <span className="hidden xl:block">View Transactions</span>
                <TiArrowRight size={20} className="transform -rotate-45 mt-0.5 sm:mt-0" />
              </a>
              <div className="hidden sm:block mx-2">
                <Copy
                  size={16}
                  text={address}
                  copyTitle={<span className="text-gray-400 dark:text-white text-xs xl:text-sm font-semibold">
                    {ellipseAddress(address, 8)}
                  </span>}
                />
              </div>
            </>
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
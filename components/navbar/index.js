import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import { Img } from 'react-image'
import { FiMenu, FiMoon, FiSun } from 'react-icons/fi'
import { TiArrowRight } from 'react-icons/ti'

import Logo from './logo'
import DropdownNavigation from './navigation/dropdown'
import Navigation from './navigation'
import Network from './network'
import Wallet from '../wallet'
import Copy from '../copy'

import { chains, assets, announcement } from '../../lib/api/bridge_config'
import { ellipseAddress } from '../../lib/utils'

import { THEME, CHAINS_DATA, ASSETS_DATA, ANNOUNCEMENT_DATA } from '../../reducers/types'

export default function Navbar() {
  const dispatch = useDispatch()
  const { ens, wallet, preferences } = useSelector(state => ({ ens: state.ens, wallet: state.wallet, preferences: state.preferences }), shallowEqual)
  const { ens_data } = { ...ens }
  const { wallet_data } = { ...wallet }
  const { web3_provider, chain_id, address, default_chain_id } = { ...wallet_data }
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
        value: response?.filter(_asset => !_asset?.is_staging || process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')) || [],
      })
    }

    getData()
  }, [])

  useEffect(() => {
    const getData = async () => {
      const response = await announcement()

      dispatch({
        type: ANNOUNCEMENT_DATA,
        value: response,
      })
    }

    getData()

    const interval = setInterval(() => getData(), 1 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
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
                  copyTitle={<div className="flex items-center">
                    {ens_data?.[address?.toLowerCase()]?.name && (
                      <Img
                        src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data[address?.toLowerCase()].name}`}
                        alt=""
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    )}
                    <span className="text-gray-400 dark:text-white text-xs xl:text-sm font-semibold">
                      {ellipseAddress(ens_data?.[address?.toLowerCase()]?.name, 10) || ellipseAddress(address?.toLowerCase(), 6)}
                    </span>
                  </div>}
                />
              </div>
            </>
          )}
          <div className="mx-2">
            <Wallet
              chainIdToConnect={default_chain_id}
              main={true}
            />
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
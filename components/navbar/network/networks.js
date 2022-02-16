import { useSelector, shallowEqual } from 'react-redux'

import { Img } from 'react-image'
import { Puff } from 'react-loader-spinner'
import { IoRadioButtonOn } from 'react-icons/io5'

import Wallet from '../../wallet'

import { chainTitle } from '../../../lib/object/chain'

export default function Networks({ handleDropdownClick }) {
  const { preferences, chains, chains_status, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, chains_status: state.chains_status, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { chains_status_data } = { ...chains_status }
  const { wallet_data } = { ...wallet }
  const { chain_id } = { ...wallet_data }

  return (
    <>
      <div className="dropdown-title">Select Network</div>
      <div className="flex flex-wrap pb-1">
        {chains_data?.filter(item => !item.menu_hidden).map((item, i) => (
          item.disabled ?
            <div
              key={i}
              title="Disabled"
              className="dropdown-item w-1/2 cursor-not-allowed flex items-center justify-start font-medium space-x-1 p-2"
            >
              <IoRadioButtonOn size={12} className="text-gray-400 dark:text-gray-600" />
              <Img
                src={item.image}
                alt=""
                className="w-5 h-5 rounded-full"
              />
              <span className="leading-4 text-2xs font-medium">{chainTitle(item)}</span>
            </div>
            :
            <Wallet
              key={i}
              chainIdToConnect={item.chain_id}
              onChangeNetwork={handleDropdownClick}
              buttonDisconnectTitle={<>
                {chains_status_data ?
                  <IoRadioButtonOn size={12} className={`min-w-max ${chains_status_data?.find(c => c?.chain_id === item.chain_id)?.synced ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`} />
                  :
                  <Puff color={theme === 'dark' ? '#60A5FA' : '#2563EB'} width="12" height="12" />
                }
                <Img
                  src={item.image}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
                <span className={`leading-4 text-2xs ${item.chain_id === chain_id ? 'font-semibold' : 'font-normal'}`}>{chainTitle(item)}</span>
              </>}
              buttonDisconnectClassName="dropdown-item w-1/2 flex items-center justify-start space-x-1 p-2"
            />
        ))}
      </div>
    </>
  )
}
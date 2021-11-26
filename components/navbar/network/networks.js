import { useSelector, shallowEqual } from 'react-redux'

import { Img } from 'react-image'

import Wallet from '../../wallet'

export default function Networks({ handleDropdownClick }) {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  return (
    <>
      <div className="dropdown-title">Select Network</div>
      <div className="flex flex-wrap pb-1">
        {chains_data?.filter(item => !item.menu_hidden).map((item, i) => (
          item.disabled ?
            <div
              key={i}
              title="Not available yet"
              className="dropdown-item w-1/2 cursor-not-allowed flex items-center justify-start space-x-1.5 p-2"
            >
              <Img
                src={item.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-xs">{item.title}</span>
            </div>
            :
            <Wallet
              key={i}
              chainIdToConnect={item.chain_id}
              onChangeNetwork={handleDropdownClick}
              buttonDisconnectTitle={<>
                <Img
                  src={item.image}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-xs text-left">{item.title}</span>
              </>}
              buttonDisconnectClassName="dropdown-item w-1/2 flex items-center justify-start space-x-1.5 p-2"
            />
        ))}
      </div>
    </>
  )
}
import { useSelector, shallowEqual } from 'react-redux'

import { Img } from 'react-image'

import Wallet from '../../wallet'

export default function Networks({ handleDropdownClick }) {
  const { assets } = useSelector(state => ({ assets: state.assets }), shallowEqual)
  const { assets_data } = { ...assets }

  return (
    <>
      {/*<div className="dropdown-title">Select Coin</div>*/}
      <div className="flex flex-wrap py-1">
        {assets_data?.filter(item => !item.menu_hidden && !item.disabled).map((item, i) => (
          item.disabled ?
            <div
              key={i}
              title="Disabled"
              className="dropdown-item w-1/2 cursor-not-allowed flex items-center justify-start space-x-1.5 p-2"
            >
              <Img
                src={item.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-xs font-medium">{item.symbol}</span>
            </div>
            :
            <div
              key={i}
              onClick={() => handleDropdownClick(item.id)}
              className="dropdown-item w-1/2 cursor-pointer flex items-center justify-start space-x-1.5 p-2"
            >
              <Img
                src={item.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-xs font-medium">{item.symbol}</span>
            </div>
        ))}
      </div>
    </>
  )
}
import { useSelector, shallowEqual } from 'react-redux'

import { Img } from 'react-image'

export default function Networks({ handleDropdownClick }) {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  return (
    <>
      {/*<div className="dropdown-title">Select Chain</div>*/}
      <div className="flex flex-wrap py-1">
        {chains_data?.filter(item => !item.menu_hidden && !item.disabled).map((item, i) => (
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
              <span className="text-xs">{item.title}</span>
            </div>
            :
            <div
              key={i}
              onClick={() => handleDropdownClick(item.chain_id)}
              className="dropdown-item w-1/2 cursor-pointer flex items-center justify-start space-x-1.5 p-2"
            >
              <Img
                src={item.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-xs">{item.title}</span>
            </div>
        ))}
      </div>
    </>
  )
}
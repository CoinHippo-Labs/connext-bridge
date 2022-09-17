import { useSelector, shallowEqual } from 'react-redux'

import Image from '../../image'
import Wallet from '../../wallet'
import { chainName } from '../../../lib/object/chain'

export default ({
  onClick,
}) => {
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
    chain_id,
  } = { ...wallet_data }

  return (
    <>
      <div className="dropdown-title">
        Switch Chain
      </div>
      <div className="flex flex-wrap pb-1">
        {(chains_data || [])
          .filter(c =>
            c &&
            !c.menu_hidden
          )
          .map(c => {
            const {
              id,
              disabled,
              image,
            } = { ...c }

            const item = (
              <>
                <Image
                  src={image}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span className={`leading-4 text-2xs ${c.chain_id === chain_id ? 'font-semibold' : 'font-medium'}`}>
                  {chainName(c)}
                </span>
              </>
            )

            return disabled ?
              <div
                key={id}
                title="Disabled"
                className="dropdown-item w-1/2 cursor-not-allowed flex items-center justify-start font-medium space-x-1.5 p-2"
              >
                {item}
              </div> :
              <Wallet
                key={id}
                connectChainId={c.chain_id}
                onSwitch={onClick}
                className="dropdown-item w-1/2"
              >
                <div className="flex items-center justify-start space-x-1.5 p-2">
                  {item}
                </div>
              </Wallet>
          })
        }
      </div>
    </>
  )
}
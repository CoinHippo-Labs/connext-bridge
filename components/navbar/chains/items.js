import { useSelector, shallowEqual } from 'react-redux'

import Image from '../../image'
import Wallet from '../../wallet'
import { chainName } from '../../../lib/object'
import { toArray } from '../../../lib/utils'

export default ({ onClick }) => {
  const { chains, wallet } = useSelector(state => ({ chains: state.chains, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { wallet_data } = { ...wallet }
  const { chain_id } = { ...wallet_data }

  return (
    <div className="flex flex-wrap pb-0">
      {toArray(chains_data).map(c => {
        const { id, disabled, image } = { ...c }
        const selected = c.chain_id === chain_id
        const item = (
          <>
            <Image
              src={image}
              width={22}
              height={22}
              className="3xl:w-6 3xl:h-6 rounded-full"
            />
            <div className="w-full flex items-center justify-between space-x-2">
              <span className={`leading-4 3xl:leading-6 text-sm 3xl:text-xl ${selected ? 'font-bold' : 'text-slate-500 font-medium'}`}>
                {chainName(c)}
              </span>
              {selected && (
                <span className="leading-4 3xl:leading-6 text-slate-500 text-xs 3xl:text-lg font-medium">
                  Connected
                </span>
              )}
            </div>
          </>
        )
        const className = `w-full ${selected ? 'bg-slate-100 dark:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700'} ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-start space-x-2 3xl:space-x-2.5 p-2 3xl:p-3`
        return disabled ?
          <div
            key={id}
            title="Disabled"
            className={className}
          >
            {item}
          </div> :
          <Wallet
            key={id}
            connectChainId={c.chain_id}
            onSwitch={onClick}
            className={className}
          >
            {item}
          </Wallet>
      })}
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { utils } from 'ethers'
const { formatUnits } = { ...utils }
import { MdLocalGasStation } from 'react-icons/md'

import Spinner from '../spinner'
import NumberDisplay from '../number'

export default ({ chainId, dummy, iconSize = 20, className = '' }) => {
  const { rpc_providers } = useSelector(state => ({ rpc_providers: state.rpc_providers }), shallowEqual)
  const { rpcs } = { ...rpc_providers }

  const [gasPrice, setGasPrice] = useState(null)

  useEffect(
    () => {
      const getData = async is_interval => {
        if (rpcs?.[chainId]) {
          if (!is_interval) {
            setGasPrice(null)
          }
          const provider = rpcs[chainId]
          try {
            const { gasPrice } = { ...await provider.getFeeData() }
            setGasPrice(Number(formatUnits(gasPrice, 'gwei')))
          } catch (error) {
            if (!gasPrice) {
              setGasPrice('')
            }
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(true), 0.5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [chainId, rpcs],
  )

  return chainId ?
    <div className={`flex items-center justify-center text-slate-400 dark:text-slate-500 space-x-1 ${className}`}>
      <MdLocalGasStation size={iconSize} className="3xl:w-6 3xl:h-6" />
      {typeof gasPrice === 'number' ?
        <NumberDisplay
          value={gasPrice}
          suffix=" Gwei"
          noTooltip={true}
          className="whitespace-nowrap font-semibold"
        /> :
        typeof gasPrice === 'string' ?
          <span>-</span> :
          <div><Spinner name="RotatingSquare" width={16} height={16} /></div>
      }
    </div> :
    dummy && <div className="h-5" />
}
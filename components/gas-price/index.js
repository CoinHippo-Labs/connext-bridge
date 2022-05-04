import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { utils } from 'ethers'
import { RotatingSquare } from 'react-loader-spinner'
import { MdLocalGasStation } from 'react-icons/md'

import { number_format, loader_color } from '../../lib/utils'

export default ({ chainId, className = '' }) => {
  const { preferences, rpc_providers } = useSelector(state => ({ preferences: state.preferences, rpc_providers: state.rpc_providers }), shallowEqual)
  const { theme } = { ...preferences }
  const { rpcs } = { ...rpc_providers }

  const [gasPrice, setGasPrice] = useState(null)

  useEffect(() => {
    const getData = async is_interval => {
      if (rpcs?.[chainId]) {
        if (!is_interval) {
          setGasPrice(null)
        }
        const rpc = rpcs[chainId]
        try {
          const gasPrice = Number(utils.formatUnits(await rpc.getGasPrice(), 'gwei'))
          setGasPrice(gasPrice)
        } catch (error) {
          if (!gasPrice) {
            setGasPrice('')
          }
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(true), 0.5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [chainId, rpcs])

  return (
    <div className={`flex items-center justify-center text-blue-400 dark:text-white space-x-1 ${className}`}>
      <MdLocalGasStation size={16} />
      {typeof gasPrice === 'number' ?
        <>
          <span className="font-semibold">
            {number_format(gasPrice, '0,0')}
          </span>
          <span className="font-medium">
            Gwei
          </span>
        </>
        :
        typeof gasPrice === 'string' ?
          <span>-</span>
          :
          <RotatingSquare color={loader_color(theme)} width="16" height="16" />
      }
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { utils } from 'ethers'
import { RotatingSquare } from 'react-loader-spinner'
import { MdLocalGasStation } from 'react-icons/md'

import DecimalsFormat from '../decimals-format'
import { loaderColor } from '../../lib/utils'

export default (
  {
    chainId,
    dummy,
    iconSize = 20,
    className = '',
  },
) => {
  const {
    preferences,
    rpc_providers,
  } = useSelector(
    state =>
    (
      {
        preferences: state.preferences,
        rpc_providers: state.rpc_providers,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    rpcs,
  } = { ...rpc_providers }

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
            const fee_data = await provider.getFeeData()

            const {
              gasPrice,
            } = { ...fee_data }

            setGasPrice(Number(utils.formatUnits(gasPrice, 'gwei')))
          } catch (error) {
            if (!gasPrice) {
              setGasPrice('')
            }
          }
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(true),
          0.5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [chainId, rpcs],
  )

  return (
    chainId ?
      <div className={`flex items-center justify-center text-slate-400 dark:text-slate-500 space-x-1 ${className}`}>
        <MdLocalGasStation
          size={iconSize}
          className="3xl:w-6 3xl:h-6"
        />
        {typeof gasPrice === 'number' ?
          <>
            <DecimalsFormat
              value={gasPrice}
              className="whitespace-nowrap font-semibold"
            />
            <span className="font-medium">
              Gwei
            </span>
          </> :
          typeof gasPrice === 'string' ?
            <span>
              -
            </span> :
            <RotatingSquare
              width="16"
              height="16"
              color={theme === 'light' ? '#b0b0b0' : '#808080'}
            />
        }
      </div> :
      dummy &&
      (
        <div className="h-5" />
      )
  )
}
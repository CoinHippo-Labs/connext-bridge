import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import Copy from '../copy'
import { ens as getEns } from '../../lib/api/ens'
import { toArray, ellipse } from '../../lib/utils'
import { ENS_DATA } from '../../reducers/types'

export default (
  {
    address,
    copySize = 18,
    noCopy = false,
    noImage = false,
    fallback,
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const {
    ens,
  } = useSelector(
    state => (
      {
        ens: state.ens,
      }
    ),
    shallowEqual,
  )
  const {
    ens_data,
  } = { ...ens }

  const [imageUnavailable, setImageUnavailable] = useState(noImage)

  useEffect(
    () => {
      const getData = async () => {
        if (address) {
          const addresses = toArray(address, 'lower').filter(a => !ens_data?.[a])

          if (addresses.length > 0) {
            let _ens_data

            addresses.forEach(a => {
              if (!_ens_data?.[a]) {
                _ens_data = {
                  ..._ens_data,
                  [a]: {},
                }
              }
            })

            dispatch(
              {
                type: ENS_DATA,
                value: { ..._ens_data },
              }
            )

            _ens_data = await getEns(addresses)

            addresses.forEach(a => {
              if (!_ens_data?.[a]) {
                _ens_data = {
                  ..._ens_data,
                  [a]: {},
                }
              }
            })

            dispatch(
              {
                type: ENS_DATA,
                value: { ..._ens_data },
              }
            )
          }
        }
      }

      getData()
    },
    [address, ens_data],
  )

  const {
    name,
  } = { ...ens_data?.[address?.toLowerCase()] }

  const ens_name =
    name &&
    (
      <span
        title={name}
        className={className || 'normal-case text-black dark:text-white text-base 3xl:text-2xl font-medium'}
      >
        <span className="xl:hidden">
          {ellipse(name, 12)}
        </span>
        <span className="hidden xl:block">
          {ellipse(name, 12)}
        </span>
      </span>
    )

  return (
    ens_name ?
      <div className="flex items-center space-x-2 3xl:space-x-3">
        {
          !imageUnavailable &&
          (
            <img
              src={`https://metadata.ens.domains/mainnet/avatar/${name}`}
              alt=""
              onError={() => setImageUnavailable(true)}
              className="w-6 3xl:w-8 h-6 3xl:h-8 rounded-full"
            />
          )
        }
        {noCopy ?
          ens_name :
          <Copy
            size={copySize}
            value={name}
            title={ens_name}
            className="3xl:w-6 3xl:h-6 cursor-pointer text-slate-300 hover:text-slate-400 dark:text-slate-500 dark:hover:text-slate-400 ml-4"
          />
        }
      </div> :
      fallback
  )
}
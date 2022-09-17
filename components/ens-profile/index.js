import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import Copy from '../copy'
import { ens as getEns } from '../../lib/api/ens'
import { ellipse } from '../../lib/utils'
import { ENS_DATA } from '../../reducers/types'

export default ({
  address,
  no_copy = false,
  no_image = false,
  fallback,
  className = '',
}) => {
  const dispatch = useDispatch()
  const {
    ens,
  } = useSelector(state =>
    (
      {
        ens: state.ens,
      }
    ),
    shallowEqual,
  )
  const {
    ens_data,
  } = { ...ens }

  const [noImage, setNoImage] = useState(no_image)

  useEffect(() => {
    const getData = async () => {
      if (address) {
        const addresses = [address.toLowerCase()]
          .filter(a => a && !ens_data?.[a])

        if (addresses.length > 0) {
          let _ens_data

          addresses.forEach(a => {
            if (!_ens_data?.[a]) {
              _ens_data = {
                ..._ens_data,
                [`${a}`]: {},
              }
            }
          })

          dispatch({
            type: ENS_DATA,
            value: {
              ..._ens_data,
            },
          })

          _ens_data = await getEns(addresses)

          addresses.forEach(a => {
            if (!_ens_data?.[a]) {
              _ens_data = {
                ..._ens_data,
                [`${a}`]: {},
              }
            }
          })

          dispatch({
            type: ENS_DATA,
            value: {
              ..._ens_data,
            },
          })
        }
      }
    }

    getData()
  }, [address, ens_data])

  address = address?.toLowerCase()

  const {
    name,
  } = { ...ens_data?.[address] }

  const ens_name = name && (
    <span
      title={name}
      className={className || 'normal-case tracking-wider text-black dark:text-white text-base font-medium'}
    >
      <span className="xl:hidden">
        {ellipse(
          name,
          12,
        )}
      </span>
      <span className="hidden xl:block">
        {ellipse(
          name,
          12,
        )}
      </span>
    </span>
  )

  return ens_name ?
    <div className="flex items-center space-x-2">
      {!noImage && (
        <img
          src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${name}`}
          alt=""
          onError={() => setNoImage(true)}
          className="w-6 h-6 rounded-full"
        />
      )}
      {no_copy ?
        ens_name :
        <Copy
          size={18}
          value={name}
          title={ens_name}
        />
      }
    </div> :
    fallback
}
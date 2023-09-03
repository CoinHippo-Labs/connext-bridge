import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import Image from '../image'
import Copy from '../copy'
import { getENS } from '../../lib/api/ens'
import { toArray, ellipse } from '../../lib/utils'
import { ENS_DATA } from '../../reducers/types'

export default (
  {
    address,
    copySize = 18,
    copyAddress = true,
    width = 24,
    height = 24,
    noCopy = false,
    noImage = false,
    url,
    fallback,
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const { ens } = useSelector(state => ({ ens: state.ens }), shallowEqual)
  const { ens_data } = { ...ens }

  const [imageUnavailable, setImageUnavailable] = useState(null)

  useEffect(
    () => {
      const setDefaultData = (addresses, data) => {
        addresses.forEach(a => {
          if (!data?.[a]) {
            data = { ...data, [a]: {} }
          }
        })
        return data
      }

      const getData = async () => {
        if (address) {
          const addresses = toArray(address, 'lower').filter(a => !ens_data?.[a])

          if (addresses.length > 0) {
            let data = setDefaultData(addresses, ens_data)
            dispatch({ type: ENS_DATA, value: { ...data } })

            data = await getENS(addresses)
            setDefaultData(addresses, data)
            dispatch({ type: ENS_DATA, value: { ...data } })
          }
        }
      }

      getData()
    },
    [address, ens_data],
  )

  const { name } = { ...ens_data?.[address?.toLowerCase()] }
  const src = `https://metadata.ens.domains/mainnet/avatar/${name}`

  const ensComponent = name && (
    <span
      title={name}
      className={className || 'cursor-pointer normal-case text-base 3xl:text-2xl font-medium'}
    >
      <span className="xl:hidden">
        {ellipse(name, 10)}
      </span>
      <span className="hidden xl:block">
        {ellipse(name, 10)}
      </span>
    </span>
  )

  const addressComponent = fallback || (
    <span className={className || 'cursor-pointer normal-case text-sm 3xl:text-base font-medium'}>
      <span className="xl:hidden">
        {ellipse(address, 10, '0x')}
      </span>
      <span className="hidden xl:block">
        {ellipse(address, 10, '0x')}
      </span>
    </span>
  )

  return (
    ensComponent ?
      <div className="flex items-center">
        {!noImage && (
          typeof imageUnavailable === 'boolean' ?
            <Image
              src={imageUnavailable ? '/logos/others/ens.png' : src}
              width={width}
              height={height}
              className={`${width === 24 ? 'w-6 3xl:w-8 h-6 3xl:h-8' : ''} rounded-full mr-2 3xl:mr-3`}
            /> :
            <img
              src={src}
              alt=""
              onLoad={() => setImageUnavailable(false)}
              onError={() => setImageUnavailable(true)}
              className={`${width === 24 ? 'w-6 3xl:w-8 h-6 3xl:h-8' : 'w-5 h-5'} rounded-full mr-2 3xl:mr-3`}
            />
        )}
        {url ?
          <div className="flex items-center space-x-1">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 dark:text-blue-500 font-medium"
            >
              {ensComponent}
            </a>
            {!noCopy && (
              <Copy
                size={copySize}
                value={copyAddress ? address : name}
              />
            )}
          </div> :
          noCopy ?
            ensComponent :
            <Copy
              size={copySize}
              value={copyAddress ? address : name}
              title={ensComponent}
            />
        }
      </div> :
      url ?
        <div className="flex items-center space-x-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 dark:text-blue-500 font-medium"
          >
            {addressComponent}
          </a>
          {!noCopy && (
            <Copy
              size={copySize}
              value={address}
            />
          )}
        </div> :
        noCopy ?
          addressComponent :
          <Copy
            size={copySize}
            value={address}
            title={addressComponent}
          />
  )
}
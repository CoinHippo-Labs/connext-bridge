import { useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import Image from '../image'
import Copy from '../copy'
import { ens as getEns } from '../../lib/api/ens'
import { ellipse } from '../../lib/utils'
import { ENS_DATA } from '../../reducers/types'

export default ({
  address,
  no_copy = false,
  fallback,
}) => {
  const dispatch = useDispatch()
  const { ens } = useSelector(state => ({ ens: state.ens }), shallowEqual)
  const { ens_data } = { ...ens }

  useEffect(() => {
    const getData = async () => {
      if (address) {
        const addresses = [address.toLowerCase()].filter(a => a && !ens_data?.[a])
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
            value: { ..._ens_data },
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
            value: { ..._ens_data },
          })
        }
      }
    }
    getData()
  }, [address, ens_data])

  address = address?.toLowerCase()

  const ens_name = ens_data?.[address]?.name && (
    <span
      title={ens_data[address].name}
      className="normal-case text-black dark:text-white text-base font-semibold"
    >
      <span className="xl:hidden">
        {ellipse(ens_data[address].name, 12)}
      </span>
      <span className="hidden xl:block">
        {ellipse(ens_data[address].name, 16)}
      </span>
    </span>
  )

  return ens_name ?
    <div className="flex items-center space-x-2">
      <Image
        src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data[address].name}`}
        alt=""
        width={24}
        height={24}
        className="rounded-full"
      />
      {no_copy ?
        ens_name
        :
        <Copy
          value={ens_data[address].name}
          title={ens_name}
          size={18}
        />
      }
    </div>
    :
    fallback
}
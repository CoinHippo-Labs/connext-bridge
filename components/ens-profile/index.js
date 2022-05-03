import { useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { Img } from 'react-image'

import Copy from '../copy'
import { ens as getEns } from '../../lib/api/ens'
import { ellipse } from '../../lib/utils'
import { ENS_DATA } from '../../reducers/types'

export default function ensProfile({ address, fallback }) {
  const dispatch = useDispatch()
  const { ens } = useSelector(state => ({ ens: state.ens }), shallowEqual)
  const { ens_data } = { ...ens }

  useEffect(() => {
    const getData = async () => {
      if (address) {
        const addresses = [address.toLowerCase()].filter(a => a && !ens_data?.[a])
        const ens_data = await getEns(addresses)
        if (ens_data) {
          dispatch({
            type: ENS_DATA,
            value: ens_data,
          })
        }
      }
    }
    getData()
  }, [address])

  address = address?.toLowerCase()

  return ens_data?.[address]?.name ?
    <div className="flex items-center">
      <Img
        src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data[address].name}`}
        alt=""
        className="w-6 h-6 rounded-full mr-2"
      />
      <Copy
        value={ens_data[address].name}
        title={<span
          title={ens_data[address].name}
          className="normal-case text-black dark:text-white text-base font-semibold"
        >
          <span className="xl:hidden">
            {ellipse(ens_data[address].name, 12)}
          </span>
          <span className="hidden xl:block">
            {ellipse(ens_data[address].name, 16)}
          </span>
        </span>}
        size={18}
      />
    </div>
    :
    fallback
}
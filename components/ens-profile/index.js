import { useSelector, shallowEqual } from 'react-redux'
import { Img } from 'react-image'

import { ellipse } from '../../lib/utils'

export default function ensProfile({ address }) {
  const { ens } = useSelector(state => ({ ens: state.ens }), shallowEqual)
  const { ens_data } = { ...ens }

  address = address?.toLowerCase()

  return ens_data?.[address]?.name && (
    <div className="flex items-center">
      <Img
        src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data[address].name}`}
        alt=""
        className="w-6 h-6 rounded-full mr-2"
      />
      <span className="normal-case text-black dark:text-white text-base font-semibold">
        {ellipse(ens_data[address].name, 16)}
      </span>
    </div>
  )
}
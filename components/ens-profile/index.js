import { useSelector, shallowEqual } from 'react-redux'
import { Img } from 'react-image'

import Copy from '../copy'
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
  )
}
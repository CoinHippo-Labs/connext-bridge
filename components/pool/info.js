import { useSelector, shallowEqual } from 'react-redux'
import { TailSpin } from 'react-loader-spinner'

import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import { currency_symbol } from '../../lib/object/currency'
import { loader_color } from '../../lib/utils'

export default ({
  data,
  onSelect,
}) => {
  const { preferences, chains, assets, _pools } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, _pools: state.pools }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { pools_data } = { ..._pools }

  return (
    <div className="min-h-full border-2 border-blue-400 dark:border-blue-600 rounded-2xl p-6">
      {pools_data ?
        <div />
        :
        <TailSpin color={loader_color(theme)} width="36" height="36" />
      }
    </div>
  )
}
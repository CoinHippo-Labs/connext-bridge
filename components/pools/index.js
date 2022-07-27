import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

export default () => {
  const { chains, pool_assets, wallet } = useSelector(state => ({ chains: state.chains, pool_assets: state.pool_assets, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { pool_assets_data } = { ...pool_assets }
  const { wallet_data } = { ...wallet }
  const { chain_id } = { ...wallet_data }

  const router = useRouter()

  useEffect(() => {
    if (chains_data && pool_assets_data) {
      const chain_data = chains_data.find(c => !chain_id || c?.chain_id === chain_id) || _.head(chains_data)
      const asset_data = _.head(pool_assets_data)
      router.push(`/pool/${chain_data ? `${asset_data?.symbol ? `${asset_data.symbol.toUpperCase()}-` : ''}on-${chain_data.id}` : ''}`, undefined, { shallow: true })
    }
  }, [chains_data, pool_assets_data, chain_id])

  return (
    <div />
  )
}
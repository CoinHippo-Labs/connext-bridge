import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Img } from 'react-image'
import Loader from 'react-loader-spinner'

import Modal from '../../modals/modal-info'

export default function TransactionState({ data }) {
  const { chains, assets, preferences } = useSelector(state => ({ chains: state.chains, assets: state.assets, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { theme } = { ...preferences }

  const [hidden, setHidden] = useState(true)

  useEffect(() => {

  }, [])

  return (
    <div>
    </div>
  )
}
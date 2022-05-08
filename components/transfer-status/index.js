import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { TailSpin } from 'react-loader-spinner'
import LightSpeed from 'react-reveal/LightSpeed'

import Modal from '../modals'
import Image from '../image'
import EnsProfile from '../ens-profile'
import AddToken from '../add-token'
import Copy from '../copy'
import { chainName } from '../../lib/object/chain'
import { number_format, ellipse, loader_color } from '../../lib/utils'

export default ({
  defaultHidden = false,
  disabled = false,
  data,
  onClose,
  buttonClassName = '',
}) => {
  const { preferences, dev } = useSelector(state => ({ preferences: state.preferences, dev: state.dev }), shallowEqual)
  const { theme } = { ...preferences }
  const { sdk } = { ...dev }

  const [hidden, setHidden] = useState(defaultHidden)

  return (
    <Modal
      hidden={hidden}
      disabled={disabled}
      onClick={() => setHidden(false)}
      buttonTitle="Status"
      buttonClassName={buttonClassName}
      title={null}
      body={null}
      onClose={() => {
        if (onClose) {
          onClose()
        }
        setHidden(true)
      }}
      noButtons={true}
    />
  )
}
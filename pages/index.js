import { useState, useEffect } from 'react'

import Bridge from '../components/bridge'

export default () => {
  const [ssr, setSsr] = useState(true)
  useEffect(() => setSsr(false), [])
  return !ssr && <Bridge />
}
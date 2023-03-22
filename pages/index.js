import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

import Bridge from '../components/bridge'
import { isRouteExist } from '../lib/routes'

export default () => {
  const router = useRouter()
  const {
    pathname,
    asPath,
  } = { ...router }

  const _asPath = asPath.includes('?') ? asPath.substring(0, asPath.indexOf('?')) : asPath

  const [ssr, setSsr] = useState(true)

  useEffect(
    () => {
      setSsr(false)
    },
    [],
  )

  if (!ssr && typeof window !== 'undefined' && pathname !== _asPath) {
    router.push(isRouteExist(_asPath) ? asPath : '/')
  }

  return (
    !ssr && ['/'].includes(_asPath) &&
    (
      <Bridge />
    )
  )
}
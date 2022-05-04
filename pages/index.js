import { useRouter } from 'next/router'

import { is_route_exist } from '../lib/routes'

export default () => {
  const router = useRouter()
  const { pathname, asPath } = { ...router }
  const _asPath = asPath.includes('?') ? asPath.substring(0, asPath.indexOf('?')) : asPath

  if (typeof window !== 'undefined' && pathname !== _asPath) {
    router.push(is_route_exist(_asPath) ? asPath : '/')
  }
  if (typeof window === 'undefined' || pathname !== _asPath) {
    return (
      <div className="min-h-screen" />
    )
  }
  return (
    <div />
  )
}
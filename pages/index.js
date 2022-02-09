import { useRouter } from 'next/router'

import CrossChainBridge from '../components/crosschain-bridge'

import { isMatchRoute } from '../lib/routes'

export default function Index() {
  const router = useRouter()
  const { pathname, asPath } = { ...router }
  const _asPath = asPath.includes('?') ? asPath.substring(0, asPath.indexOf('?')) : asPath

  if (typeof window !== 'undefined' && pathname !== _asPath) {
    router.push(isMatchRoute(_asPath) ? asPath : '/')
  }

  if (typeof window === 'undefined' || pathname !== _asPath) {
    return (
      <span className="min-h-screen" />
    )
  }

  return (
    <>
      <CrossChainBridge />
      <div className="bg-green-300 bg-green-600 bg-yellow-500 bg-red-300 bg-red-700 break-all mr-2" />
    </>
  )
}
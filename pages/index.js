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
      <div className="bg-red-300 dark:bg-black dark:bg-blue-500 dark:bg-yellow-500 dark:bg-green-400 dark:bg-green-600 dark:bg-red-700 dark:bg-gray-700 break-all xl:col-span-2 xl:col-span-4" />
    </>
  )
}
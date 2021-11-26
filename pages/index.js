import { useRouter } from 'next/router'

import SectionTitle from '../components/section-title'
import Widget from '../components/widget'

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
      <div className="dark:bg-black" />
    </>
  )
}
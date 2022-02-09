import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import Navbar from '../../components/navbar'
import Footer from '../../components/footer'

import meta from '../../lib/meta'

import { THEME } from '../../reducers/types'

export default function Layout({ children }) {
  const dispatch = useDispatch()
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const router = useRouter()
  const { asPath } = { ...router }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem(THEME) && localStorage.getItem(THEME) !== theme) {
        dispatch({
          type: THEME,
          value: localStorage.getItem(THEME),
        })
      }
    }
  }, [theme])

  const headMeta = meta(asPath)

  return (
    <>
      <Head>
        <title>{headMeta.title}</title>
        <meta name="og:site_name" property="og:site_name" content={headMeta.title} />
        <meta name="og:title" property="og:title" content={headMeta.title} />
        <meta itemProp="name" content={headMeta.title} />
        <meta itemProp="headline" content={headMeta.title} />
        <meta itemProp="publisher" content={headMeta.title} />
        <meta name="twitter:title" content={headMeta.title} />

        <meta name="description" content={headMeta.description} />
        <meta name="og:description" property="og:description" content={headMeta.description} />
        <meta itemProp="description" content={headMeta.description} />
        <meta name="twitter:description" content={headMeta.description} />

        <meta name="og:image" property="og:image" content={headMeta.image} />
        <meta itemProp="thumbnailUrl" content={headMeta.image} />
        <meta itemProp="image" content={headMeta.image} />
        <meta name="twitter:image" content={headMeta.image} />
        <link rel="image_src" href={headMeta.image} />

        <meta name="og:url" property="og:url" content={headMeta.url} />
        <meta itemProp="url" content={headMeta.url} />
        <meta name="twitter:url" content={headMeta.url} />
        <link rel="canonical" href={headMeta.url} />
      </Head>
      <div
        data-layout="layout"
        data-background={theme}
        data-navbar={theme}
        className={`antialiased disable-scrollbars font-sans text-sm ${theme}`}
      >
        <div className="wrapper">
          <div className="main w-full bg-gray-50 dark:bg-black text-gray-900 dark:text-white" style={{ minHeight: 'calc(100vh - 44px)' }}>
            <Navbar />
            <div className="w-full px-2 sm:px-4">
              {children}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  )
}
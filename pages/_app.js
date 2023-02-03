import Head from 'next/head'
import Router from 'next/router'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { Provider } from 'react-redux'
import NProgress from 'nprogress'
import TagManager from 'react-gtm-module'

import Layout from '../layouts'
import { useStore } from '../store'
import * as ga from '../lib/ga'
import '../styles/global.css'
import '../styles/tailwind.css'
import '../styles/animate.css'
import '../styles/layout.css'
import '../styles/components/navbar.css'
import '../styles/components/nprogress.css'
import '../styles/components/skeleton.css'
import '../styles/components/button.css'
import '../styles/components/dropdown.css'
import '../styles/components/modals.css'
import '../styles/components/forms.css'

export default ({
  Component,
  pageProps,
}) => {
  const router = useRouter()
  const store = useStore(pageProps.initialReduxState)

  const [rendered, setRendered] = useState(false)
  const [initiated, setInitiated] = useState(null)

  useEffect(() => {
    const handleRouteChange = url =>
      ga.pageview(url)

    router.events.on(
      'routeChangeComplete',
      handleRouteChange,
    )

    return () => router.events.off(
      'routeChangeComplete',
      handleRouteChange,
    )
  }, [router.events])

  useEffect(
    () => {
      setRendered(true)
    },
    [],
  )

  useEffect(
    () => {
      if (
        process.env.NEXT_PUBLIC_GTM_ID &&
        rendered &&
        !initiated
      ) {
        TagManager.initialize(
          {
            gtmId: process.env.NEXT_PUBLIC_GTM_ID,
          },
        )

        setInitiated(true)
      }
    },
    [rendered, initiated],
  )

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.png" />
        <meta name="msapplication-TileColor" content="#050707" />
        <meta name="msapplication-TileImage" content="/icons/mstile-150x150.png" />
        <meta name="theme-color" content="#050707" />
        {/*
          process.env.NEXT_PUBLIC_GA_TRACKING_ID &&
          (
            <>
              <script
                async
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_TRACKING_ID}`}
              />
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${process.env.NEXT_PUBLIC_GA_TRACKING_ID}', {
                      page_path: window.location.pathname,
                    });
                  `,
                }}
              />
            </>
          )
        */}
      </Head>
      <Provider store={store}>
        <Layout>
          <div id="portal" />
          <div id="modal-network" />
          <div id="modal-asset" />
          <Component {...pageProps} />
        </Layout>
      </Provider>
    </>
  )
}
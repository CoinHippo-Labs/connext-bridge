import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import PageVisibility from 'react-page-visibility'

import Navbar from '../../components/navbar'
import Footer from '../../components/footer'
import AgreeToTerms from '../../components/agree-to-terms'
import meta from '../../lib/meta'
import { equalsIgnoreCase } from '../../lib/utils'
import { THEME, PAGE_VISIBLE, TERMS_AGREED, LATEST_BUMPED_TRANSFERS_DATA } from '../../reducers/types'

export default (
  {
    children,
    agreeToTermsUseModal = false,
  },
) => {
  const dispatch = useDispatch()
  const {
    preferences,
    chains,
    assets,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
    terms_agreed,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }

  const router = useRouter()
  const {
    asPath,
  } = { ...router }

  useEffect(
    () => {
      if (typeof window !== 'undefined') {
        if (localStorage.getItem(THEME) && localStorage.getItem(THEME) !== theme) {
          dispatch(
            {
              type: THEME,
              value: localStorage.getItem(THEME),
            }
          )
        }

        if (localStorage.getItem(TERMS_AGREED) !== terms_agreed?.toString()) {
          dispatch(
            {
              type: TERMS_AGREED,
              value: localStorage.getItem(TERMS_AGREED) === 'true' ? true : false,
            }
          )
        }

        if (localStorage.getItem(LATEST_BUMPED_TRANSFERS_DATA)) {
          dispatch(
            {
              type: LATEST_BUMPED_TRANSFERS_DATA,
              value: localStorage.getItem(LATEST_BUMPED_TRANSFERS_DATA),
            }
          )
        }
      }
    },
    [theme],
  )

  const headMeta = meta(asPath, null, chains_data, assets_data)

  const {
    title,
    description,
    image,
    url,
  } = { ...headMeta }

  return (
    <>
      <Head>
        <title>
          {title}
        </title>
        <meta
          name="og:site_name"
          property="og:site_name"
          content={title}
        />
        <meta
          name="og:title"
          property="og:title"
          content={title}
        />
        <meta
          itemProp="name"
          content={title}
        />
        <meta
          itemProp="headline"
          content={title}
        />
        <meta
          itemProp="publisher"
          content={title}
        />
        <meta
          name="twitter:title"
          content={title}
        />

        <meta
          name="description"
          content={description}
        />
        <meta
          name="og:description"
          property="og:description"
          content={description}
        />
        <meta
          itemProp="description"
          content={description}
        />
        <meta
          name="twitter:description"
          content={description}
        />

        <meta
          name="og:image"
          property="og:image"
          content={image}
        />
        <meta
          itemProp="thumbnailUrl"
          content={image}
        />
        <meta
          itemProp="image"
          content={image}
        />
        <meta
          name="twitter:image"
          content={image}
        />
        <link
          rel="image_src"
          href={image}
        />

        <meta
          name="og:url"
          property="og:url"
          content={url}
        />
        <meta
          itemProp="url"
          content={url}
        />
        <meta
          name="twitter:url"
          content={url}
        />
        <link
          rel="canonical"
          href={url}
        />
      </Head>
      <PageVisibility
        onChange={v => dispatch({ type: PAGE_VISIBLE, value: v })}
      >
        <div
          data-layout="layout"
          data-background={theme}
          data-navbar={theme}
          className={`antialiased ${/*'overflow-y-scroll'*/'disable-scrollbars'} text-sm ${theme}`}
        >
          <div className="wrapper">
            <div
              className="main w-full bg-white dark:bg-black"
              style={
                {
                  minHeight: 'calc(95.5vh)',
                  backgroundColor: theme === 'light' ? '#ececec' : '#1a1919',
                  // backgroundImage: `url("/images/background${theme === 'light' ? '_white' : ''}.png")`,
                  // backgroundSize: 'cover',
                }
              }
            >
              <Navbar />
              <div className="w-full px-2 sm:px-4">
                {agreeToTermsUseModal ?
                  <>
                    <AgreeToTerms useModal={agreeToTermsUseModal} />
                    {children}
                  </> :
                  terms_agreed || !['testnet'].includes(process.env.NEXT_PUBLIC_NETWORK) ?
                    children :
                    <div className="min-h-screen flex items-center">
                      <AgreeToTerms useModal={agreeToTermsUseModal} />
                    </div>
                }
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </PageVisibility>
    </>
  )
}
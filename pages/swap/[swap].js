import Head from 'next/head'
import _ from 'lodash'

import Swap from '../../components/swap'
import meta from '../../lib/meta'
import { getChainsData, getAssetsData } from '../../lib/config'
import { toArray } from '../../lib/utils'

export async function getStaticPaths() {
  const chains = toArray(getChainsData().map(c => c.id))
  const assets = _.concat(toArray(getAssetsData().map(a => a.id)), '')
  return {
    paths: assets.flatMap(a => chains.map(c => `/swap/${a ? `${a.toUpperCase()}-` : ''}on-${c}`)),
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const { swap } = { ...params }
  return {
    props: {
      headMeta: meta(`/swap/${swap}`, undefined, getChainsData(), getAssetsData()),
    },
  }
}

export default ({ headMeta }) => {
  const { title, description, image, url } = { ...headMeta }
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
      <Swap />
    </>
  )
}
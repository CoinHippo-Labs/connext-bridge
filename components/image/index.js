import Image from 'next/image'

const loader = ({
  src,
  width,
  quality,
}) =>
  `${process.env.NEXT_PUBLIC_IMAGE_OPTIMIZER_URL}/_next${
    src?.startsWith('/') ?
      '' :
      '/'
  }${src}?url=${
    src?.startsWith('/') ?
      process.env.NEXT_PUBLIC_SITE_URL :
      ''
  }${src}&w=${width}&q=${quality || 75}`

export default ({
  ...rest
}) => {
  return (
    <Image
      { ...rest }
      loader={loader}
    />
  )
}
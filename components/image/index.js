import Image from 'next/image'
import { useState, useEffect } from 'react'

const IMAGE_OPTIMIZER_URL = ''

const loader = (
  {
    src,
    width,
    quality = 75,
  },
) =>
  `${
    IMAGE_OPTIMIZER_URL ? `${IMAGE_OPTIMIZER_URL}/_next` : ''
  }${
    src?.startsWith('/') ? '' : '/'
  }${src}${
    IMAGE_OPTIMIZER_URL ? `?url=${src?.startsWith('/') ? process.env.NEXT_PUBLIC_APP_URL : ''}${src}&w=${width}&q=${quality}` : ''
  }`

export default (
  {
    src,
    srcEnd,
    duration = 2,
    alt = '',
    ...rest
  }
) => {
  const [imageSrc, setImageSrc] = useState(src)
  const [timer, setTimer] = useState(0)

  useEffect(
    () => {
      const timeout =
        setTimeout(
          () => setTimer(timer + 1),
          1 * 1000,
        )

      return () => clearTimeout(timeout)
    },
    [timer],
  )

  useEffect(
    () => {
      if (src && (!srcEnd || timer === 0)) {
        setImageSrc(src)
      }
    },
    [src, timer],
  )

  useEffect(
    () => {
      if (srcEnd && timer > duration) {
        setImageSrc(srcEnd)
      }
    },
    [srcEnd, timer],
  )

  useEffect(
    () => {
      if (src && srcEnd && timer > 0) {
        setTimer(0)
      }
    },
    [src, srcEnd],
  )

  return (
    <Image
      alt={alt}
      { ...rest }
      src={imageSrc}
      loader={
        () =>
          loader(
            {
              ...rest,
              src: imageSrc,
            }
          )
      }
    />
  )
}
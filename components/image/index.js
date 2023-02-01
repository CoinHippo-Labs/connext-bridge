import Image from 'next/image'
import { useState, useEffect } from 'react'

const loader = (
  {
    src,
    width,
    quality = 75,
  },
) =>
  `${
    process.env.NEXT_PUBLIC_IMAGE_OPTIMIZER_URL ?
      `${process.env.NEXT_PUBLIC_IMAGE_OPTIMIZER_URL}/_next` :
      ''
  }${
    src?.startsWith('/') ?
      '' :
      '/'
  }${src}${
    process.env.NEXT_PUBLIC_IMAGE_OPTIMIZER_URL ?
      `?url=${
        src?.startsWith('/') ?
          process.env.NEXT_PUBLIC_SITE_URL :
          ''
      }${src}&w=${width}&q=${quality}` :
      ''
  }`

export default (
  {
    src,
    src_end,
    duration_second = 2,
    ...rest
  }
) => {
  const [imageSrc, setImageSrc] = useState(src)
  const [timer, setTimer] = useState(0)

  useEffect(
    () => {
      const timeout =
        setTimeout(
          () =>
            setTimer(timer + 1),
          1 * 1000,
        )

      return () => clearTimeout(timeout)
    },
    [timer],
  )

  useEffect(
    () => {
      if (src) {
        setImageSrc(src)
      }
    },
    [src],
  )

  useEffect(
    () => {
      if (
        src_end &&
        timer > duration_second
      ) {
        setImageSrc(src_end)
      }
    },
    [src_end, timer],
  )

  return (
    <Image
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
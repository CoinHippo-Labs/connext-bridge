import Image from 'next/image'
import { useState, useEffect } from 'react'

const IMAGE_OPTIMIZER_URL = ''
const loader = ({ src, width, quality = 75 }) => `${IMAGE_OPTIMIZER_URL ? `${IMAGE_OPTIMIZER_URL}/_next` : ''}${src?.startsWith('/') ? '' : '/'}${src}${IMAGE_OPTIMIZER_URL ? `?url=${src?.startsWith('/') ? process.env.NEXT_PUBLIC_APP_URL : ''}${src}&w=${width}&q=${quality}` : ''}`

export default ({ src, srcEnd, duration = 2, alt = '', ...rest }) => {
  const [timer, setTimer] = useState(null)

  useEffect(
    () => {
      if (typeof timer === 'number') {
        const timeout = setTimeout(() => setTimer(timer + 1), 1 * 1000)
        return () => clearTimeout(timeout)
      }
    },
    [timer],
  )

  useEffect(
    () => {
      if (src && srcEnd) {
        setTimer(0)
      }
    },
    [src, srcEnd],
  )

  const _src = timer >= duration && srcEnd ? srcEnd : src
  return (
    <Image
      alt={alt}
      { ...rest }
      src={_src}
      loader={() => loader({ ...rest, src: _src })}
      unoptimized={true}
    />
  )
}
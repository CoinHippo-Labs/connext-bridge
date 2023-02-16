import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default (
  {
    children,
    selector,
  },
) => {
  const [mounted, setMounted] = useState(false)

  const ref = useRef()

  useEffect(
    () => {
      ref.current = document.querySelector(selector)
      setMounted(true)
    },
    [selector],
  )

  return (
    mounted &&
    createPortal(
      children,
      ref.current,
    )
  )
}
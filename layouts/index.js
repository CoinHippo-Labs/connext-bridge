import { useRouter } from 'next/router'

import Empty from './empty'
import Centered from './centered'
import Layout from './layout'

export default function Layouts({ children }) {
  const router = useRouter()
  const { pathname, query } = { ...router }

  return (
    <Layout>
      {children}
    </Layout>
  )
}
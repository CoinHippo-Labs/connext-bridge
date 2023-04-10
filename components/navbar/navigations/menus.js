import { CgArrowRightR } from 'react-icons/cg'
import { RiCopperCoinLine } from 'react-icons/ri'
import { HiSwitchVertical, HiOutlineDocumentSearch } from 'react-icons/hi'

export default
  [
    {
      id: 'bridge',
      title: 'Bridge',
      path: '/',
      others_paths: ['/[bridge]'],
      icon: (
        <CgArrowRightR
          size={20}
          className="3xl:w-6 3xl:h-6 stroke-current"
        />
      ),
    },
    {
      id: 'pools',
      title: 'Pools',
      path: '/pools',
      others_paths: ['/pool', '/pool/[pool]'],
      icon: (
        <RiCopperCoinLine
          size={20}
          className="3xl:w-6 3xl:h-6 stroke-current"
        />
      ),
    },
    {
      id: 'swap',
      title: 'Swap',
      path: '/swap',
      others_paths: ['/swap/[swap]'],
      icon: (
        <HiSwitchVertical
          size={20}
          className="3xl:w-6 3xl:h-6 stroke-current"
        />
      ),
    },
    {
      id: 'explorer',
      title: 'Explorer',
      path: process.env.NEXT_PUBLIC_EXPLORER_URL,
      external: true,
      icon: (
        <HiOutlineDocumentSearch
          size={20}
          className="3xl:w-6 3xl:h-6 stroke-current"
        />
      ),
    },
  ]
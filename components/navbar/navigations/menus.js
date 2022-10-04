import { CgArrowRightR } from 'react-icons/cg'
import { RiCopperCoinLine, RiQuestionAnswerLine } from 'react-icons/ri'
import { MdSwapHoriz } from 'react-icons/md'
import { HiOutlineDocumentSearch } from 'react-icons/hi'
import { BiBook, BiCommentDetail } from 'react-icons/bi'

export default [
  {
    id: 'bridge',
    title: 'Bridge',
    path: '/',
    others_paths: [
      '/[bridge]',
    ],
    icon: (
      <CgArrowRightR
        size={20}
        className="stroke-current"
      />
    ),
  },
  {
    id: 'pools',
    title: 'Pools',
    // path: '/pools',
    path: '/pool',
    others_paths: [
      '/pool',
      '/pool/[pool]',
    ],
    icon: (
      <RiCopperCoinLine
        size={20}
        className="stroke-current"
      />
    ),
  },
  {
    id: 'swap',
    title: 'Swap',
    path: '/swap',
    others_paths: [
      '/swap/[swap]',
    ],
    icon: (
      <MdSwapHoriz
        size={20}
        className="stroke-current"
      />
    ),
  },
  {
    id: 'explore',
    title: 'Explore',
    path: process.env.NEXT_PUBLIC_EXPLORER_URL,
    external: true,
    icon: (
      <HiOutlineDocumentSearch
        size={20}
        className="stroke-current"
      />
    ),
  },
  {
    id: 'doc',
    title: 'Doc',
    path: process.env.NEXT_PUBLIC_DOC_URL,
    external: true,
    icon: (
      <BiBook
        size={20}
        className="stroke-current"
      />
    ),
  },
  {
    id: 'support',
    title: 'Support',
    path: process.env.NEXT_PUBLIC_SUPPORT_URL,
    external: true,
    icon: (
      <RiQuestionAnswerLine
        size={20}
        className="stroke-current"
      />
    ),
  },
  {
    id: 'feedback',
    title: 'Feedback',
    path: process.env.NEXT_PUBLIC_FEEDBACK_URL,
    external: true,
    emphasize: true,
    icon: (
      <BiCommentDetail
        size={20}
        className="stroke-current"
      />
    ),
  },
]
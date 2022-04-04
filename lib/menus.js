import { RiFileSearchLine, RiFileCodeLine, RiQuestionAnswerLine } from 'react-icons/ri'
import { BiCommentDetail } from 'react-icons/bi'

export const navigations = [
  {
    id: 'explorer',
    title: 'Explorer',
    icon: <RiFileSearchLine size={20} />,
    path: `${process.env.NEXT_PUBLIC_EXPLORER_URL}`,
    external: true,
  },
  {
    id: 'doc',
    title: 'Doc',
    icon: <RiFileCodeLine size={20} />,
    path: `${process.env.NEXT_PUBLIC_DOC_URL}`,
    external: true,
  },
  {
    id: 'support',
    title: 'Support',
    icon: <RiQuestionAnswerLine size={20} />,
    path: `${process.env.NEXT_PUBLIC_FAQ_URL}`,
    external: true,
  },
  // {
  //   id: 'feedback',
  //   title: 'Feedback',
  //   icon: <BiCommentDetail size={20} />,
  //   path: `${process.env.NEXT_PUBLIC_FEEDBACK_URL}`,
  //   external: true,
  // },
]
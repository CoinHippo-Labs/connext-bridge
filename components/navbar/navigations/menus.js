import { RiFileSearchLine, RiFileCodeLine, RiQuestionAnswerLine } from 'react-icons/ri'
import { BsGithub } from 'react-icons/bs'
import { BiCommentDetail } from 'react-icons/bi'

export default [
  {
    id: 'explorer',
    title: 'Explorer',
    path: process.env.NEXT_PUBLIC_EXPLORER_URL,
    external: true,
    icon: <RiFileSearchLine size={20} className="stroke-current" />,
  },
  {
    id: 'doc',
    title: 'Doc',
    path: process.env.NEXT_PUBLIC_DOC_URL,
    external: true,
    icon: <RiFileCodeLine size={20} className="stroke-current" />,
  },
  {
    id: 'github',
    title: 'Github',
    path: process.env.NEXT_PUBLIC_GITHUB_URL,
    external: true,
    icon: <BsGithub size={20} className="stroke-current" />,
  },
  {
    id: 'support',
    title: 'Support',
    path: process.env.NEXT_PUBLIC_SUPPORT_URL,
    external: true,
    icon: <RiQuestionAnswerLine size={20} className="stroke-current" />,
  },
  {
    id: 'feedback',
    title: 'Feedback',
    path: process.env.NEXT_PUBLIC_FEEDBACK_URL,
    external: true,
    emphasize: true,
    icon: <BiCommentDetail size={20} className="stroke-current" />,
  },
]
import { RiFileSearchLine, RiFileCodeLine, RiQuestionAnswerLine } from 'react-icons/ri'

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
]
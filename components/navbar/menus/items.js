import { useState } from 'react'
import { HiCode } from 'react-icons/hi'
import { CgFileDocument } from 'react-icons/cg'
import { FaDiscord } from 'react-icons/fa'
import { BsTwitter, BsTelegram, BsGithub } from 'react-icons/bs'
import { BiChevronRight } from 'react-icons/bi'
import { ImArrowLeft2 } from 'react-icons/im'

import Image from '../../image'
import { toArray } from '../../../lib/utils'

const menus = [
  {
    title: 'Developers',
    icon: (
      <HiCode
        size={20}
        className="3xl:w-6 3xl:h-6 text-blue-500 dark:text-white"
      />
    ),
    items: [
      process.env.NEXT_PUBLIC_DOCS_URL &&
      {
        title: 'Documentation',
        url: process.env.NEXT_PUBLIC_DOCS_URL,
        icon: (
          <CgFileDocument
            size={20}
            className="3xl:w-6 3xl:h-6 text-blue-500 dark:text-white"
          />
        ),
      },
      process.env.NEXT_PUBLIC_CONNEXT_GITHUB_URL &&
      {
        title: 'Connext GitHub',
        url: process.env.NEXT_PUBLIC_CONNEXT_GITHUB_URL,
        icon: (
          <BsGithub
            size={20}
            className="3xl:w-6 3xl:h-6 text-black dark:text-white"
          />
        ),
      },
      process.env.NEXT_PUBLIC_GITHUB_URL &&
      {
        title: 'Bridge GitHub',
        url: process.env.NEXT_PUBLIC_GITHUB_URL,
        icon: (
          <BsGithub
            size={20}
            className="3xl:w-6 3xl:h-6 text-black dark:text-white"
          />
        ),
      },
    ]
    .filter(i => i),
  },
  process.env.NEXT_PUBLIC_PROTOCOL_URL &&
  {
    title: 'About Connext',
    url: process.env.NEXT_PUBLIC_PROTOCOL_URL,
    icon: (
      <Image
        src="/logos/logo.png"
        width={20}
        height={20}
        className="3xl:w-6 3xl:h-6"
      />
    ),
  },
  process.env.NEXT_PUBLIC_TWITTER_USERNAME &&
  {
    title: 'Twitter',
    url: `https://twitter.com/${process.env.NEXT_PUBLIC_TWITTER_USERNAME}`,
    icon: (
      <BsTwitter
        size={20}
        className="3xl:w-6 3xl:h-6 text-blue-400 dark:text-white"
      />
    ),
  },
  process.env.NEXT_PUBLIC_TELEGRAM_USERNAME &&
  {
    title: 'Telegram',
    url: `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_USERNAME}`,
    icon: (
      <BsTelegram
        size={20}
        className="3xl:w-6 3xl:h-6 text-blue-500 dark:text-white"
      />
    ),
  },
  process.env.NEXT_PUBLIC_DISCORD_URL &&
  {
    title: 'Discord',
    url: process.env.NEXT_PUBLIC_DISCORD_URL,
    icon: (
      <FaDiscord
        size={20}
        className="3xl:w-6 3xl:h-6 text-blue-600 dark:text-white"
      />
    ),
  },
]
.filter(m => m)

export default () => {
  const [openMenu, setOpenMenu] = useState(null)

  const {
    title,
    items,
  } = { ...openMenu }

  return (
    <div className="flex flex-wrap pb-0">
      {openMenu ?
        <>
          <div className="w-full bg-slate-50 dark:bg-slate-800 flex items-center justify-start space-x-2.5 p-3.5">
            <ImArrowLeft2
              size={20}
              onClick={() => setOpenMenu(null)}
              className="3xl:w-6 3xl:h-6 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer rounded-full p-1 mt-0.5"
            />
            <span className="3xl:text-xl font-bold">
              {title}
            </span>
          </div>
          {toArray(items)
            .map((m, i) => {
              const {
                title,
                url,
                icon,
              } = { ...m }

              const item = (
                <>
                  {icon}
                  <span className="3xl:text-xl font-semibold">
                    {title}
                  </span>
                </>
              )

              return (
                <a
                  key={i}
                  title={title}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-start space-x-2.5 p-3.5"
                >
                  {item}
                </a>
              )
            })
          }
        </> :
        toArray(menus)
          .map((m, i) => {
            const {
              title,
              url,
              icon,
              items,
            } = { ...m }

            const item = (
              <>
                {icon}
                <span className="3xl:text-xl font-semibold">
                  {title}
                </span>
              </>
            )

            return (
              toArray(items).length > 0 ?
                <div
                  key={i}
                  title={title}
                  onClick={() => setOpenMenu(m)}
                  className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between space-x-2.5 p-3.5"
                >
                  <div className="flex items-center justify-start space-x-2.5">
                    {item}
                  </div>
                  <BiChevronRight
                    size={18}
                    className="3xl:w-6 3xl:h-6 mt-0.5"
                  />
                </div> :
                <a
                  key={i}
                  title={title}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-start space-x-2.5 p-3.5"
                >
                  {item}
                </a>
            )
          })
      }
    </div>
  )
}
import Image from 'next/image'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { FaHeart, FaDiscord } from 'react-icons/fa'
import { BsTwitter, BsTelegram, BsGithub } from 'react-icons/bs'

import _package from '../../package.json'

export default function Footer() {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  return (
    <div className={`footer flex flex-col md:flex-row items-center text-xs space-y-2 sm:space-y-0 p-3 ${theme}`}>
      <div className="w-full md:w-1/2 lg:w-1/3 min-w-max flex items-center justify-center md:justify-start font-medium space-x-1.5">
        <span>Built with</span>
        <a
          title="build cross-chain apps"
          href={process.env.NEXT_PUBLIC_PROTOCOL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5"
        >
          <div className="min-w-max">
            <div className="flex dark:hidden items-center">
              <Image
                src="/logos/externals/connext/logo.png"
                alt=""
                width={16}
                height={16}
              />
            </div>
            <div className="hidden dark:flex items-center">
              <Image
                src="/logos/externals/connext/logo_white.png"
                alt=""
                width={16}
                height={16}
              />
            </div>
          </div>
          <span>Connext Protocol</span>
        </a>
        {_package?.dependencies?.['@connext/nxtp-sdk'] && (
          <span className="text-gray-400 dark:text-white font-semibold">
            (SDK v{_package.dependencies['@connext/nxtp-sdk'].replace('^', '')})
          </span>
        )}
      </div>
      <div className="hidden lg:flex w-full lg:w-1/3 flex-wrap items-center justify-center">
        {process.env.NEXT_PUBLIC_TWITTER_USERNAME && (
          <a
            href={`https://twitter.com/${process.env.NEXT_PUBLIC_TWITTER_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BsTwitter className="text-blue-400 dark:text-white text-base" />
          </a>
        )}
        {process.env.NEXT_PUBLIC_TELEGRAM_USERNAME && (
          <a
            href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BsTelegram className="text-blue-500 dark:text-white text-base" />
          </a>
        )}
        {process.env.NEXT_PUBLIC_DISCORD_URL && (
          <a
            href={process.env.NEXT_PUBLIC_DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaDiscord className="text-blue-600 dark:text-white text-base" />
          </a>
        )}
        {process.env.NEXT_PUBLIC_GITHUB_URL && (
          <a
            href={process.env.NEXT_PUBLIC_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BsGithub className="text-black dark:text-white text-base" />
          </a>
        )}
        {process.env.NEXT_PUBLIC_ENS_NAME && (
          <a
            href={`https://app.ens.domains/name/${process.env.NEXT_PUBLIC_ENS_NAME}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="min-w-max">
              <div className="flex dark:hidden items-center">
                <Image
                  src="/logos/externals/ens/logo.png"
                  alt=""
                  width={16}
                  height={16}
                />
              </div>
              <div className="hidden dark:flex items-center">
                <Image
                  src="/logos/externals/ens/logo_white.png"
                  alt=""
                  width={16}
                  height={16}
                />
              </div>
            </div>
          </a>
        )}
      </div>
      <div className="w-full md:w-1/2 lg:w-1/3 min-w-max flex items-center justify-center md:justify-end text-gray-400 dark:text-white space-x-1">
        <span>© {moment().format('YYYY')} made with</span>
        <FaHeart className="text-red-400 text-xl pr-0.5" />
        <span>
          {"by "}
          <a
            href={process.env.NEXT_PUBLIC_TEAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-white font-semibold"
          >
            {process.env.NEXT_PUBLIC_TEAM_NAME}
          </a>
          {" team."}
        </span>
      </div>
    </div>
  )
}
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { FaHeart, FaDiscord } from 'react-icons/fa'
import { BsTwitter, BsTelegram, BsGithub } from 'react-icons/bs'

import Image from '../image'
import _package from '../../package.json'

export default () => {
  const {
    preferences,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }

  const {
    dependencies,
  } = { ..._package }

  return (
    <div className={`${theme} footer flex flex-col md:flex-row items-center space-y-2.5 sm:space-y-0 p-3`}>
      <div className="w-full md:w-1/2 lg:w-1/3 min-w-max flex items-center justify-center md:justify-start space-x-2">
        <span>
          Built with
        </span>
        <a
          title="Build Cross-Chain Apps"
          href={process.env.NEXT_PUBLIC_PROTOCOL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5"
        >
          <div className="min-w-max">
            <div className="flex dark:hidden items-center">
              <Image
                src="/logos/logo.png"
                alt=""
                width={20}
                height={20}
              />
            </div>
            <div className="hidden dark:flex items-center">
              <Image
                src="/logos/logo_white.png"
                alt=""
                width={20}
                height={20}
              />
            </div>
          </div>
          <span>
            Connext Protocol
          </span>
        </a>
        {
          dependencies?.['@connext/nxtp-sdk'] &&
          (
            <a
              href="https://github.com/connext/nxtp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-white font-medium"
            >
              SDK v
              {
                dependencies['@connext/nxtp-sdk']
                  .replace(
                    '^',
                    '',
                  )
              }
            </a>
          )
        }
      </div>
      <div className="hidden lg:flex w-full lg:w-1/3 flex-wrap items-center justify-center space-x-2">
        {process.env.NEXT_PUBLIC_TWITTER_USERNAME && (
          <a
            href={`https://twitter.com/${process.env.NEXT_PUBLIC_TWITTER_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BsTwitter
              size={20}
              className="text-blue-400 dark:text-white"
            />
          </a>
        )}
        {process.env.NEXT_PUBLIC_TELEGRAM_USERNAME && (
          <a
            href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BsTelegram
              size={20}
              className="text-blue-500 dark:text-white"
            />
          </a>
        )}
        {process.env.NEXT_PUBLIC_DISCORD_URL && (
          <a
            href={process.env.NEXT_PUBLIC_DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaDiscord
              size={20}
              className="text-blue-600 dark:text-white"
            />
          </a>
        )}
        {process.env.NEXT_PUBLIC_GITHUB_URL && (
          <a
            href={process.env.NEXT_PUBLIC_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BsGithub
              size={20}
              className="text-black dark:text-white"
            />
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
                  width={20}
                  height={20}
                />
              </div>
              <div className="hidden dark:flex items-center">
                <Image
                  src="/logos/externals/ens/logo_white.png"
                  alt=""
                  width={20}
                  height={20}
                />
              </div>
            </div>
          </a>
        )}
      </div>
      <div className="w-full md:w-1/2 lg:w-1/3 min-w-max flex items-center justify-center md:justify-end text-slate-400 dark:text-white space-x-1">
        <span>
          © {moment().format('YYYY')} made with
        </span>
        <FaHeart
          className="text-red-400 text-xl pr-0.5"
        />
        <span>
          {"by "}
          <a
            href={process.env.NEXT_PUBLIC_TEAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-white font-semibold"
          >
            {process.env.NEXT_PUBLIC_TEAM_NAME}
          </a>
          {" team."}
        </span>
      </div>
    </div>
  )
}
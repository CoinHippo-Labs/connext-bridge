import { Tooltip } from '@material-tailwind/react'

import Image from '../../image'

export default () => {
  const is_testnet =
    [
      'testnet',
    ]
    .includes(
      process.env.NEXT_PUBLIC_NETWORK
    )

  return (
    <div className="logo ml-3 mr-0.5 sm:mr-3">
      <a
        href={process.env.NEXT_PUBLIC_MAIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex flex-col items-start"
      >
        <div
          title="Cross-Chain Bridge"
          className="min-w-max sm:mr-3"
        >
          <div className="flex dark:hidden items-center">
            <div className="flex sm:hidden">
              <Image
                src="/logos/logo.png"
                width={32}
                height={32}
              />
            </div>
            <div className="hidden sm:flex">
              <Image
                src="/logos/logo_with_name.png"
                width={128}
                height={32}
              />
            </div>
          </div>
          <div className="hidden dark:flex items-center">
            <div className="flex sm:hidden">
              <Image
                src="/logos/logo_white.png"
                width={32}
                height={32}
              />
            </div>
            <div className="hidden sm:flex">
              <Image
                src="/logos/logo_with_name_white.png"
                width={128}
                height={32}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-0 sm:ml-10">
          <div className="max-w-min bg-slate-200 dark:bg-slate-800 rounded whitespace-nowrap uppercase text-slate-600 dark:text-white text-xs font-medium py-1 px-2">
            Beta
          </div>
          <Tooltip
            placement="bottom"
            content="return back to nxtp-v1"
            className="z-50 bg-dark text-white text-xs"
          >
            <a
              href="https://bridge.connext.network"
              className="bg-slate-200 dark:bg-slate-800 rounded whitespace-nowrap text-blue-500 dark:text-blue-500 text-xs font-medium py-1 px-2"
            >
              ← NXTP v1
            </a>
          </Tooltip>
          <div className="hidden sm:block">
            {
              is_testnet &&
              (
                <div className="max-w-min whitespace-nowrap lowercase text-slate-400 dark:text-slate-500 text-xs">
                  {process.env.NEXT_PUBLIC_NETWORK}
                </div>
              )
            }
          </div>
        </div>
      </a>
    </div>
  )
}
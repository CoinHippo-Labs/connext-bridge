import { TiArrowRight } from 'react-icons/ti'

import Image from '../image'

export default () => {
  return (
    <div className="w-full max-w-lg bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800 shadow dark:shadow-slate-600 space-y-3 p-4">
      <div className="text-base font-bold">
        <span className="mr-1">
          The {process.env.NEXT_PUBLIC_APP_NAME} Bridge is powered by
        </span>
        <a
          href="https://nomad.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Nomad
        </a>
      </div>
      <div className="text-slate-400 dark:text-slate-400 text-sm">
        Nomad is an optimistic interoperability protocol that enables secure cross-chain communication.
      </div>
      <div className="flex items-center justify-between space-x-2">
        <a
          href="https://docs.nomad.xyz/nomad-101/introduction#how-does-nomad-work"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center"
        >
          <span className="text-sm font-medium">
            How does Nomad work?
          </span>
          <TiArrowRight
            size={20}
            className="transform -rotate-45 text-blue-500 dark:text-white mt-0.5 -mr-1"
          />
        </a>
        <a
          href="https://nomad.xyz"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="flex dark:hidden items-center">
            <Image
              src="/logos/externals/nomad/logo.png"
              alt=""
              width={75.75}
              height={18}
            />
          </div>
          <div className="hidden dark:flex items-center">
            <Image
              src="/logos/externals/nomad/logo_white.png"
              alt=""
              width={75.75}
              height={18}
            />
          </div>
        </a>
      </div>
    </div>
  )
}
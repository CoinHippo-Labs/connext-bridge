import Image from 'next/image'

export default function Logo() {
  return (
    <div className="logo ml-3 mr-1 sm:mr-3">
      <a
        title="cross-chain bridge"
        href={process.env.NEXT_PUBLIC_MAIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-start"
      >
        <div className="min-w-max sm:mr-3">
          <div className="flex dark:hidden items-center">
            <Image
              src="/logos/logo.png"
              alt=""
              width={32}
              height={32}
            />
          </div>
          <div className="hidden dark:flex items-center">
            <Image
              src="/logos/logo_white.png"
              alt=""
              width={32}
              height={32}
            />
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="normal-case text-base font-semibold">
            {process.env.NEXT_PUBLIC_APP_NAME}
          </div>
          <div className="max-w-min bg-blue-500 dark:bg-blue-800 rounded whitespace-nowrap text-white px-1.5 mt-0.5">
            {process.env.NEXT_PUBLIC_ENVIRONMENT}
          </div>
        </div>
      </a>
    </div>
  )
}
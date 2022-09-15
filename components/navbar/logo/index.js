import Image from '../../image'

export default () => {
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
          <div className="uppercase tracking-widest text-base font-semibold">
            {process.env.NEXT_PUBLIC_APP_NAME}
          </div>
          <div className="max-w-min bg-blue-500 dark:bg-blue-500 rounded-xl whitespace-nowrap uppercase tracking-wider text-white text-2xs py-0.5 px-2.5 mt-0.5">
            {process.env.NEXT_PUBLIC_NETWORK}
          </div>
        </div>
      </a>
    </div>
  )
}
import Image from '../../image'

export default () => {
  const is_testnet =
    [
      'testnet',
    ].includes(process.env.NEXT_PUBLIC_NETWORK)

  return (
    <div className="logo ml-3 mr-0.5 sm:mr-3">
      <a
        title="Cross-Chain Bridge"
        href={process.env.NEXT_PUBLIC_MAIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex flex-col items-start"
      >
        <div className="min-w-max sm:mr-3">
          <div className="flex dark:hidden items-center">
            <div className="flex sm:hidden">
              <Image
                src="/logos/logo.png"
                alt=""
                width={32}
                height={32}
              />
            </div>
            <div className="hidden sm:flex">
              <Image
                src="/logos/logo_with_name.png"
                alt=""
                width={128}
                height={32}
              />
            </div>
          </div>
          <div className="hidden dark:flex items-center">
            <div className="flex sm:hidden">
              <Image
                src="/logos/logo_white.png"
                alt=""
                width={32}
                height={32}
              />
            </div>
            <div className="hidden sm:flex">
              <Image
                src="/logos/logo_with_name_white.png"
                alt=""
                width={128}
                height={32}
              />
            </div>
          </div>
        </div>
        <div className="hidden sm:block">
          {/*<div className="tracking-wider text-base font-bold">
            {process.env.NEXT_PUBLIC_APP_NAME}
          </div>*/}
          {
            is_testnet &&
            (
              // <div className="max-w-min bg-blue-500 dark:bg-blue-500 rounded whitespace-nowrap uppercase tracking-wider text-white text-2xs py-0.5 px-2.5 mt-0.5">
              <div className="max-w-min whitespace-nowrap lowercase tracking-wider text-slate-400 dark:text-slate-500 text-sm ml-10">
                {process.env.NEXT_PUBLIC_NETWORK}
              </div>
            )
          }
        </div>
      </a>
    </div>
  )
}
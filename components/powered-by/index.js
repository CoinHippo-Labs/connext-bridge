import Image from '../image'

export default () => {
  return (
    <div className="w-full flex items-center justify-center space-x-1">
      <span className="text-slate-400 dark:text-slate-500 text-base font-semibold">
        Powered by
      </span>
      <div className="flex dark:hidden items-center">
        <Image
          src="/logos/externals/nomad/logo.png"
          alt=""
          width={151.5}
          height={36}
        />
      </div>
      <div className="hidden dark:flex items-center">
        <Image
          src="/logos/externals/nomad/logo_white.png"
          alt=""
          width={151.5}
          height={36}
        />
      </div>
    </div>
  )
}
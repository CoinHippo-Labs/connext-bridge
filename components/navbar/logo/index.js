import Link from 'next/link'

export default function Logo() {
  return (
    <div className="block logo ml-2.5 mr-1 sm:mx-3">
      <Link href="/">
        <a className="w-full flex items-center sm:space-x-2.5 lg:space-x-2">
          <img
            src="/logos/logo.png"
            alt=""
            className="w-8 xl:w-10 h-8 xl:h-10 rounded-full"
          />
          <span className="hidden sm:block uppercase text-base font-bold">{process.env.NEXT_PUBLIC_APP_NAME}</span>
          <span className="font-bold -mt-2 ml-2">{process.env.NEXT_PUBLIC_APP_VERSION}</span>
        </a>
      </Link>
    </div>
  )
}
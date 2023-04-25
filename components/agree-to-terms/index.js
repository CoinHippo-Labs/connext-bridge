import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { IoKeyOutline, IoDocumentTextOutline } from 'react-icons/io5'

import Modal from '../modals'
import { TERMS_AGREED } from '../../reducers/types'

export default (
  {
    useModal = false,
  }
) => {
  const dispatch = useDispatch()
  const {
    preferences,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
      }
    ),
    shallowEqual,
  )
  const {
    terms_agreed,
  } = { ...preferences }

  const title = (
    <span className="normal-case text-lg font-semibold">
      Welcome to the {process.env.NEXT_PUBLIC_APP_NAME} Bridge
    </span>
  )

  const body = (
    <div className="space-y-5 mt-4">
      <div className="space-y-7">
        <div className="space-y-3">
          <div className="flex items-start space-x-4">
            <IoKeyOutline
              size={18}
              className="min-w-fit text-slate-400 dark:text-slate-500 mt-0.5"
            />
            <span className="font-medium">
              We will never ask you for your private keys or seed phrase.
            </span>
          </div>
          <div className="flex items-start space-x-4">
            <IoDocumentTextOutline
              size={18}
              className="min-w-fit text-slate-400 dark:text-slate-500 mt-0.5"
            />
            <div className="flex flex-wrap font-medium">
              <span className="mr-1">
                This is beta software subject to change. For guidance, refer to our
              </span>
              <a
                href={process.env.NEXT_PUBLIC_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-black dark:text-white font-semibold mr-1"
              >
                documentation
              </a>
              <span className="mr-1">
                and
              </span>
              <a
                href={process.env.NEXT_PUBLIC_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-black dark:text-white font-semibold"
              >
                security model
              </a>.
            </div>
          </div>
        </div>
        <div className="flex-wrap font-medium">
          <span className="mr-1">
            By clicking the button below, you agree to our
          </span>
          <a
            href={process.env.NEXT_PUBLIC_TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-black dark:text-white font-semibold"
          >
            terms of service
          </a>.
        </div>
      </div>
      <button
        onClick={
          () => {
            dispatch(
              {
                type: TERMS_AGREED,
                value: true,
              }
            )
          }
        }
        className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base font-medium text-center py-3.5 px-2 sm:px-3"
      >
        Agree to Terms
      </button>
    </div>
  )

  return (
    terms_agreed === false &&
    (useModal ?
      <Modal
        hidden={false}
        title={title}
        body={body}
        noCancelOnClickOutside={true}
        noButtons={true}
        modalClassName="max-w-md"
      /> :
      <div className="max-w-xs bg-slate-100 dark:bg-slate-800 rounded mx-auto pt-5 pb-6 px-5">
        {title}
        {body}
      </div>
    )
  )
}
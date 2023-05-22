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
    <span className="normal-case text-xl 3xl:text-2xl font-bold mx-0.5">
      Welcome to the {process.env.NEXT_PUBLIC_APP_NAME} Bridge
    </span>
  )

  const body = (
    <div className="space-y-4 mt-3.5 mx-0.5">
      <div className="space-y-7">
        <div className="space-y-3.5">
          <div className="flex items-start space-x-3.5">
            <IoKeyOutline
              size={18}
              className="text-slate-400 dark:text-slate-500 mt-0.5"
              style={{ minWidth: '18px' }}
            />
            <span className="tracking-tight leading-5 text-sm 3xl:text-base font-semibold">
              We will never ask you for your private keys or seed phrase.
            </span>
          </div>
          <div className="flex items-start space-x-3.5">
            <IoDocumentTextOutline
              size={18}
              className="text-slate-400 dark:text-slate-500 mt-0.5"
              style={{ minWidth: '18px' }}
            />
            <div className="flex-wrap leading-5 text-sm 3xl:text-base font-semibold">
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
                href={`${process.env.NEXT_PUBLIC_DOCS_URL}/concepts/what-is-connext`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-black dark:text-white font-semibold"
              >
                security model
              </a>.
            </div>
          </div>
        </div>
        <div className="flex-wrap tracking-tight text-sm 3xl:text-base font-semibold">
          <span className="mr-1">
            By clicking the button below, you agree to our
          </span>
          <a
            href={process.env.NEXT_PUBLIC_TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-black dark:text-white font-semibold"
          >
            Terms of Service
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
        className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base 3xl:text-lg font-medium text-center mt-4.5 py-3.5 px-2 sm:px-3"
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
      <div className="max-w-2md 3xl:max-w-xl bg-slate-100 dark:bg-slate-800 rounded mt-0.5 mx-auto pt-6 pb-6 px-7">
        {title}
        {body}
      </div>
    )
  )
}
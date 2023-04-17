import { useSelector, useDispatch, shallowEqual } from 'react-redux'

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
    <span className="normal-case text-xl font-bold">
      Welcome to the {process.env.NEXT_PUBLIC_APP_NAME} Bridge
    </span>
  )

  const body = (
    <div className="space-y-6 mt-6">
      <div className="flex flex-wrap">
        <span className="mr-1">
          By clicking the below, you agree to our
        </span>
        <a
          href={process.env.NEXT_PUBLIC_TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-500 font-medium"
        >
          terms of service
        </a>.
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
        className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-base font-medium text-center py-3 px-2 sm:px-3"
      >
        Agree to terms
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
      <div className="max-w-md bg-slate-100 dark:bg-slate-800 rounded mx-auto py-8 px-6">
        {title}
        {body}
      </div>
    )
  )
}
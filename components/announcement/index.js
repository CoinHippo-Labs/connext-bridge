import { useSelector, shallowEqual } from 'react-redux'
import Linkify from 'react-linkify'
import parse from 'html-react-parser'
import { HiSpeakerphone } from 'react-icons/hi'

import Alert from '../alerts'

export default () => {
  const {
    announcement,
  } = useSelector(state =>
    (
      {
        announcement: state.announcement,
      }
    ),
    shallowEqual,
  )
  const {
    announcement_data,
  } = { ...announcement }

  return (
    announcement_data &&
    (
      <Alert
        color="xl:max-w-lg bg-blue-600 text-white text-left mx-auto"
        icon={
          <HiSpeakerphone
            className="w-4 xl:w-6 h-4 xl:h-6 stroke-current mr-3"
          />
        }
        closeDisabled={true}
        rounded={true}
        className="items-start"
      >
        <div className="block leading-4 text-xs xl:text-base font-medium mr-1.5">
          <Linkify>
            {parse(
              announcement_data,
            )}
          </Linkify>
        </div>
      </Alert>
    )
  )
}
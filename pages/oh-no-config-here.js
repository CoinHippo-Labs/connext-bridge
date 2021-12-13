import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import { announcement as getAnnouncement, setAnnouncement } from '../lib/api/bridge_config'

import { ANNOUNCEMENT_DATA } from '../reducers/types'

export default function Config() {
  const dispatch = useDispatch()
  const { announcement } = useSelector(state => ({ announcement: state.announcement }), shallowEqual)
  const { announcement_data } = { ...announcement }

  const [updating, setUpdating] = useState(null)
  const [announcementData, setAnnountmentData] = useState(null)

  useEffect(() => {
    if (announcement_data && typeof announcementData !== 'string') {
      setAnnountmentData(announcement_data.data)
    }
  }, [announcement_data])

  const update = async () => {
    setUpdating(true)

    await setAnnouncement({ data: announcementData?.trim().split('\n').join('<br>') })

    const response = await getAnnouncement()

    dispatch({
      type: ANNOUNCEMENT_DATA,
      value: response,
    })

    setUpdating(false)
  }

  const disabled = updating || !announcement_data

  return (
    <div className="form">
      <div className="form-element">
        <div className="form-label text-gray-600 dark:text-gray-400 font-medium">Announcement</div>
        <textarea
          type="text"
          placeholder="Message / HTML"
          rows="5"
          disabled={disabled}
          value={announcementData}
          onChange={e => {
            if (!disabled) {
              setAnnountmentData(e.target.value)
            }
          }}
          className="max-w-xl bg-white dark:bg-gray-900 border-0 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm"
        />
      </div>
      <button
        disabled={disabled}
        onClick={() => update()}
        className="btn btn-default btn-rounded bg-indigo-500 hover:bg-indigo-600 text-white -mt-1"
      >
        Save
      </button>
    </div>
  )
}
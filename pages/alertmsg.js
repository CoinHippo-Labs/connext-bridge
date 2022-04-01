import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import { announcement as getAnnouncement, setAnnouncement } from '../lib/api/bridge_config'

import { ANNOUNCEMENT_DATA } from '../reducers/types'

export default function AlertMsg() {
  const dispatch = useDispatch()
  const { announcement, wallet } = useSelector(state => ({ announcement: state.announcement, wallet: state.wallet }), shallowEqual)
  const { announcement_data } = { ...announcement }
  const { wallet_data } = { ...wallet }
  const { address } = { ...wallet_data }

  const [updating, setUpdating] = useState(null)
  const [announcementData, setAnnountmentData] = useState(null)

  useEffect(() => {
    if (announcement_data && typeof announcementData !== 'string') {
      setAnnountmentData(announcement_data.data)
    }
  }, [announcement_data])

  const update = async () => {
    setUpdating(true)

    await setAnnouncement({ data: announcementData?.trim().split('\n').join('<br>') }, address && { username: new URL(process.env.NEXT_PUBLIC_SITE_URL)?.hostname, password: address })
    const response = await getAnnouncement()

    dispatch({
      type: ANNOUNCEMENT_DATA,
      value: response,
    })

    setUpdating(false)
  }

  const disabled = updating

  return (
    <div className="form mt-2">
      <div className="form-element">
        <div className="form-label text-gray-600 dark:text-gray-400 font-medium">Announcement</div>
        <textarea
          type="text"
          disabled={disabled}
          rows="5"
          placeholder="Message / HTML"
          value={announcementData}
          onChange={e => {
            if (!disabled) {
              setAnnountmentData(e.target.value)
            }
          }}
          className="max-w-xl bg-white dark:bg-gray-900 border-0 focus:ring-0 dark:focus:ring-0 rounded-xl text-sm"
        />
      </div>
      <button
        disabled={disabled}
        onClick={() => update()}
        className="btn btn-default btn-rounded bg-blue-500 hover:bg-blue-600 text-white -mt-1"
      >
        Save
      </button>
    </div>
  )
}
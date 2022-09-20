import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import { announcement as getAnnouncement, setAnnouncement } from '../../lib/api/config'
import { ANNOUNCEMENT_DATA } from '../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const {
    announcement,
    wallet,
  } = useSelector(state =>
    (
      {
        announcement: state.announcement,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
  const {
    announcement_data,
  } = { ...announcement }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    address,
  } = { ...wallet_data }

  const [updating, setUpdating] = useState(null)
  const [data, setData] = useState('')

  useEffect(() => {
    if (announcement_data) {
      setData(announcement_data)
    }
  }, [announcement_data])

  const update = async () => {
    setUpdating(true)

    await setAnnouncement(
      {
        data: (data || '')
          .trim()
          .split('\n')
          .filter(s => s)
          .join('<br>'),
      },
      address && {
        username: new URL(process.env.NEXT_PUBLIC_SITE_URL)?.hostname,
        password: address,
      },
    )

    dispatch({
      type: ANNOUNCEMENT_DATA,
      value: await getAnnouncement(),
    })

    setUpdating(false)
  }

  const disabled = updating

  return (
    <div className="form space-y-1 my-4">
      <div className="form-element space-y-1">
        <div className="form-label text-lg font-semibold">
          Announcement
        </div>
        <textarea
          type="text"
          disabled={disabled}
          rows="5"
          placeholder="Message / HTML"
          value={data}
          onChange={e => {
            if (!disabled) {
              setData(e.target.value)
            }
          }}
          className="form-textarea max-w-xl text-sm"
        />
      </div>
      <button
        disabled={disabled}
        onClick={() => update()}
        className="btn btn-default btn-rounded bg-blue-600 hover:bg-blue-500 text-white -mt-1"
      >
        Update
      </button>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { XTransferStatus } from '@connext/nxtp-utils'
import StackGrid from 'react-stack-grid'
import { TiArrowRight } from 'react-icons/ti'
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'

import TransferStatus from '../transfer-status'
import { equals_ignore_case } from '../../lib/utils'

const NUM_TRANSFER_DISPLAY = 4

export default ({
  trigger,
}) => {
  const {
    dev,
    wallet,
  } = useSelector(state =>
    (
      {
        dev: state.dev,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
  const {
    sdk,
  } = { ...dev }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    address,
  } = { ...wallet_data }

  const [transfers, setTransfers] = useState(null)
  const [collapse, setCollapse] = useState(null)
  const [timer, setTimer] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (
        sdk &&
        address
      ) {
        try {
          let response = await sdk.nxtpSdkUtils.getTransfersByUser(
            {
              userAddress: address,
            },
          )

          if (!Array.isArray(response)) {
            response = []
          }

          if (
            response.findIndex(t =>
              transfers?.findIndex(_t => _t?.transfer_id) < 0 &&
              ![
                XTransferStatus.Executed,
                XTransferStatus.CompletedFast,
                XTransferStatus.CompletedSlow,
              ].includes(t?.status)
            ) > -1
          ) {
            setCollapse(false)
          }

          setTransfers(
            _.orderBy(
              response,
              ['xcall_timestamp'],
              ['desc'],
            )
          )
        } catch (error) {
          setTransfers(null)
        }
      }
      else {
        setTransfers(null)
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      0.25 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [sdk, address, trigger])

  useEffect(() => {
    const run = async () =>
      setTimer(moment().unix())

    if (!timer) {
      run()
    }

    const interval = setInterval(() =>
      run(),
      0.5 * 1000,
    )

    return () => clearInterval(interval)
  }, [timer])

  const transfersComponent = _.slice(
    (transfers || [])
      .map((t, i) => {
        return (
          <div key={i}>
            <TransferStatus
              data={t}
            />
          </div>
        )
      }),
    0,
    NUM_TRANSFER_DISPLAY,
  )

  return transfers?.length > 0 &&
    (
      <div className="lg:max-w-xs lg:ml-auto">
        <button
          onClick={() => setCollapse(!collapse)}
          className={`w-full flex items-center justify-center ${collapse ? 'text-slate-300 hover:text-slate-800 dark:text-slate-700 dark:hover:text-slate-200 font-normal' : 'font-medium'} space-x-1 mb-2.5`}
        >
          <span className="uppercase tracking-wider">
            Latest Transfers
          </span>
          {collapse ?
            <BiChevronDown
              size={18}
            /> :
            <BiChevronUp
              size={18}
            />
          }
        </button>
        {!collapse && (
          <>
            <StackGrid
              columnWidth={272}
              gutterWidth={16}
              gutterHeight={16}
              className="hidden sm:block max-w-xl mx-auto"
            >
              {transfersComponent}
            </StackGrid>
            <div className="block sm:hidden space-y-3">
              {transfersComponent}
            </div>
            {
              address &&
              transfers.length > NUM_TRANSFER_DISPLAY &&
              (
                <a
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center text-blue-500 dark:text-slate-200 mt-2.5"
                >
                  <span className="font-medium">
                    See more
                  </span>
                  <TiArrowRight
                    size={18}
                    className="transform -rotate-45 mt-0.5"
                  />
                </a>
              )
            }
          </>
        )}
      </div>
    )
}
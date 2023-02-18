const request = async (
  path = '',
  params = {},
) => {
  const response =
    await fetch(
      `${process.env.NEXT_PUBLIC_METRICS_URL}${path}${
        Object.keys(params)
          .length > 0 ?
          `?${
            new URLSearchParams(params)
              .toString()
          }` :
          ''
      }`,
    )
    .catch(error => {
      return null
    })

  return (
    response &&
    await response.json()
  )
}

export const daily_transfer_metrics = async params => await request('/daily_transfer_metrics', params)
export const daily_transfer_volume = async params => await request('/daily_transfer_volume', params)
export const hourly_transfer_metrics = async params => await request('/hourly_transfer_metrics', params)
export const hourly_transfer_volume = async params => await request('/hourly_transfer_volume', params)
export const daily_swap_tvl = async params => await request('/daily_swap_tvl', params)
export const daily_router_tvl = async params => await request('/daily_router_tvl', params)
export const daily_swap_volume = async params => await request('/daily_swap_volume', params)
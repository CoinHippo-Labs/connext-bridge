const request = async (path = '', params = {}) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_METRICS_URL}${path}${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`).catch(error => { return null })
  return response && await response.json()
}

export const getDailyTransferMetrics = async params => await request('/daily_transfer_metrics', params)
export const getDailyTransferVolume = async params => await request('/daily_transfer_volume', params)
export const getHourlyTransferMetrics = async params => await request('/hourly_transfer_metrics', params)
export const getHourlyTransferVolume = async params => await request('/hourly_transfer_volume', params)
export const getDailySwapTVL = async params => await request('/daily_swap_tvl', params)
export const getDailyRouterTVL = async params => await request('/daily_router_tvl', params)
export const getDailySwapVolume = async params => await request('/daily_swap_volume', params)
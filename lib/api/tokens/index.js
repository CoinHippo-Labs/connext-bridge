const request = async params => {
  params = {
    ...params,
    method: 'getTokensPrice',
  }

  const response = await fetch(process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

export const getTokensPrice = async params => await request(params)
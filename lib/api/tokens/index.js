const _module = 'tokens'

const request = async (path, params) => {
  params = { ...params, path, module: _module }
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL, {
    method: 'POST',
    body: params,
  }).catch(error => { return null })
  return res && await res.json()
}

export const tokens = async params => await request(null, params)
const _module = 'assets-price'

const request = async (
  path,
  params,
) => {
  params = {
    ...params,
    path,
    module: _module,
  }

  const response =
    await fetch(
      process.env.NEXT_PUBLIC_API_URL,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    )
    .catch(error => {
      return null
    })

  return (
    response &&
    await response.json()
  )
}

export const assets_price = async params =>
  [{"id":"usdc_1675382400000","chain_id":1,"contract_address":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","coingecko_id":"usd-coin","price":1.002,"name":"USD Coin","symbol":"USDC","image":"/logos/assets/usdc.png","decimals":6,"price_timestamp":1675382400000,"updated_at":1675400591762,"next_asset":{"symbol":"nextUSDC","image":"/logos/assets/nextusdc.png","decimals":6,"contract_address":"0x67E51f46e8e14D4E4cab9dF48c59ad8F512486DD"},"is_pool":true},{"id":"eth_1675382400000","chain_id":1,"contract_address":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","coingecko_id":"weth","price":1643.55,"name":"Ethereum","symbol":"WETH","image":"/logos/assets/weth.png","decimals":18,"price_timestamp":1675382400000,"updated_at":1675400591772,"next_asset":{"symbol":"nextWETH","image":"/logos/assets/nextweth.png","decimals":18,"contract_address":"0xbAD5B3c68F855EaEcE68203312Fd88AD3D365e50"},"is_pool":true},{"id":"kp3r_1675382400000","chain_id":1,"contract_address":"0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44","coingecko_id":"keep3rv1","price":83.24,"name":"Keep3rV1","symbol":"KP3R","image":"/logos/assets/kp3r.png","decimals":18,"price_timestamp":1675382400000,"updated_at":1675400591773,"next_asset":{"symbol":"nextKP3R","image":"/logos/assets/nextkp3r.png","decimals":18,"contract_address":"0xca87472DBfB041c2e5a2672d319eA6184Ad9755e"}},{"id":"kp3r-lp_1675382400000","chain_id":1,"contract_address":"0x3f6740b5898c5D3650ec6eAce9a649Ac791e44D7","coingecko_id":"ethereum","price":1643.19,"name":"Keep3rLP","symbol":"KLP","image":"/logos/assets/kp3r.png","decimals":18,"price_timestamp":1675382400000,"updated_at":1675400591812,"next_asset":{"symbol":"nextKLP","image":"/logos/assets/nextkp3r.png","decimals":18,"contract_address":"0xf232D1Afbed9Df3880143d4FAD095f3698c4d1c6"}}]
  // await request(
  //   undefined,
  //   params,
  // )
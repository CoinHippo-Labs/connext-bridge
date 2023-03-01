const { createSecureHeaders } = require('next-secure-headers')

module.exports = {
  headers: () => {
    return (
      [
        {
          source: '/(.*)',
          headers: createSecureHeaders(),
        },
      ]
    )
  },
  webpack5: true,
  webpack: config => {
    config.resolve.fallback = {
      assert: false,
      fs: false,
      querystring: false,
      crypto: require.resolve('crypto-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify'),
      stream: require.resolve('stream-browserify'),
    }

    return config
  },
}
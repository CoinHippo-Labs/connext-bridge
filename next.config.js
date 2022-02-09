module.exports = {
  webpack5: true,
  webpack: config => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
      os: require.resolve('os-browserify'),
      stream: require.resolve('stream-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      querystring: false,
      assert: false,
    }

    return config
  },
}
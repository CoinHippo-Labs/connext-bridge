module.exports = {
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
    config.experiments.asyncWebAssembly = true
    return config
  },
  images: {
    loader: 'imgix',
    path: '',
  },
}
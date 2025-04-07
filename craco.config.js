const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        http: require.resolve("stream-http"),
        https: require.resolve("https-browserify"),
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        os: require.resolve("os-browserify/browser"),
        url: require.resolve("url/"),
        assert: require.resolve("assert/"),
        zlib: require.resolve("browserify-zlib"),
        path: require.resolve("path-browserify"),
        querystring: require.resolve("querystring-es3"),
        buffer: require.resolve("buffer/"),
        util: require.resolve("util/"),
        process: require.resolve("process/browser"),
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        http2: false,
      };

      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          process: "process/browser",
          Buffer: ["buffer", "Buffer"],
        }),
      ];

      return webpackConfig;
    },
  },
};

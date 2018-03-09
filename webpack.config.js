const path = require('path');
const fs = require('fs');

const mods = {};
fs.readdirSync('node_modules').concat(['../settings'])
  .filter(x => ['.bin'].indexOf(x) === -1)
  .forEach(mod => {
    mods[mod] = 'commonjs ' + mod;
  });

const plugins = [];

const config = {
  target: 'node',
  entry: {
    './dist/test': './test',
    './dist/index': './src/index'
  },
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, './'),
    filename: '[name].js',
    chunkFilename: '[id].chunk.js',
    library: '[name]',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  externals: mods,
  module: {
    rules: [
      // Support for ES6 modules and the latest ES syntax.
      {
        test: /\.jsx?$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  },
  plugins
};

module.exports = config;

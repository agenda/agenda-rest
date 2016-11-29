const webpack = require('webpack');
const path = require('path');
const fs = require('file-system');

const mods = {};
fs.readdirSync('node_modules')
    .filter(x => ['.bin'].indexOf(x) === -1)
    .forEach(mod => {
        mods[mod] = 'commonjs ' + mod;
    });

const plugins = [];

const config = {
    target: 'node',
    entry: {
        './index': './src/index'
    },
    devtool: 'source-map',
    output: {
        path: './',
        filename: '[name].js',
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
    plugins: plugins
};

module.exports = config;

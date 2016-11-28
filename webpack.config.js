var webpack = require('webpack');
var path = require('path');
var fs = require("file-system");

var mods = {};
fs.readdirSync("node_modules")
    .filter(x => [".bin"].indexOf(x) === -1)
    .forEach(mod => {
        mods[mod] = "commonjs " + mod;
    });

var plugins = [];

var config = {
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
        loaders: [
            // Support for ES6 modules and the latest ES syntax.
            {
                test: /\.jsx?$/,
                exclude: /(node_modules)/,
                loader: "babel"
            }
        ]
},
    resolveLoader: {
        root: path.join(__dirname, 'node_modules')
    },
    resolve: {
        root: path.resolve('./src'),
        extensions: ['', '.js']
    },
    plugins: plugins
};

module.exports = config;

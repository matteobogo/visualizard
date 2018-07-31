const webpack = require("webpack");

//const OpenBrowserPlugin = require('open-browser-webpack-plugin');
const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
    entry: "./src/index.js",
    output: {
        path: path.resolve("dist/assets"),
        filename: "bundle.js",
        publicPath: "assets"
    },
    // plugins: [
    //     new OpenBrowserPlugin({url: 'http://localhost:4800'}),
    //     new Dotenv()
    // ],
    devServer: {
        host: '0.0.0.0',
        inline: true,
        contentBase: './dist',
        hot: true,  //live-reload
        port: 4800
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader',
            },
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader'
            },
            {
                test: /\.png$/,
                loader: 'url-loader?limit=100000'
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'url-loader?limit=10000&mimetype=application/font-woff'
            },
            {
                // test: /\.(ttf|otf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?|(jpg|gif)$/,
                test: /\.(jpg|png|gif|svg|pdf|ico|ttf|otf|eot)$/,
                loader: 'file-loader'
            }]
    },
};
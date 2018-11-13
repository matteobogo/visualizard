const webpack = require("webpack");

const HtmlWebpackPlugin = require('html-webpack-plugin');
const OpenBrowserPlugin = require('open-browser-webpack-plugin');
const path = require('path');
//const Dotenv = require('dotenv-webpack');

module.exports = {
    entry: ["babel-polyfill", "./src/index.js"],
    output: {
        path: path.resolve("dist"),
        filename: "bundle.js",
        publicPath: "/"
    },
    plugins: [
        new OpenBrowserPlugin({url: 'http://localhost:4800'}),
        new HtmlWebpackPlugin({
            template: 'src/index.html', //load an existing index.html
            //tells the plugin to inject any js script into the bottom of the page, just before the </body> tag
            inject: 'body',
        }),
        //new Dotenv()
    ],
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
                test: /\.html$/,
                use: [
                    {
                        loader: "html-loader",
                        options: { minimize: true }
                    }
                ]
            },
            {
                test: /\.(js|jsx)$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader',
                resolve: { extensions: [".js", ".jsx"]}
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
                // tests: /\.(ttf|otf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?|(jpg|gif)$/,
                test: /\.(jpg|png|gif|svg|pdf|ico|ttf|otf|eot)$/,
                loader: 'file-loader'
            }]
    },
};
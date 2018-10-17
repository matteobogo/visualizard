const webpack = require("webpack");

const path = require('path');
//const Dotenv = require('dotenv-webpack');

/*
 * The plugin will generate an HTML5 file for you that includes all your webpack bundles in the body using script tags.
 * More on https://www.npmjs.com/package/html-webpack-plugin
 */
const HtmlWebpackPlugin = require('html-webpack-plugin');

/*
 * This plugin uses uglify-js to minify your JavaScript (production)
 * More on https://github.com/webpack-contrib/uglifyjs-webpack-plugin
 */
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

/*
 * This plugin extracts CSS into separate files. It creates a CSS file per JS file which contains CSS.
 * More on https://github.com/webpack-contrib/mini-css-extract-plugin
 */
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

/*
 * A Webpack plugin to optimize \ minimize CSS assets.
 * More on https://github.com/NMFR/optimize-css-assets-webpack-plugin
 */
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

/*
 * Note: since webpack v.4+, the production output gets minified using UglifyJS by default. The minification process is
 * controlled through two configuration fields: optimization.minimize flag to toggle it and optimization.minimizer array
 * to configure the process. To tune the defaults, we use the uglifyjs-webpack-plugin.
 */

module.exports = {
    mode: 'production',
    entry: ["babel-polyfill", "./src/index.js"],
    output: {
        path: path.resolve("dist"),
        filename: "bundle.js",
        publicPath: "/"
    },
    plugins: [
        //new Dotenv(),
        new HtmlWebpackPlugin({
            template: 'src/index.html', //load an existing index.html
            //tells the plugin to inject any js script into the bottom of the page, just before the </body> tag
            inject: 'body',
            minify: {
                collapseWhitespace: true,
                collapseInlineTagWhitespace: true,
                removeComments: true,
                removeRedundantAttributes: true,
            }
        }),
        new MiniCssExtractPlugin({
            filename: "[name].css",
            chunkFilename: "[id].css"
        }),
    ],
    optimization: {
        minimizer: [
            new UglifyJsPlugin({
                cache: true,
                parallel: true,
            }),
            new OptimizeCssAssetsPlugin({}),
        ]
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
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader"
                ]
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

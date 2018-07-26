const webpack = require('webpack');
const path = require('path');

//const ExtractTextPlugin = require('extract-text-webpack-plugin');
//const CopyWebpackPlugin = require('copy-webpack-plugin');

//const HtmlWebpackPlugin = require('html-webpack-plugin')

const config = () => {

    return {
        mode: 'development',
        context: path.resolve(__dirname, 'src'),
        entry: ['./app.js', './main.scss'],
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'app.bundle.js',
            publicPath: '/dist/'
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: [/node_modules/],
                    use: [{
                        loader: 'babel-loader',
                        query: {presets: ['env']},
                    }],
                },
                // {
                //     test: /\.scss$/,
                //     use: ExtractTextPlugin.extract([
                //         'css-loader', 'sass-loader'
                //     ]),
                // }
            ],
        },
        devServer: {
            compress: true,
            inline: true,
            port: '4800',
        },
        // plugins: [
        //     new ExtractTextPlugin({
        //         filename: 'main.bundle.css',
        //         allChunks: true,
        //     }),
        //     new CopyWebpackPlugin([
        //         {
        //             from: paths.data,
        //             to: paths.dist + '/data'
        //         }
        //     ])
        // ],
    }
};

module.exports = config;
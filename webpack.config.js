const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    mode: "none",
    entry: path.resolve(__dirname, "./src/index.ts"),
    module: {
    　　　　rules: [{
    　　　　　　    test: /\.tsx?$/, 
    　　　　　　    use: 'ts-loader',
                    exclude: [/node_modules/, /lib/, /client/]
    　　　　}]
    　　},
　　output: {
　　　　 library: "PictureDimensions",
        path: path.resolve(__dirname, "./lib"),
        filename: "index.umd.js",
        libraryTarget: "umd",
        libraryExport: "default",
　　},
    resolve: {
        extensions: ['.ts', '.js'],
    },
    plugins: [
        new webpack.SourceMapDevToolPlugin({
            filename: '[file].map',
        }),
        new webpack.DefinePlugin({
            global: "window"
        }),
        new CleanWebpackPlugin()
    ],
}
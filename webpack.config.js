const path = require('path');
const pkg = require('./package.json');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin'); // This fixes some missing import issues with WebPack 5
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const buildPath = './build/';

module.exports = {
  entry: ['./src/main.js'],
  output: {
    path: path.join(__dirname, buildPath),
    filename: '[name].[hash].js'
  },
  mode: 'development',
  target: 'web',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: path.resolve(__dirname, './node_modules/')
      },{
        test: /\.(jpe?g|png|gif|svg|tga|glb|babylon|mtl|pcb|pcd|prwm|obj|mat|mp3|ogg)$/i,
        use: 'file-loader',
        exclude: path.resolve(__dirname, './node_modules/')
      },{
        test: /\.(glsl|frag|vert)$/,
        use: 'raw-loader',
      },
      {
        test: /\.html$/i,
        loader: "html-loader",
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ]
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src/'),
      '#': path.resolve(__dirname, 'data/')
    },
  },
  plugins: [
    new HtmlWebpackPlugin({'title': 'volviz project'}),
    new NodePolyfillPlugin(),
    new MiniCssExtractPlugin()
  ]
}

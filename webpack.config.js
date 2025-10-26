const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: "./src/main.js", // punto di ingresso principale
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // pulisce la cartella dist a ogni build
  },
  mode: 'development', // cambia in 'production' per il deploy
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader', // facoltativo se usi ES6+
      },
    ],
  },
  plugins: [
    // Copia l'index.html nella dist
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html',
    }),

    // Copia le altre pagine HTML e le risorse
    new CopyWebpackPlugin({
      patterns: [
        { from: 'pages', to: 'pages' },
        { from: 'CSS', to: 'CSS' },
        { from: 'images', to: 'images' },
      ],
    }),
  ],
  devServer: {
    static: './dist',
    open: true,
  },
};

var projectPath = __dirname;
var buildPath = projectPath + '/dist';

var Webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var OptimizeCssAssetsPlugin = require('../index.js');

var globalVarPlugin = new Webpack.DefinePlugin({
  'process.env': {
    'NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
});

var entry = {
  app: './app.js',
};

var plugins = [
  globalVarPlugin,
  new Webpack.optimize.CommonsChunkPlugin('library', 'library.js'),
  new Webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: false
    }
  }),
  new ExtractTextPlugin('[name].css', { allChunks: true }),
  new OptimizeCssAssetsPlugin({
    cssProcessorOptions: { discardComments: {removeAll: true }, zindex: false},
  })
];

module.exports = {
  context: projectPath + '/',
  entry: entry,
  output: {
    filename: 'app.js',
    path: buildPath,
  },
  module: {
    loaders: [{
      test: /\.css$/,
      loader: ExtractTextPlugin.extract('css-loader?&discardDuplicates&discardComments'),
    },{
      test: /\.png$/,
      loader: 'file-loader'
    }]
  },
  plugins: plugins,
};

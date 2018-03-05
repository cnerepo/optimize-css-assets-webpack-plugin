/* eslint-disable import/no-dynamic-require, global-require */
import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import OptimizeCssAssetsPlugin from '../';

const cases = process.env.CASES ? process.env.CASES.split(',') : fs.readdirSync(path.join(__dirname, 'cases'));

describe('Webpack Integration Tests', () => {
  cases.forEach((testCase) => {
    if (/_skip_/.test(testCase)) return;
    it(testCase, (done) => {
      const testDirectory = path.join(__dirname, 'cases', testCase);
      const outputDirectory = path.join(__dirname, 'js', testCase);
      const expectedDirectory = path.join(testDirectory, 'expected');

      const configFile = path.join(testDirectory, 'webpack.config.js');
      const config = Object.assign(
        fs.existsSync(configFile) ? require(configFile) : { entry: { test: './index.js' } },
        {
          context: testDirectory,
          output: {
            filename: '[name].js',
            path: outputDirectory
          }
        }
      );

      webpack(config, (err, stats) => {
        if (err) return done(err);
        if (stats.hasErrors()) return done(new Error(stats.toString()));
        fs.readdirSync(expectedDirectory).forEach((file) => {
          const expectedFile = readFileOrEmpty(path.join(expectedDirectory, file));
          const actualFile = readFileOrEmpty(path.join(outputDirectory, file));
          expect(actualFile).toEqual(expectedFile);
          expect(actualFile).toMatchSnapshot();
        });
        done();
      });
    });
  });

  it('calls cssProcessor with correct arguments', (done) => {
    fs.readFile(__dirname + '/default/default.css', (err, data) => {
      const expectedCss = data.toString();
      const destination = 'tmp.css';
      const cssProcessor = {
        process: (css, options) => {
          const assembledOptions = Object.assign({ from: destination, to: destination }, options);
          expect(options).toEqual(assembledOptions);
          expect(css).toEqual(expectedCss);
          return Promise.resolve({ css });
        }
      };
      const cssProcessorOptions = { discardComments: { removeAll: true } };
      const plugin = new OptimizeCssAssetsPlugin({
        cssProcessor,
        cssProcessorOptions
      });
      const config = Object.assign(defaultConfig, {plugins: [plugin, new ExtractTextPlugin(destination)]});
      webpack(config, (err, stats) => {
        if (err) return done(err);
        if (stats.hasErrors()) return done(new Error(stats.toString()));
        done();
      });
    });
  });

  it('writes processed css to destination', (done) => {
    fs.readFile(__dirname + '/default/default.css', (err, data) => {
      const destination = 'tmp.css';
      const expectedCss = '.inifinity-pool{overflow:hidden;}';
      const fakeProcessor = jest.fn();
      fakeProcessor.mockReturnValue(Promise.resolve({ css: expectedCss }));
      const cssProcessor = {
        process: fakeProcessor
      };
      const cssProcessorOptions = { discardComments: { removeAll: true } };
      const plugin = new OptimizeCssAssetsPlugin({
        cssProcessor,
        cssProcessorOptions
      });
      const config = Object.assign(defaultConfig, {plugins: [plugin, new ExtractTextPlugin(destination)]});
      webpack(config, (err, stats) => {
        if (err) return done(err);
        if (stats.hasErrors()) return done(new Error(stats.toString()));
        fs.readFile(__dirname + '/default/exports/tmp.css', (err, data)  => {
          expect(cssProcessor.process).toHaveBeenCalled();
          expect(data.toString()).toEqual(expectedCss);
          done();
        });
      });
    });
  });
});

function readFileOrEmpty(path) {
  try {
    return fs.readFileSync(path, 'utf-8');
  } catch (e) {
    return '';
  }
}

const defaultConfig = {
  entry: './default/index',
  module: {
    loaders: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: { loader: 'style-loader' },
          use: {
            loader: 'css-loader',
            options: { minimize: true }
          }
        })
      },
    ],
  },
  plugins: [],
  context: __dirname,
  output: {
    filename: 'tmp.js',
    path: path.join(__dirname, 'default', 'exports')
  }
}

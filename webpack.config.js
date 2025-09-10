import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './src/client/app.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  mode: 'production',
  target: 'web',
  resolve: {
    fallback: {
      // Core Node.js modules
      "assert": require.resolve("assert/"),
      "buffer": require.resolve("buffer/"),
      "child_process": false, // Cannot be polyfilled
      "crypto": require.resolve("crypto-browserify"),
      "dns": false, // Cannot be polyfilled
      "events": require.resolve("events/"),
      "fs": false, // Cannot be polyfilled
      "fs/promises": false, // Cannot be polyfilled
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "module": false, // Cannot be polyfilled
      "net": false, // Cannot be polyfilled
      "os": require.resolve("os-browserify/browser"),
      "path": require.resolve("path-browserify"),
      "process": require.resolve("process/browser.js"),
      "querystring": require.resolve("querystring-es3"),
      "readline": false, // Cannot be polyfilled
      "stream": require.resolve("stream-browserify"),
      "tls": false, // Cannot be polyfilled
      "url": require.resolve("url/"),
      "util": require.resolve("util/"),
      "zlib": require.resolve("browserify-zlib"),
      
      // Additional fallbacks that might be needed
      "async_hooks": false,
      "constants": require.resolve("constants-browserify"),
      "domain": require.resolve("domain-browser"),
      "punycode": require.resolve("punycode/"),
      "string_decoder": require.resolve("string_decoder/"),
      "sys": require.resolve("util/"),
      "timers": require.resolve("timers-browserify"),
      "tty": require.resolve("tty-browserify"),
      "vm": require.resolve("vm-browserify"),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'public/index.html',
      filename: 'index.html',
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  externals: {
    // Mark all server-specific modules as external (don't bundle them)
    'puppeteer': 'commonjs puppeteer',
    'nodemailer': 'commonjs nodemailer',
    'bcryptjs': 'commonjs bcryptjs',
    'jsonwebtoken': 'commonjs jsonwebtoken',
    'joi': 'commonjs joi',
    'handlebars': 'commonjs handlebars',
    'express': 'commonjs express',
    'cors': 'commonjs cors',
    'helmet': 'commonjs helmet',
    'dotenv': 'commonjs dotenv',
  },
  stats: {
    errorDetails: true,
    warnings: true,
  },
};

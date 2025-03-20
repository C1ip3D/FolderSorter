import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPageNames = ['organize'];
const multipleHtmlPlugins = htmlPageNames.map((name) => {
  return new HtmlWebpackPlugin({
    template: `./pages/${name}.html`,
    filename: `${name}.html`,
    chunks: [`${name}`],
  });
});

export default {
  entry: {
    index: ['./src/js/index.js', './src/css/index.scss'],
    organize: ['./src/js/organize.js', './src/css/organize.scss'],
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
              sassOptions: {
                includePaths: [path.resolve(__dirname, 'src/css')],
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'styles/[name].css',
    }),
    new HtmlWebpackPlugin({
      template: './pages/index.html',
      chunks: ['index'],
    }),
  ].concat(multipleHtmlPlugins),
  mode: 'development',
  resolve: {
    extensions: ['.js', '.sass', '.scss', '.css'],
  },
  watch: true,
  watchOptions: {
    ignored: /node_modules/,
  },
};

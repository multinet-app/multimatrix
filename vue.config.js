// eslint-disable-next-line @typescript-eslint/no-var-requires
const process = require('process');

const publicPath = process.env.PUBLIC_PATH || '/';

module.exports = {
  transpileDependencies: ['vuetify'],
  publicPath: process.env.NODE_ENV === 'production' ? publicPath : '/',
};

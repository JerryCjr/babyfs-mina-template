const fs = require('fs');
const qn = require('qn');
const md5 = require('md5');
const through = require('through2');
const colors = require('colors');
const utils = require('./utils');
const { text2json } = require('./utils');
const tinypng = require('./tinypng');

global.qnOptions = {
  accessKey: 'L7lsxYm1ro5oTg4ZZOaQhlE_RERKBLxQR5TE-ObZ',
  secretKey: 'pKN21B4ZfPJ8M6hSN4K42Ulg_suP44-6o-jb11nw',
  bucket: 'static',
  origin: 'https://s0.babyfs.cn',
  uploadURL: 'http://up.qiniu.com/',
  prefix: 'wxapp/sagittarius/'
};
global.imageManifestSrc = './src/images/manifest';
global.imageManifest = text2json(fs.readFileSync(global.imageManifestSrc)) || {};

module.exports = function () {
  return through.obj(function (file, encoding, callback) {
    let that = this;
    if (file.isNull()) {
      this.push(file);
      return callback();
    }
    if (file.isStream()) {
      console.error('Streams are not supported!');
      return callback();
    }
    let imageSrc = file.history[0].replace(file.cwd, '');
    let key = md5(imageSrc);
    let fileContentMd5 = md5(file.contents);
    let { imageManifest, qnOptions } = global;
    if (!imageManifest[key] || (imageManifest[key] && !imageManifest[key].cdnName) || (imageManifest[key].imgMd5 && fileContentMd5 !== imageManifest[key].imgMd5)) {
      console.log(`[${colors.gray(utils.formatDate(new Date(), 'hh:mm:ss'))}] QiniuCDN '${colors.cyan(imageSrc)}'`);
      qn.create(qnOptions).upload(file.contents, {
        key: `${qnOptions.prefix}${fileContentMd5}${file.extname}`
      }, function (err, result) {
        if (err) {
          console.error(err);
        }
        if (!imageManifest[key]) imageManifest[key] = {};
        imageManifest[key]['cdnName'] = result.key;
        imageManifest[key]['cdnUrl'] = result.url;
        imageManifest[key]['cdnHash'] = result.hash;
        imageManifest[key]['imageSrc'] = file.history[0].replace(file.cwd, '');
        tinypng(key);
        that.push(file);
        callback();
      });
    } else {
      that.push(file);
      callback();
    }
  });
};

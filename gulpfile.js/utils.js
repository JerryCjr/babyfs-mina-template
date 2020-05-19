const path = require('path');
const nn = require('node-notifier');
const { name } = require('../package.json');
function formatDate(ms, fmt) {
  let date = new Date(ms);
  var o = {
    'M+': date.getMonth() + 1, // 月份
    'd+': date.getDate(), // 日
    'h+': date.getHours(), // 小时
    'm+': date.getMinutes(), // 分
    's+': date.getSeconds(), // 秒
    'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
    'S': date.getMilliseconds() // 毫秒
  };
  if (/(y+)/.test(fmt)) { fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length)); }
  for (var k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) { fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length))); }
  }
  return fmt;
}

function notifier(message = '') {
  nn.notify({
    title: `${name}小程序`,
    message,
    contentImage: path.join(__dirname, 'assets/logo.png'),
    wait: true,
    timeout: 3
  });
}

/**
 * 文本转json
 * @param {String} content 
 */
function text2json(content) {
  let data = {}
  content.toString().split(/\n/g).map((value) => {
    try {
      let [key, imageSrc, imgMd5, cdnName, cdnUrl, cdnHash] = decodeURIComponent(value).split(/\:\:\:/g);
      if (key) {
        data[key] = {
          imageSrc, imgMd5, cdnName, cdnUrl, cdnHash
        }
      }
    } catch (err) {
      console.log(err);
    }
  })
  return data;
}

/**
 * 对象转文本
 * @param {Object} data 
 */
function json2text(data) {
  let content = '';
  for (let key in data) {
    let { imageSrc, imgMd5, cdnName, cdnUrl, cdnHash } = data[key];
    content += encodeURIComponent(`${key}:::${imageSrc}:::${imgMd5}:::${cdnName}:::${cdnUrl}:::${cdnHash}`) + '\n'
  }
  return content;
}

module.exports = {
  text2json,
  json2text,
  formatDate,
  notifier
};

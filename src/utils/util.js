// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from '../miniprogram_npm/babyfs-wxapp-runningtime/index.js';
import ajax from '../miniprogram_npm/babyfs-wxapp-request/index.js';
import storage from '../miniprogram_npm/babyfs-wxapp-storage/index.js';

const formatTime = date => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':');
};

const formatNumber = n => {
  n = n.toString();
  return n[1] ? n : '0' + n;
};

const transfromNumber = n => {
  const cnum = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  return cnum[n];
};

const collectFormId = async e => {
  try {
    if (storage.getData('token')) {
      await ajax.POST({
        url: '/api/m/wx/form_id/add',
        data: {
          wx_form_id: e.detail.formId,
          type: 5
        }
      });
    }
  } catch (err) {}
};

const isObject = function (obj) {
  return obj !== null && typeof obj === 'object';
};

const replaceHttps = function (url) {
  if (url.indexOf('https://') > -1) {
    return url;
  } else {
    return url.replace('http://', 'https://');
  }
};

module.exports = {
  formatTime,
  transfromNumber,
  collectFormId,
  isObject,
  replaceHttps
};

const request = require('request');
const path = require('path');
const md5 = require('md5');
const fs = require('fs')
const utils = require('./utils');
const qn = require('qn');

function downloadImage(imgSrc) {
  return new Promise((resolve, reject) => {
    request.get({ url: imgSrc, encoding: null }, function (err, res, body) {
      if (err) {
        reject(err)
      } else {
        resolve(body)
      }
    });
  });
}

function compressRequest(key) {
  let imageManifest = global.imageManifest;
  let { imageSrc } = imageManifest[key];
  let newImageSrc = path.join(__dirname, '..', imageSrc);
  let contents = fs.readFileSync(newImageSrc);
  // 校验图片格式
  let extname = path.extname(newImageSrc)
  if (/\.gif/.test(extname)) return true;
  return new Promise((resolve, reject) => {
    request({
      url: 'https://tinypng.com/web/shrink',
      method: "post",
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "zh-cn,zh;q=0.8,en-us;q=0.5,en;q=0.3",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Connection": "keep-alive",
        "Host": "tinypng.com",
        "DNT": 1,
        "Referer": "https://tinypng.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:42.0) Gecko/20100101 Firefox/42.0"
      },
      body: contents
    }, async function (error, response, body) {
      try {
        if (error) {
          throw error;
        } else {
          let data = JSON.parse(body);
          if (data.output && data.output.url) {
            let result = await downloadImage(data.output.url);
            // 再次上传到cdn
            let r = await uploadImage(`${global.qnOptions.prefix}${md5(result)}${extname}`, result)
            global.imageManifest[key]['cdnName'] = r.key;
            global.imageManifest[key]['cdnUrl'] = r.url;
            global.imageManifest[key]['cdnHash'] = r.hash;
            global.imageManifest[key].imgMd5 = md5(result);
            fs.writeFileSync(newImageSrc, result)
            fs.writeFileSync(global.imageManifestSrc, utils.json2text(global.imageManifest));
            resolve()
          } else {
            throw new Error('未获取到图片url');
          }
        }
      } catch (err) {
        reject(err);
      }
    });
  })
}

function uploadImage(key, contents) {
  return new Promise((resolve, reject) => {
    qn.create(global.qnOptions).upload(contents, {
      key
    }, function (err, result) {
      if (err) {
        reject(err)
      } else {
        resolve(result);
      }
    });
  })
}

let taskList = [];
async function compressHandle() {
  if (taskList && taskList.length) {
    let key = taskList.pop();
    try {
      await compressRequest(key)
    } catch (err) {
      console.log(err);
    }
  }
  setTimeout(async () => {
    await compressHandle();
  }, 1000);
}

if (process.argv.includes('--development')) {
  compressHandle();
}

module.exports = (key) => {
  taskList.push(key);
};
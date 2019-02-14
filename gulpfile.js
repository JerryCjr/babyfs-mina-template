const fs = require('fs');
const gulp = require('gulp');
const path = require('path');
const less = require('gulp-less');
const rename = require('gulp-rename');
const del = require('del');
const eslint = require('gulp-eslint');
const px2rpx = require('gulp-px2rpx');
const replace = require('gulp-replace');
const through = require('through2');
const tinify = require('tinify');
const md5 = require('md5');
const qn = require('qn');
const filter = require('gulp-filter');
const _ = require('./tools/utils.js');

// path
const srcPath = './src/**';
const distPath = './dist/';

// files
const wxmlFiles = [`${srcPath}/*.wxml`, `!${srcPath}/_template/*.wxml`];
const lessFiles = [`${srcPath}/*.less`, `!${srcPath}/_template/*.less`];
const imgFiles = [`${srcPath}/images/*.{png,jpg,gif,ico}`, `${srcPath}/images/**/*.{png,jpg,gif,ico}`];
const jsonFiles = [`${srcPath}/*.json`, `!${srcPath}/_template/*.json`, `!${srcPath}/images/*.json`];
const jsFiles = [`${srcPath}/*.js`, `!${srcPath}/_template/*.js`, `!${srcPath}/wxnpm/*.js`];
const audioFiles = [`${srcPath}/audio/*.*`];

// config
const manifestSrc = './src/images/manifest.json';
let imageMap = JSON.parse(fs.readFileSync(manifestSrc).toString().trim()) || {};
const qnOptions = {
  accessKey: 'L7lsxYm1ro5oTg4ZZOaQhlE_RERKBLxQR5TE-ObZ',
  secretKey: 'pKN21B4ZfPJ8M6hSN4K42Ulg_suP44-6o-jb11nw',
  bucket: 'static',
  origin: 'https://s0.babyfs.cn',
  uploadURL: 'http://up.qiniu.com/',
  prefix: 'wxapp/sagittarius/'
};
let qnConfig = qn.create(qnOptions);

// 命令行快速创建
const auto = require('./conf/auto.js');

// clean
gulp.task('clean', done => {
  del.sync(['dist/**/*']);
  done();
});

// miniprogram_npm依赖导入
gulp.task('install', async done => {
  const cwd = path.join(__dirname, 'node_modules');
  const dirPath = path.join(__dirname, 'dist', 'miniprogram_npm');
  const OFFICIAL_COMPONENT = 'miniprogram-'; // 官方自定义组件
  const BABYFS_COMPONENT = 'babyfs-wxapp-component-'; // 宝玩自定义组件
  const BABYFS_PUREJS = 'babyfs-wxapp-'; // 宝玩js模块
  const globOptions = {
    cwd,
    nodir: false
  };
  const comDirNames = await _.globSync(`+(${OFFICIAL_COMPONENT}*|${BABYFS_COMPONENT}*|${BABYFS_PUREJS}*)/`, globOptions);
  await _.removeDir(`${dirPath}`);
  for (let i = 0, len = comDirNames.length; i < len; i++) {
    const filePath = comDirNames[i].slice(0, -1);
    gulp.src(path.join(cwd, filePath, 'miniprogram_dist/**'))
      .pipe(gulp.dest(path.join(dirPath, filePath)));
  }
  done();
});

// replaceImgSrc
let replaceImgSrc = function () {
  // eslint-disable-next-line no-useless-escape
  return replace(/[\w\d-\/\.]+\.(png|gif|jpg|ico)/ig, function (value) {
    let newValue = value;
    if (value.indexOf('/images/') > -1 && value.indexOf('/local/') === -1) {
      let absSrc = `/src${value.substr(value.indexOf('/images/'), value.length)}`;
      let absSrcMd5 = md5(absSrc);
      if (imageMap[absSrcMd5]) {
        newValue = imageMap[absSrcMd5].cdnUrl;
      }
    }
    return newValue;
  });
};

// qnniuCDN
let qnniuCDN = function () {
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
    if (!imageMap[key] || (imageMap[key] && !imageMap[key].cdnName)) {
      console.log(`qnniuCDN-ADD:${imageSrc}`);
      qnConfig.upload(file.contents, {
        key: `${qnOptions.prefix}${fileContentMd5}${file.extname}`
      }, function (err, result) {
        if (err) {
          console.error(err);
        }
        imageMap[key]['cdnName'] = result.key;
        imageMap[key]['cdnUrl'] = result.url;
        imageMap[key]['cdnHash'] = result.hash;
        fs.writeFileSync(manifestSrc, JSON.stringify(imageMap));
        that.push(file);
        callback();
      });
    } else {
      that.push(file);
      callback();
    }
  });
};

// tinify
let tinifyImg = function () {
  let keyArr = ['4QqiHTeLmqFBg2JLDJDmXMRCrFO4h4fC', 'WvNbLvu5P9PvcwOtzt5C6MW94eOfncBc', 'SWmjBgHX2ywDDP8qfgVPD8v1p6km5wp1'];
  tinify.key = keyArr[0];
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
    if (!imageMap[key] || (imageMap[key] && !imageMap[key].imgMd5) || (imageMap[key].imgMd5 && imageMap[key].imgMd5 !== md5(file.contents))) {
      imageMap[key] = {
        imageSrc
      };
      if (file.extname !== '.gif') {
        console.log(`tinifyImg-ADD:${imageSrc}`);
        tinify.fromBuffer(file.contents).toBuffer(function (err, resultData) {
          if (err) {
            console.error(err);
          }
          try {
            file.contents = resultData;
            imageMap[key].imgMd5 = md5(resultData);
            fs.writeFileSync(manifestSrc, JSON.stringify(imageMap));
          } catch (err) {
            console.error(err);
          }
          that.push(file);
          callback();
        });
      } else {
        imageMap[key].imgMd5 = md5(file.contents);
        fs.writeFileSync(manifestSrc, JSON.stringify(imageMap));
        that.push(file);
        callback();
      }
    } else {
      that.push(file);
      callback();
    }
  });
};

// wxml
const wxml = () => {
  return gulp
    .src(wxmlFiles, {
      since: gulp.lastRun(wxml)
    })
    .pipe(replaceImgSrc())
    .pipe(gulp.dest(distPath));
};
gulp.task(wxml);

// js
const js = async () => {
  return gulp
    .src(jsFiles, {
      since: gulp.lastRun(js)
    })
    .pipe(replace(/@\/.*/ig, value => {
      return value.replace(/@/, '/miniprogram_npm');
    }))
    .pipe(replaceImgSrc())
    .pipe(eslint({
      fix: true
    }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(gulp.dest(distPath));
};
gulp.task(js);

// audio
const audio = () => {
  return gulp
    .src(audioFiles, {
      since: gulp.lastRun(audio)
    })
    .pipe(gulp.dest(distPath));
};
gulp.task(audio);

// json
const json = () => {
  return gulp
    .src(jsonFiles, {
      since: gulp.lastRun(json)
    })
    .pipe(replace(/@\//ig, value => {
      return value.replace('@', '/miniprogram_npm');
    }))
    .pipe(gulp.dest(distPath));
};
gulp.task(json);

// less => wxss
const wxss = () => {
  return gulp
    .src(lessFiles)
    .pipe(replaceImgSrc())
    .pipe(less())
    .pipe(px2rpx({
      screenWidth: 375,
      wxappScreenWidth: 750,
      remPrecision: 6
    }))
    .pipe(rename({
      extname: '.wxss'
    }))
    .pipe(gulp.dest(distPath));
};
gulp.task(wxss);

// image
const img = () => {
  return gulp
    .src(imgFiles, {
      since: gulp.lastRun(img)
    })
    .pipe(tinifyImg())
    .pipe(qnniuCDN())
    .pipe(gulp.dest('./src'))
    .pipe(filter(['src/images/tab_bar/*.*', 'src/images/local/*.*']))
    .pipe(gulp.dest(distPath));
};
gulp.task(img);

// build
gulp.task('build', gulp.series('clean', gulp.parallel('install', 'wxml', 'js', 'json', 'wxss', 'img', 'audio')));

// watch
gulp.task('watch', () => {
  let watchLessFiles = [...lessFiles];
  watchLessFiles.pop();
  gulp.watch(watchLessFiles, wxss);
  gulp.watch(jsFiles, js);
  gulp.watch(imgFiles, img);
  gulp.watch(jsonFiles, json);
  gulp.watch(wxmlFiles, wxml);
  gulp.watch(audioFiles, audio);
});

// dev
gulp.task('dev', gulp.series('build', 'watch'));

// auto 命令行快速创建
gulp.task(auto);

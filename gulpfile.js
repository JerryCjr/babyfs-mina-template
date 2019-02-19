const fs = require('fs');
const del = require('del');
const path = require('path');

// gulp
const gulp = require('gulp');
const less = require('gulp-less');
const rename = require('gulp-rename');
const eslint = require('gulp-eslint');
const px2rpx = require('gulp-px2rpx');
const filter = require('gulp-filter');

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

// utils
const _ = require('./tools/utils.js');
// 命令行快速创建
const auto = require('./conf/auto.js');
// 图片路径替换
const replaceImgSrc = require('./conf/replace.js').replaceImgSrc;
// 模块路径替换
const replaceModulePath = require('./conf/replace.js').replaceModulePath;
// qiniu
const qiniuCdn = require('./conf/qiniu.js');
// tinifyImg
const tinifyImg = require('./conf/tinify.js');

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

// wxml
const wxml = () => {
  return gulp
    .src(wxmlFiles, {
      since: gulp.lastRun(wxml)
    })
    .pipe(replaceImgSrc(imageMap))
    .pipe(gulp.dest(distPath));
};
gulp.task(wxml);

// js
const js = async () => {
  return gulp
    .src(jsFiles, {
      since: gulp.lastRun(js)
    })
    .pipe(replaceModulePath())
    .pipe(replaceImgSrc(imageMap))
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
    .pipe(replaceModulePath())
    .pipe(gulp.dest(distPath));
};
gulp.task(json);

// less => wxss
const wxss = () => {
  return gulp
    .src(lessFiles)
    .pipe(replaceImgSrc(imageMap))
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
    .pipe(tinifyImg(imageMap, manifestSrc))
    .pipe(qiniuCdn(imageMap, manifestSrc))
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

const fs = require('fs');
const del = require('del');
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
const jsFiles = [`${srcPath}/*.js`, `!${srcPath}/_template/*.js`];
const audioFiles = [`${srcPath}/audio/*.*`];

// config
const manifestSrc = './src/images/manifest.json';
let imageMap = JSON.parse(fs.readFileSync(manifestSrc).toString().trim()) || {};

// 命令行快速创建
const auto = require('./auto.js');
// 图片路径替换
const replaceImgSrc = require('./replace.js').replaceImgSrc;
// 模块路径替换
const replaceModulePath = require('./replace.js').replaceModulePath;
// qiniu
const qiniuCdn = require('./qiniu.js');
// tinifyImg
const tinifyImg = require('./tinify.js');
// codemod
const codemod = require('./codemod.js');
// install
const install = require('./install.js');
// clean
async function clean() {
  await del.sync(`${distPath}/**/*`);
}
gulp.task(clean);

function wxml() {
  return gulp
    .src(wxmlFiles, {
      since: gulp.lastRun(wxml)
    })
    .pipe(replaceImgSrc(imageMap))
    .pipe(gulp.dest(distPath));
}
gulp.task(wxml);

// js
const js = async () => {
  return gulp
    .src(jsFiles, {
      since: gulp.lastRun(js)
    })
    .pipe(codemod('src'))
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
gulp.task('build', gulp.series(clean, gulp.parallel(install, wxml, js, json, wxss, img, audio)));

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

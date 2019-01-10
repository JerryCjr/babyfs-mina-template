const fs = require('fs');
const gulp = require('gulp');
const webpack = require('webpack-stream');
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

// path
const srcPath = './src/**';
const distPath = './dist/';
const wxnpmPath = './dist/wxnpm';
// files
const wxmlFiles = [`${srcPath}/*.wxml`, `!${srcPath}/_template/*.wxml`];
const lessFiles = [`${srcPath}/*.less`, `!${srcPath}/_template/*.less`];
const imgFiles = [`${srcPath}/images/*.{png,jpg,gif,ico}`, `${srcPath}/images/**/*.{png,jpg,gif,ico}`];
const jsonFiles = [`${srcPath}/*.json`, `!${srcPath}/_template/*.json`, `!${srcPath}/images/*.json`];
const jsFiles = [`${srcPath}/*.js`, `!${srcPath}/_template/*.js`, `!${srcPath}/wxnpm/*.js`];
const wxnpmFiles = [`${srcPath}/wxnpm/*.js`];
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

/* 清除dist目录 */
gulp.task('clean', done => {
  del.sync(['dist/**/*']);
  done();
});

/* 替换本都路径为cdn */
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

/* 上传图片到cdn */
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

/* tinify远程压缩图片 */
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

/* 编译wxml文件 */
const wxml = () => {
  return gulp
    .src(wxmlFiles, {
      since: gulp.lastRun(wxml)
    })
    .pipe(replaceImgSrc())
    .pipe(gulp.dest(distPath));
};
gulp.task(wxml);

/* npm处理 */
const wxnpm = () => {
  return gulp
    .src(wxnpmFiles)
    .pipe(webpack({
      mode: 'development',
      devtool: 'source-map',
      output: {
        filename: 'bundle.js',
        libraryTarget: 'commonjs2'
      }
    }))
    .pipe(gulp.dest(wxnpmPath));
};
gulp.task(wxnpm);

/* 编译JS文件 */
const js = () => {
  return gulp
    .src(jsFiles, {
      since: gulp.lastRun(js)
    })
    .pipe(replaceImgSrc())
    .pipe(eslint({
      fix: true
    }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .pipe(gulp.dest(distPath));
};
gulp.task(js);

/* 编译JS文件 */
const audio = () => {
  return gulp
    .src(audioFiles, {
      since: gulp.lastRun(audio)
    })
    .pipe(gulp.dest(distPath));
};
gulp.task(audio);

/* 编译json文件 */
const json = () => {
  return gulp
    .src(jsonFiles, {
      since: gulp.lastRun(json)
    })
    .pipe(gulp.dest(distPath));
};
gulp.task(json);

/* 编译less文件 */
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

/* rpx2px */
const rpx2px = () => {
  return gulp.src('./src/**/*.less')
    .pipe(replace(/\d*(\.\d+)?rpx/g, value => {
      return `${value.match(/\d*(\.\d+)?/)[0] / 2}px`;
    }))
    .pipe(gulp.dest('./src'));
};
gulp.task(rpx2px);

/* 编译压缩图片 */
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

/* build */
gulp.task('build', gulp.series('clean', gulp.parallel('wxml', 'wxnpm', 'js', 'json', 'wxss', 'img', 'audio')));

/* watch */
gulp.task('watch', () => {
  let watchLessFiles = [...lessFiles];
  watchLessFiles.pop();
  gulp.watch(watchLessFiles, wxss);
  gulp.watch(jsFiles, js);
  gulp.watch(imgFiles, img);
  gulp.watch(jsonFiles, json);
  gulp.watch(wxmlFiles, wxml);
  gulp.watch(wxnpmFiles, wxnpm);
  gulp.watch(audioFiles, audio);
});

/* dev */
gulp.task('dev', gulp.series('build', 'watch'));

/**
 * auto 自动创建page or template or component
 *  -s 源目录（默认为_template)
 * @example
 *   gulp auto -p mypage           创建名称为mypage的page文件
 *   gulp auto -t mytpl            创建名称为mytpl的template文件
 *   gulp auto -c mycomponent      创建名称为mycomponent的component文件
 *   gulp auto -s index -p mypage  创建名称为mypage的page文件
 */
const auto = done => {
  const yargs = require('yargs')
    .example('gulp auto -p mypage', '创建名为mypage的page文件')
    .example('gulp auto -t mytpl', '创建名为mytpl的template文件')
    .example('gulp auto -c mycomponent', '创建名为mycomponent的component文件')
    .example('gulp auto -s index -p mypage', '复制pages/index中的文件创建名称为mypage的页面')
    .option({
      s: {
        alias: 'src',
        default: '_template',
        describe: 'copy的模板',
        type: 'string'
      },
      p: {
        alias: 'page',
        describe: '生成的page名称',
        conflicts: ['t', 'c'],
        type: 'string'
      },
      t: {
        alias: 'template',
        describe: '生成的template名称',
        type: 'string',
        conflicts: ['c']
      },
      c: {
        alias: 'component',
        describe: '生成的component名称',
        type: 'string'
      },
      version: {
        hidden: true
      },
      help: {
        hidden: true
      }
    })
    .fail(msg => {
      done();
      console.error('创建失败!!!');
      console.error(msg);
      console.error('请按照如下命令执行...');
      yargs.parse(['--msg']);
      return false;
    })
    .help('msg');

  const argv = yargs.argv;
  const source = argv.s;
  const typeEnum = {
    p: 'pages',
    t: 'templates',
    c: 'components'
  };
  let hasParams = false;
  let name, type;
  for (let key in typeEnum) {
    hasParams = hasParams || !!argv[key];
    if (argv[key]) {
      name = argv[key];
      type = typeEnum[key];
    }
  }
  if (!hasParams) {
    done();
    yargs.parse(['--msg']);
  }

  const root = path.join(__dirname, 'src', type);
  return gulp
    .src(path.join(root, source, '*.*'))
    .pipe(
      rename({
        dirname: name,
        basename: name
      })
    )
    .pipe(gulp.dest(path.join(root)));
};
gulp.task(auto);

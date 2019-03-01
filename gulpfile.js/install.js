const {
  src,
  dest
} = require('gulp');
const path = require('path');
const codemod = require('./codemod.js');
const _ = require('../tools/utils.js');

// miniprogram_npm依赖导入
module.exports = async function (cb) {
  const cwd = path.resolve('node_modules');
  const dirPath = path.resolve('dist/miniprogram_npm');
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
    src(path.join(cwd, filePath, 'miniprogram_dist/**'))
      .pipe(codemod('install'))
      .pipe(dest(path.join(dirPath, filePath)));
  }

  cb();
};

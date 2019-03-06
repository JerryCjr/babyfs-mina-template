const {
  src,
  dest
} = require('gulp');
const path = require('path');
const codemod = require('./codemod.js');
const _ = require('../tools/utils.js');

// miniprogram_npm依赖导入
module.exports = async function install(cb) {
  const cwd = path.resolve('node_modules');
  const dirPath = path.resolve('dist/miniprogram_npm');
  const MODULE = '@chengjinrui/*';
  const OFFICIAL_COMPONENT = 'miniprogram-'; // 官方自定义组件
  const BABYFS_COMPONENT = 'babyfs-wxapp-component-'; // 宝玩自定义组件
  const BABYFS_PUREJS = 'babyfs-wxapp-'; // 宝玩js模块
  const globOptions = {
    cwd,
    nodir: false
  };
  const comDirNames = await _.globSync(`+(${OFFICIAL_COMPONENT}*|${BABYFS_COMPONENT}*|${BABYFS_PUREJS}*|)/`, globOptions);
  const modules = await _.globSync(`${MODULE}`, globOptions);

  /**
   *
   * @param {*} arr 匹配到的文件数组
   * @param {*} pathPrefix pipe导出文件的路径前缀 递归过程中应该是累加的
   * @param {*} parent 迭代层级的上一个
   */
  async function recursion(arr, pathPrefix) {
    console.log('迭代次数: ' + ++time + ', 迭代数组: ' + arr);

    for (let index = 0; index < arr.length; index++) {
      const element = arr[index];
      console.log('枚举: ' + element);

      const srcPath = path.join(pathPrefix, element, 'index.js');
      const distPath = path.join(dirPath, parent, element);

      src(srcPath).pipe(dest(distPath));
      console.log('source路径' + srcPath);
      console.log('dist路径' + distPath);

      const nextCwd = path.resolve(pathPrefix, element, 'node_modules');

      const globOptions = {
        cwd: nextCwd,
        nodir: false
      };
      const modules = await _.globSync(`${MODULE}`, globOptions);

      if (modules.length) {
        parent += element + '/';
        await recursion(modules, nextCwd);
      }
    }
  }

  let time = 0;
  let parent = '';
  await _.removeDir(`${dirPath}`);
  if (modules.length) await recursion(modules, cwd, '');
  for (let i = 0, len = comDirNames.length; i < len; i++) {
    const filePath = comDirNames[i].slice(0, -1);
    src(path.join(cwd, filePath, 'miniprogram_dist/**'))
      .pipe(codemod('install'))
      .pipe(dest(path.join(dirPath, filePath)));
  }

  cb();
};

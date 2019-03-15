const path = require('path');
const {
  src,
  series
} = require('gulp');
const gulpInstall = require('gulp-install');
const directoryHelper = require('../../tools/directoryHelper.js');
const fileHelper = require('../../tools/fileHelper.js');
const assert = require('../../tools/assert.js');
const _ = require('../../tools/utils.js');

const distPackageJsonPath = path.resolve('dist', 'package.json');
const miniprogramNpmPath = path.resolve('dist', 'miniprogram_npm');
const nodeModulesPath = path.resolve('dist', 'node_modules');
// const nodeModulesPath = path.resolve('dist', 'node_modules', '@chengjinrui');
const copyPackageJson = async () => {
  const packageJson = _.readJson(path.resolve('package.json'));
  const dependencies = packageJson.dependencies || {};
  await _.writeFile(distPackageJsonPath, JSON.stringify({
    dependencies
  }, null, '\t'));
};

const npmInstall = () => {
  return src(distPackageJsonPath)
    .pipe(gulpInstall({
      production: true
    }));
};

async function onHandleFile(sourceFileName) {
  const jsonSourcePath = path.resolve(nodeModulesPath, sourceFileName); // packageJson源地址
  const hackFilePath = sourceFileName.replace(/\/node_modules/, '');
  const jsonDestPath = path.resolve(miniprogramNpmPath, hackFilePath);
  await fileHelper.copy(jsonSourcePath, jsonDestPath);
  // assert.warn('hackFilePath', hackFilePath);
  // assert.warn('jsonSourcePath', jsonSourcePath);
  // assert.warn('jsonDestPath', jsonDestPath);
  // assert.info(`安装${jsonSourcePath}到了路径${jsonDestPath}`);

  const packageJson = require(jsonSourcePath);
  const dependencyDir = path.dirname(sourceFileName);
  const dependencySourcePath = path.resolve(nodeModulesPath, dependencyDir, packageJson.main); // 依赖源
  const hackDirPath = path.dirname(hackFilePath);
  const dependencyDestPath = path.resolve(miniprogramNpmPath, hackDirPath, packageJson.main);
  await fileHelper.copy(dependencySourcePath, dependencyDestPath);
  // assert.warn('hackDirPath', hackDirPath);
  // assert.warn('dependencySourcePath', dependencySourcePath);
  // assert.warn('dependencyDestPath', dependencyDestPath);
  // assert.info(`安装${dependencySourcePath}到了路径${dependencyDestPath}`);
}

const recursiveReadDir = async (relative, dir, onHandleFile) => {
  const dirents = await directoryHelper.read(dir, {
    withFileTypes: true
  });
  const promises = dirents.map(async dirent => {
    if (dirent.isDirectory()) {
      await recursiveReadDir(path.join(relative, dirent.name), path.resolve(dir, dirent.name), onHandleFile);
    } else if (dirent.isFile()) {
      const filename = dirent.name;
      if (filename === 'package.json') {
        await onHandleFile(path.join(relative, filename));
      }
    }
  });
  await promises;
};

const recombine = async () => {
  const relative = '';
  await recursiveReadDir(relative, nodeModulesPath, onHandleFile);
};

const install = series(copyPackageJson, npmInstall, recombine);
// const install = series(recombine);

module.exports = install;

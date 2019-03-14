const path = require('path');
const {
  src,
  series
} = require('gulp');
const gulpInstall = require('gulp-install');
const _ = require('../../tools/utils.js');

const distPath = path.resolve('dist');
const distPackageJsonPath = path.resolve(distPath, 'package.json');

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

const install = series(copyPackageJson, npmInstall);

module.exports = install;

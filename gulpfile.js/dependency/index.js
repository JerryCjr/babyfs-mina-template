const path = require('path');
const through = require('through2');
const j = require('jscodeshift');

const fileHelper = require('../../tools/fileHelper.js');
const directoryHelper = require('../../tools/directoryHelper.js');
const assert = require('../../tools/assert.js');

const targetDirectory = 'dist/miniprogram_npm';

/**
 * 查找external模块
 * @param {String} moduleName 模块名称
 * @param {String} baseDirectory 查找的起始路径
 */
function findInNodeModules(baseDirectory, moduleName) {
  const tryFindPath = path.resolve(baseDirectory, 'node_modules', moduleName);
  if (directoryHelper.existSync(tryFindPath)) {
    return tryFindPath;
  } else {
    if (baseDirectory === '/') {
      throw new Error(`can not find module ${moduleName}`);
    } else {
      return findInNodeModules(path.resolve(baseDirectory, '..'), moduleName);
    }
  }
}

/**
 * @description 比较相对路径的hack方法
 * @author Jerry Cheng
 * @date 2019-03-14
 * @param {*} path
 * @returns
 */
function assumedPathDev(path) {
  const reg = new RegExp(/\/dist\//);
  if (reg.test(path)) {
    let r = path.replace(reg, '/src/');
    return r;
  }
}

/**
 * @description 判断依赖类型 本地依赖/三方库依赖
 * @author Jerry Cheng
 * @date 2019-03-14
 */
function judgeModuleType(filePath, importPathBeforeResolved) {
  // assert.log(importPathBeforeResolved);
  let flag;
  let localPath;
  let externalPath;
  localPath = path.resolve(path.dirname(filePath), importPathBeforeResolved);
  flag = fileHelper.existSync(localPath);
  if (flag) {
    assert.info('依赖类型属于本地依赖');
  } else {
    assert.info('依赖类型属于三方库依赖');
    try {
      externalPath = findInNodeModules(path.dirname(filePath), importPathBeforeResolved);
    } catch (error) {
      assert.error(error);
    }
    assert.warn('externalPath', externalPath);
  }

  return {
    type: flag ? 'local' : 'external',
    path: flag ? localPath : externalPath
  };
}

/**
 * @description 解析依赖
 * @author Jerry Cheng
 * @date 2019-03-14
 * @param {*} filePath
 * @param {*} externalPath
 * @returns 源文件对于解析后的依赖文件的相对路径
 */
function resolving(filePath, externalPath) {
  const copySourcePackFile = path.resolve(externalPath, 'package.json');
  const packageJson = require(copySourcePackFile);
  // const installedDirectory = path.resolve(targetDirectory, `${packageJson.name}@${packageJson.version}`);
  const installedDirectory = path.resolve(targetDirectory, packageJson.name);
  const copyDestPackFile = path.resolve(installedDirectory, 'package.json');
  const copySourceImportFile = path.resolve(externalPath, `${packageJson.main}`);
  const copyDestImportFile = path.resolve(installedDirectory, `${packageJson.main}`);
  const externalRelativePath = path.relative(path.dirname(filePath), assumedPathDev(copyDestImportFile));
  assert.warn('源文件对于解析后的依赖文件的相对路径', externalRelativePath);

  // copy package.json copySourcePackFile copyDestPackFile
  // copy importfile copySourceImportFile copyDestImportFile
  // try {
  //   fileHelper.copy(copySourcePackFile, copyDestPackFile);
  //   fileHelper.copy(copySourceImportFile, copyDestImportFile);
  // } catch (error) {
  //   assert.error(error);
  // }

  // assert.info(packageJson); // import file's package.json content
  // assert.info(installedDirectory);
  // assert.info(copySourcePackFile);
  // assert.info(copyDestPackFile);
  // assert.info(copySourceImportFile);
  // assert.info(copyDestImportFile);
  return externalRelativePath;
}

/**
 * 解析依赖 resolveDependencies
 * jscodeshift 修正依赖路径
 */
function resolveDependencies(file) {
  const filePath = file.path;
  const fileContent = file.contents.toString('utf8');
  const source = j(fileContent);
  // assert.log(filePath);

  // 处理import依赖
  const importHandler = () => {
    const imports = source.find(j.ImportDeclaration);
    let importPathBeforeResolved;
    let importPathAfterResolved;
    // TODO: 异步等待依赖路径返回时有问题
    imports.map(paths => {
      importPathBeforeResolved = paths.value.source.value;
      const judgement = judgeModuleType(filePath, importPathBeforeResolved);
      // assert.info(judgement);
      if (judgement.type === 'external' && judgement.path) {
        importPathAfterResolved = resolving(filePath, judgement.path);
        assert.warn('importPathBeforeResolved', importPathBeforeResolved);
        assert.warn('importPathAfterResolved', importPathAfterResolved);
        paths.value.source = j.literal(importPathAfterResolved);
      }
    });
  };

  // 处理require依赖
  const requireHandler = function () {
    const requires = source
      .find(j.CallExpression, {
        callee: {
          name: 'require'
        }
      })
      .filter(requireStatement => requireStatement.value.arguments.length === 1 && requireStatement.value.arguments[0].type === 'Literal');
    let requirePathBeforeResolved;
    let requirePathAfterResolved;
    requires.map((paths) => {
      requirePathBeforeResolved = paths.value.arguments[0].value;
      const judgement = judgeModuleType(filePath, requirePathBeforeResolved);
      // assert.info(judgement);
      if (judgement.type === 'external' && judgement.path) {
        requirePathAfterResolved = resolving(filePath, judgement.path);
        assert.warn('requirePathBeforeResolved', requirePathBeforeResolved);
        assert.warn('requirePathAfterResolved', requirePathAfterResolved);
        paths.value.arguments = [j.literal(requirePathAfterResolved)];
      }
    });
  };

  importHandler();
  requireHandler();

  return source.toSource({
    quote: 'single'
  });
}

function dependency() {
  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      this.push(file);
      return cb();
    }

    if (file.isStream()) {
      assert.error('ERROR: Streaming not supported');
      return cb();
    }

    const content = resolveDependencies(file);
    file.contents = Buffer.from(content);
    this.push(file);
    cb();
  });
}

module.exports = dependency;

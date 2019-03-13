const path = require('path');
const j = require('jscodeshift');
const through = require('through2');
const conf = require('../package.json');
const { name, version } = { ...conf };

function transform(file, channel) {
  const filePath = file.path; // 文件路径
  const contents = file.contents.toString('utf8');
  const source = j(contents);
  const importDeclarations = source.find(j.ImportDefaultSpecifier);
  let runtimeDeclared = false; // 是否已经声明了runtime
  let relative; // 相对路径
  let r; // jscodeshift最终的返回结果
  let pathBeforePiped; // piped之前的文件路径 切割了路径只留下了依赖路径 eg: /src/index.js => index.js /src/util/index.js => /util/index.js
  let pathPiped; // piped之后的文件路径 eg: /src/index.js => /dist/miniprogram_dist/index.js
  const pos = filePath.search(/\/(demo|src|miniprogram_dist)/); // 正则匹配的位置
  const runtimePath = path.resolve('dist/miniprogram_npm/babyfs-wxapp-runningtime/index.js'); // babyfs-wxapp-runningtime的文件位置

  switch (channel) {
    case 'src':
      pathBeforePiped = filePath.slice(pos + 'src'.length + 1);
      pathPiped = path.join('dist', pathBeforePiped);
      break;
    case 'install':
      if (/babyfs-wxapp-runningtime/.test(file.path)) return source.toSource();
      const prefix = filePath.match(/node_modules\/.*\/miniprogram_dist/)[0].slice('node_modules'.length, 'miniprogram_dist'.length * -1 - 1);
      pathBeforePiped = prefix + filePath.slice(pos + 'miniprogram_dist'.length + 1);
      pathPiped = path.join('dist/miniprogram_npm', pathBeforePiped);
  }
  relative = path.relative(path.dirname(pathPiped), runtimePath);

  const createImportRegenerator = () => {
    return j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier('regeneratorRuntime'))],
      j.literal(relative)
    );
  };

  const createVariableRegenerator = (key, value) => {
    return j.variableDeclaration('const', [j.variableDeclarator(j.identifier('proConf'), j.objectExpression([j.property('init', j.identifier('wxaName'), j.literal(name)), j.property('init', j.identifier('wxaVersion'), j.literal(version))]))]);
  };

  if (importDeclarations.length) {
    importDeclarations.forEach(path => {
      if (path.node.local.name === 'regeneratorRuntime') {
        runtimeDeclared = true;
      }
    });
    if (!runtimeDeclared) {
      r = source
        .find(j.ImportDeclaration)
        .at(0)
        .insertBefore(createImportRegenerator());
    }
  } else {
    const body = source.get().value.program.body;
    body.unshift(createImportRegenerator());
    r = source;
  }

  function addProConf() {
    r.find(j.ImportDeclaration)
      .at(-1)
      .insertAfter(createVariableRegenerator());
  }

  if (/app\.js/.test(filePath)) {
    addProConf();
  }

  return r.toSource({
    quote: 'single'
  });
};

const codemod = function (channel) {
  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      this.push(file);
      return cb();
    }

    if (file.isStream()) {
      console.error('ERROR: Streaming not supported');
      return cb();
    }

    // eslint-disable-next-line node/no-deprecated-api
    file.contents = Buffer.from(transform(file, channel));

    this.push(file);
    cb();
  });
};

module.exports = codemod;

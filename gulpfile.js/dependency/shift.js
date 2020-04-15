const path = require('path');
const j = require('jscodeshift');
const through = require('through2');
const packageJSON = require('../../package.json');
const {
  _babyfs_app_name: appName,
  _babyfs_app_names: appNames,
  _babyfs_app_ids: appIds,
  _babyfs_version: version
} = {
  ...packageJSON
};

function transform(file, channel) {
  const filePath = file.path; // 文件路径
  const contents = file.contents.toString('utf8');
  const source = j(contents);
  const importDeclarations = source.find(j.ImportDefaultSpecifier);
  let runtimeDeclared = false; // 是否已经声明了runtime
  let r = source; // jscodeshift最终的返回结果

  const createImportRegenerator = () => {
    return j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier('regeneratorRuntime'))],
      j.literal('babyfs-wxapp-runningtime')
    );
  };

  const createExportFunction = () => {
    return j.exportDefaultDeclaration(
      j.objectExpression([
        j.property('init', j.identifier('version'), j.literal(version)),
        j.property('init', j.identifier('appName'), j.literal(appName))
        // j.property('init', j.identifier('appNames'), j.literal(appNames)),
        // j.property('init', j.identifier('appIds'), j.literal(appIds))
      ])
    );
  };

  const addProConf = () => {
    const body = source.get().value.program.body;
    body.unshift(createExportFunction());
    r = source;
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

  if (/conf\.js/.test(filePath)) {
    addProConf();
  }

  return r.toSource({
    quote: 'single'
  });
}

const shift = function(channel) {
  return through.obj(function(file, enc, cb) {
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

module.exports = shift;

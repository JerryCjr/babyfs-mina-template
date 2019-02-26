const path = require('path');
const j = require('jscodeshift');
const through = require('through2');

function transform(file, channel) {
  const contents = file.contents.toString('utf8');
  const source = j(contents);
  const importDeclarations = source.find(j.ImportDefaultSpecifier);
  let relative;
  let runtimeDeclared = false;
  let r;

  switch (channel) {
    case 'src':
      relative = path.relative(path.dirname(file.path), path.resolve('src/miniprogram_npm'));
      break;
    case 'dist':
      relative = '..';
      if (/babyfs-wxapp-runningtime/.test(file.path)) return source.toSource();
      break;
    default:
      relative = path.relative(path.dirname(file.path), 'src/miniprogram_npm');
  }

  const createImportRegenerator = () => {
    return j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier('regeneratorRuntime'))],
      j.literal(`${relative}/babyfs-wxapp-runningtime/index.js`)
    );
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
        .insertBefore(createImportRegenerator())
        .toSource();
    }
  } else {
    const body = source.get().value.program.body;
    body.unshift(createImportRegenerator());
    r = source.toSource({
      quote: 'single'
    });
  }

  return r;
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
    file.contents = new Buffer(transform(file, channel));

    this.push(file);
    cb();
  });
};

module.exports = codemod;

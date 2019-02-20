export default function transformer(file, api) {
  const j = api.jscodeshift;
  const source = j(file.source);
  const importDeclarations = source.find(j.ImportDefaultSpecifier);

  let runtimeDeclared = false;

  const createImportRegenerator = () => {
    return j.importDeclaration(
      [j.importDefaultSpecifier(
        j.identifier('regeneratorRuntime')
      )],
      j.literal('@/babyfs-wxapp-runningtime/index.js')
    );
  };

  if (importDeclarations.length) {
    importDeclarations.forEach((path) => {
      if (path.node.local.name === 'regeneratorRuntime') {
        runtimeDeclared = true;
      }
    });
    if (!runtimeDeclared) {
      return source
        .find(j.ImportDeclaration)
        .at(0)
        .insertBefore(createImportRegenerator())
        .toSource();
    }
  } else {
    const body = source.get().value.program.body;
    body.unshift(createImportRegenerator());
    return source.toSource({
      quote: 'single'
    });
  }
}

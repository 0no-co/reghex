import { createMacro } from 'babel-plugin-macros';
import { makeHelpers } from './transform';

function reghexMacro({ references, babel: { types: t } }) {
  const helpers = makeHelpers(t);
  const defaultRefs = references.default || [];

  defaultRefs.forEach((ref) => {
    if (!t.isCallExpression(ref.parentPath.node)) return;
    const path = ref.parentPath.parentPath;
    if (!helpers.isMatch(path)) return;

    const importPath = helpers.getMatchImport(path);
    if (!importPath) return;

    helpers.updateImport(importPath);
    helpers.transformMatch(path);
  });

  return {
    keepImports: true,
  };
}

export default createMacro(reghexMacro);

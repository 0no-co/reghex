import { makeHelpers } from './transform';

export default function reghexPlugin(babel, opts = {}) {
  let helpers;

  return {
    name: 'reghex',
    visitor: {
      Program() {
        helpers = makeHelpers(babel);
      },
      ImportDeclaration(path) {
        if (opts.codegen === false) return;
        helpers.updateImport(path);
      },
      TaggedTemplateExpression(path) {
        if (helpers.isMatch(path) && helpers.getMatchImport(path)) {
          if (opts.codegen === false) {
            helpers.minifyMatch(path);
          } else {
            helpers.transformMatch(path);
          }
        }
      },
    },
  };
}

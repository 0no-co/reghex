import { makeHelpers } from './transform';

export default function reghexPlugin(babel) {
  let helpers;

  return {
    name: 'reghex',
    visitor: {
      Program() {
        helpers = makeHelpers(babel);
      },
      ImportDeclaration(path) {
        helpers.updateImport(path);
      },
      TaggedTemplateExpression(path) {
        if (helpers.isMatch(path) && helpers.getMatchImport(path)) {
          helpers.transformMatch(path);
        }
      },
    },
  };
}

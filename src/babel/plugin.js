import { makeHelpers } from './transform';

export default function reghexPlugin({ types }) {
  let helpers;

  return {
    name: 'reghex',
    visitor: {
      Program() {
        helpers = makeHelpers(types);
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

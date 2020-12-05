import { transformSync as transform } from '@babel/core';
import { createFilter } from '@rollup/pluginutils';

import transformTemplateLiterals from '@babel/plugin-transform-template-literals';
import eliminateClosures from 'babel-plugin-closure-elimination';

const simplifyJSTags = ({ types: t }) => ({
  visitor: {
    TaggedTemplateExpression(path) {
      if (path.node.tag.name !== 'js') return;

      const expressions = path.node.quasi.expressions;

      const quasis = path.node.quasi.quasis.map((x) =>
        x.value.cooked
          .replace(/\s*[=(){},;:!]\s*/g, (x) => x.trim())
          .replace(/\s+/g, ' ')
          .replace(/^\s+$/g, '')
      );

      const concat = expressions.reduceRight(
        (prev, node, i) =>
          t.binaryExpression(
            '+',
            t.stringLiteral(quasis[i]),
            t.binaryExpression('+', node, prev)
          ),
        t.stringLiteral(quasis[quasis.length - 1])
      );

      path.replaceWith(concat);
    },
  },
});

function simplifyJSTagsPlugin(opts = {}) {
  const filter = createFilter(opts.include, opts.exclude, {
    resolve: false,
  });

  return {
    name: 'cleanup',

    renderChunk(code, chunk) {
      if (!filter(chunk.fileName)) {
        return null;
      }

      return transform(code, {
        plugins: [
          simplifyJSTags,
          [transformTemplateLiterals, { loose: true }],
          eliminateClosures,
        ],
        babelrc: false,
      });
    },
  };
}

export default simplifyJSTagsPlugin;

import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import buble from '@rollup/plugin-buble';
import compiler from '@ampproject/rollup-plugin-closure-compiler';

import simplifyJSTags from './scripts/simplify-jstags-plugin.js';

const plugins = [
  commonjs({
    ignoreGlobal: true,
    include: ['*', '**'],
    extensions: ['.js', '.ts', '.tsx'],
  }),
  resolve({
    mainFields: ['module', 'jsnext', 'main'],
    extensions: ['.js', '.ts', '.tsx'],
    browser: true,
  }),
  buble({
    transforms: {
      unicodeRegExp: false,
      dangerousForOf: true,
      templateString: false,
    },
    exclude: 'node_modules/**',
  }),
];

const output = (format = 'cjs', ext = '.js') => ({
  chunkFileNames: '[hash]' + ext,
  entryFileNames: 'reghex-[name]' + ext,
  dir: './dist',
  exports: 'named',
  externalLiveBindings: false,
  sourcemap: true,
  esModule: false,
  indent: false,
  freeze: false,
  strict: false,
  format,
  plugins: [
    simplifyJSTags(),
    compiler({
      formatting: 'PRETTY_PRINT',
      compilation_level: 'SIMPLE_OPTIMIZATIONS',
    }),
  ],
});

const base = {
  onwarn: () => {},
  external: () => false,
  treeshake: {
    propertyReadSideEffects: false,
  },
  plugins,
  output: [output('cjs', '.js'), output('esm', '.mjs')],
};

export default [
  {
    ...base,
    input: {
      core: './src/core.js',
    },
  },
  {
    ...base,
    output: {
      ...output('cjs', '.js'),
      exports: 'default',
    },
    input: {
      babel: './src/babel/plugin.js',
      macro: './src/babel/macro.js',
    },
  },
];

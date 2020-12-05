import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import buble from '@rollup/plugin-buble';
import babel from 'rollup-plugin-babel';
import compiler from '@ampproject/rollup-plugin-closure-compiler';
import { terser } from 'rollup-plugin-terser';

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
    objectAssign: 'Object.assign',
    exclude: 'node_modules/**',
  }),
  babel({
    babelrc: false,
    extensions: ['ts', 'tsx', 'js'],
    exclude: 'node_modules/**',
    presets: [],
    plugins: [
      '@babel/plugin-transform-object-assign',
      'babel-plugin-closure-elimination',
    ],
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
    terser({
      warnings: true,
      ecma: 5,
      keep_fnames: true,
      ie8: false,
      compress: {
        // We need to hoist vars for process.env.NODE_ENV if-clauses for Metro:
        hoist_vars: true,
        hoist_funs: true,
        pure_getters: true,
        toplevel: true,
        booleans_as_integers: false,
        keep_fnames: true,
        keep_fargs: true,
        if_return: false,
        ie8: false,
        sequences: false,
        loops: false,
        conditionals: false,
        join_vars: false,
      },
      mangle: false,
      output: {
        beautify: true,
        braces: true,
        indent_level: 2,
      },
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
    input: {
      babel: './src/babel/plugin.js',
      macro: './src/babel/macro.js',
    },
  },
];

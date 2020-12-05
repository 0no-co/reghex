import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import buble from '@rollup/plugin-buble';
import babel from 'rollup-plugin-babel';

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
      dangerousTaggedTemplateString: true,
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
  preserveModules: true,
  externalLiveBindings: false,
  sourcemap: true,
  esModule: false,
  indent: false,
  freeze: false,
  strict: false,
  format,
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

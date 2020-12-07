import { astRoot, _exec as execId } from './codegen';
import { parse as parseDSL } from './parser';

const isStickySupported = typeof /./g.sticky === 'boolean';

export const _pattern = (input) => {
  if (typeof input === 'function') return input;
  const source = typeof input !== 'string' ? input.source : input;
  return isStickySupported
    ? new RegExp(source, 'y')
    : new RegExp(source + '|()', 'g');
};

export const _exec = (state, pattern) => {
  let match;

  if (typeof pattern === 'function') {
    if (!pattern.length) pattern = pattern();
    return pattern(state);
  }

  pattern.lastIndex = state.index;

  if (isStickySupported) {
    if (pattern.test(state.input))
      match = state.input.slice(state.index, pattern.lastIndex);
  } else {
    match = pattern.exec(state.input)[0] || match;
  }

  state.index = pattern.lastIndex;
  return match;
};

export const parse = (pattern) => (input) => {
  const state = { input, index: 0 };
  return pattern(state);
};

export const match = (name, transform) => (quasis, ...expressions) => {
  const ast = parseDSL(
    quasis,
    expressions.map((expression, i) => ({
      fn: typeof expression === 'function' && expression.length,
      id: `_${i}`,
    }))
  );

  const makeMatcher = new Function(
    execId + ',_n,_t,' + expressions.map((_expression, i) => `_${i}`).join(','),
    'return ' + astRoot(ast, '_n', transform ? '_t' : null)
  );

  return makeMatcher(_exec, name, transform, ...expressions.map(_pattern));
};

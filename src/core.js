import { astRoot } from './codegen';
import { parse as parseDSL } from './parser';

const isStickySupported = typeof /./g.sticky === 'boolean';

export const _pattern = (input) => {
  if (typeof input === 'function') return input;
  const source = typeof input !== 'string' ? input.source : input;
  return isStickySupported
    ? new RegExp(source, 'y')
    : new RegExp(`^(?:${source})`, 'g');
};

export const _exec = (state, pattern) => {
  let match;

  if (typeof pattern === 'function') {
    while (typeof pattern === 'function') pattern = pattern(state);
    return pattern;
  } else if (isStickySupported) {
    pattern.lastIndex = state.index;
    if (pattern.test(state.input)) {
      match = state.input.slice(state.index, pattern.lastIndex);
      state.index = pattern.lastIndex;
    }
  } else {
    pattern.lastIndex = 0;
    if (pattern.test(state.input.slice(state.index))) {
      const lastIndex = state.index + pattern.lastIndex;
      match = state.input.slice(state.index, lastIndex);
      state.index = lastIndex;
    }
  }

  return match;
};

export const parse = (pattern) => (input) => {
  const state = { input, index: 0 };
  return pattern(state);
};

export const match = (name, transform) => (quasis, ...expressions) => {
  const ast = parseDSL(
    quasis,
    expressions.map((expression, i) => `_e(state, _${i})`)
  );

  const makeMatcher = new Function(
    '_e,_n,_t,' + expressions.map((_expression, i) => `_${i}`).join(','),
    'return ' + astRoot(ast, '_n', transform ? '_t' : null)
  );

  return makeMatcher(_exec, name, transform, ...expressions.map(_pattern));
};

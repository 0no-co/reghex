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

  const input = state.quasis[state.x];
  if (input && (pattern.lastIndex = state.y) < input.length) {
    if (isStickySupported) {
      if (pattern.test(input)) match = input.slice(state.y, pattern.lastIndex);
    } else {
      match = pattern.exec(input)[0] || match;
    }
  }

  state.y = pattern.lastIndex;
  return match;
};

export const interpolation = (state) => {
  let match;

  const input = state.quasis[state.x];
  if (!input || state.y >= input.length) {
    state.y = 0;
    match = state.expressions[state.x++] || match;
  }

  return match;
};

export const parse = (pattern) => (quasis, ...expressions) => {
  if (typeof quasis === 'string') quasis = [quasis];
  const state = { quasis, expressions, x: 0, y: 0 };
  return pattern(state);
};

export const match = (name, transform) => (quasis, ...expressions) => {
  let interpolations = 0;

  const ast = parseDSL(
    quasis,
    expressions.map((expression, i) => {
      if (expression === interpolation) interpolations++;
      return {
        fn: typeof expression === 'function' && expression.length,
        id: `_${i}`,
      };
    })
  );

  const makeMatcher = new Function(
    execId + ',_n,_t,' + expressions.map((_expression, i) => `_${i}`).join(','),
    'return ' + astRoot(ast, '_n', transform ? '_t' : null, interpolations)
  );

  return makeMatcher(_exec, name, transform, ...expressions.map(_pattern));
};

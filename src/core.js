import { astRoot } from './codegen';
import { parse as parseDSL } from './parser';

const isStickySupported = typeof /./g.sticky === 'boolean';

const execLambda = (pattern) => {
  if (pattern.length) return pattern;
  return (state) => pattern()(state);
};

const execString = (pattern) => {
  return (state) => {
    const input = state.quasis[state.x];
    if (input && state.y < input.length) {
      for (let i = 0, l = pattern.length; i < l; i++)
        if (input.charCodeAt(state.y + i) !== pattern.charCodeAt(i))
          return null;
      state.y += pattern.length;
      return pattern;
    }
  };
};

const execRegex = (pattern) => {
  pattern = isStickySupported
    ? new RegExp(pattern.source, 'y')
    : new RegExp(pattern.source + '|()', 'g');
  return (state) => {
    const input = state.quasis[state.x];
    if (input && state.y < input.length) {
      pattern.lastIndex = state.y;

      let match;
      if (isStickySupported) {
        if (pattern.test(input))
          match = input.slice(state.y, pattern.lastIndex);
      } else {
        const x = pattern.exec(input);
        if (x[1] == null) match = x[0];
      }

      state.y = pattern.lastIndex;
      return match;
    }
  };
};

export const __pattern = (input) => {
  if (typeof input === 'function') {
    return execLambda(input);
  } else if (typeof input === 'string') {
    return execString(input);
  } else {
    return execRegex(input);
  }
};

export const interpolation = (predicate) => (state) => {
  let match;

  if (
    state.y >= state.quasis[state.x].length &&
    state.x < state.expressions.length
  ) {
    state.y = 0;
    match = state.expressions[state.x++];
    if (predicate && match) match = predicate(match);
  }

  return match;
};

export const parse = (matcher) => (quasis, ...expressions) => {
  if (typeof quasis === 'string') quasis = [quasis];
  const state = { quasis, expressions, x: 0, y: 0 };
  return matcher(state);
};

export const match = (name, transform) => (quasis, ...expressions) => {
  const ast = parseDSL(
    quasis,
    expressions.map((_, i) => ({ id: `_${i}` }))
  );
  return new Function(
    '_n,_t,' + expressions.map((_expression, i) => `_${i}`).join(','),
    'return ' + astRoot(ast, '_n', transform ? '_t' : null)
  )(name, transform, ...expressions.map(__pattern));
};

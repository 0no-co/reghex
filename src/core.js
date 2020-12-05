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
    return pattern(state);
  } else if (typeof pattern === 'string') {
    const end = state.index + pattern.length;
    const sub = state.input.slice(state.index, end);
    if (sub === pattern) {
      state.index = end;
      match = sub;
    }
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

export const tag = (array, tag) => {
  array.tag = tag;
  return array;
};

export const parse = (pattern) => (input) => {
  const state = { input, index: 0 };
  return pattern(state);
};

export const match = (_name) => {
  throw new TypeError(
    'This match() function was not transformed. ' +
      'Ensure that the Babel plugin is set up correctly and try again.'
  );
};

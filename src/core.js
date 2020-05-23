const isStickySupported = typeof /./g.sticky === 'boolean';

export const _pattern = (input) => {
  if (typeof input === 'function') return input;

  const source = typeof input !== 'string' ? input.source : input;
  return isStickySupported
    ? new RegExp(source, 'y')
    : new RegExp(`^(?:${source})`, 'g');
};

export const _exec = (state, pattern) => {
  if (typeof pattern === 'function') return pattern();

  let match;
  if (isStickySupported) {
    pattern.lastIndex = state.index;
    match = pattern.exec(state.input);
    state.index = pattern.lastIndex;
  } else {
    pattern.lastIndex = 0;
    match = pattern.exec(state.input.slice(state.input));
    state.index += pattern.lastIndex;
  }

  return match && match[0];
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

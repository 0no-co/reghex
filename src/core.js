const isStickySupported = typeof /./g.sticky === 'boolean';

let state$input = '';
let state$lastIndex = 0;

export const _getLastIndex = () => {
  return state$lastIndex;
};

export const _setLastIndex = (index) => {
  state$lastIndex = index;
};

export const _pattern = (input) => {
  if (typeof input === 'function') return input;

  const source = typeof input !== 'string' ? input.source : input;
  return isStickySupported
    ? new RegExp(source, 'y')
    : new RegExp(`^(?:${source})`, 'g');
};

export const _execPattern = (pattern) => {
  if (typeof pattern === 'function') return pattern();

  let match;
  if (isStickySupported) {
    pattern.lastIndex = state$lastIndex;
    match = pattern.exec(state$input);
    state$lastIndex = pattern.lastIndex;
  } else {
    pattern.lastIndex = 0;
    match = pattern.exec(state$input.slice(state$lastIndex));
    state$lastIndex += pattern.lastIndex;
  }

  return match && match[0];
};

export const tag = (array, tag) => {
  array.tag = tag;
  return array;
};

export const parse = (pattern) => (input) => {
  state$input = input;
  state$lastIndex = 0;
  return pattern();
};

export const match = (_name) => {
  throw new TypeError(
    'This match() function was not transformed. ' +
      'Ensure that the Babel plugin is set up correctly and try again.'
  );
};

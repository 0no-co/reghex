const syntaxError = (char) => {
  throw new SyntaxError('Unexpected token "' + char + '"');
};

export const parse = (quasis, expressions) => {
  let quasiIndex = 0;
  let stackIndex = 0;

  const sequenceStack = [];
  const rootSequence = [];

  let currentGroup = null;
  let lastMatch;
  let currentSequence = rootSequence;
  let capture;

  for (
    let quasiIndex = 0, stackIndex = 0;
    stackIndex < quasis.length + expressions.length;
    stackIndex++
  ) {
    if (stackIndex % 2 !== 0) {
      const expression = expressions[stackIndex++ >> 1];
      currentSequence.push({ expression, capture });
      capture = undefined;
    }

    const quasi = quasis[stackIndex >> 1];
    for (quasiIndex = 0; quasiIndex < quasi.length; ) {
      const char = quasi[quasiIndex++];
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
      } else if (char === '|' && currentSequence.length) {
        currentSequence = currentSequence.alternation = [];
      } else if (char === ')' && currentSequence.length) {
        currentGroup = null;
        currentSequence = sequenceStack.pop();
        if (!currentSequence) syntaxError(char);
      } else if (char === '(') {
        sequenceStack.push(currentSequence);
        currentSequence.push((currentGroup = { sequence: [], capture }));
        currentSequence = currentGroup.sequence;
        capture = undefined;
      } else if (char === ':' || char === '=' || char === '!') {
        capture = char;
        const nextChar = quasi[quasiIndex];
        if (quasi[quasiIndex] && quasi[quasiIndex] !== '(') syntaxError(char);
      } else if (char === '?' && !currentSequence.length && currentGroup) {
        capture = quasi[quasiIndex++];
        if (capture === ':' || capture === '=' || capture === '!') {
          currentGroup.capture = capture;
          capture = undefined;
        } else {
          syntaxError(char);
        }
      } else if (
        (char === '?' || char === '+' || char === '*') &&
        (lastMatch = currentSequence[currentSequence.length - 1])
      ) {
        lastMatch.quantifier = char;
      } else {
        syntaxError(char);
      }
    }
  }

  return rootSequence;
};

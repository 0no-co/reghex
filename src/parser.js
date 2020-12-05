export const parse = (quasis, expressions) => {
  let quasiIndex = 0;
  let stackIndex = 0;

  const sequenceStack = [];
  const rootSequence = {
    sequence: [],
  };

  let currentGroup = null;
  let lastMatch;
  let currentSequence = rootSequence;

  while (stackIndex < quasis.length + expressions.length) {
    if (stackIndex % 2 !== 0) {
      currentSequence.sequence.push({
        expression: expressions[stackIndex++ >> 1],
      });
    }

    const quasi = quasis[stackIndex >> 1];
    while (quasiIndex < quasi.length) {
      const char = quasi[quasiIndex++];

      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        continue;
      } else if (char === '|' && currentSequence.sequence.length > 0) {
        currentSequence = currentSequence.alternation = {
          sequence: [],
        };

        continue;
      } else if (char === ')' && currentSequence.sequence.length > 0) {
        currentGroup = null;
        currentSequence = sequenceStack.pop();
        if (currentSequence) continue;
      } else if (char === '(') {
        currentGroup = {
          sequence: {
            sequence: [],
          },
        };

        sequenceStack.push(currentSequence);
        currentSequence.sequence.push(currentGroup);
        currentSequence = currentGroup.sequence;
        continue;
      } else if (
        char === '?' &&
        currentSequence.sequence.length === 0 &&
        currentGroup
      ) {
        const nextChar = quasi[quasiIndex++];
        if (nextChar === ':') {
          currentGroup.capture = nextChar;
          continue;
        } else if (nextChar === '=') {
          currentGroup.capture = nextChar;
          continue;
        } else if (nextChar === '!') {
          currentGroup.capture = nextChar;
          continue;
        }
      } else if (
        (char === '?' || char === '+' || char === '*') &&
        (lastMatch =
          currentSequence.sequence[currentSequence.sequence.length - 1])
      ) {
        lastMatch.quantifier = char;
        continue;
      }

      throw new SyntaxError('Unexpected token "' + char + '"');
    }

    stackIndex++;
    quasiIndex = 0;
  }

  return rootSequence;
};

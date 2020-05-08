export const parse = (quasis, expressions) => {
  let quasiIndex = 0;
  let stackIndex = 0;

  const sequenceStack = [];
  const rootSequence = {
    type: 'sequence',
    sequence: [],
    alternation: null,
  };

  let currentGroup = null;
  let lastMatch;
  let currentSequence = rootSequence;

  while (stackIndex < quasis.length + expressions.length) {
    if (stackIndex % 2 !== 0) {
      const expression = expressions[stackIndex++ >> 1];

      currentSequence.sequence.push({
        type: 'expression',
        expression,
        quantifier: null,
      });
    }

    const quasi = quasis[stackIndex >> 1];
    while (quasiIndex < quasi.length) {
      const char = quasi[quasiIndex++];

      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        continue;
      } else if (char === '|' && currentSequence.sequence.length > 0) {
        currentSequence = currentSequence.alternation = {
          type: 'sequence',
          sequence: [],
          alternation: null,
        };

        continue;
      } else if (char === ')' && currentSequence.sequence.length > 0) {
        currentGroup = null;
        currentSequence = sequenceStack.pop();
        if (currentSequence) continue;
      } else if (char === '(') {
        currentGroup = {
          type: 'group',
          sequence: {
            type: 'sequence',
            sequence: [],
            alternation: null,
          },
          capturing: true,
          lookahead: null,
          quantifier: null,
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
        if (!nextChar) {
          throw new SyntaxError('Unexpected end of input after ' + char);
        }

        if (nextChar === ':') {
          currentGroup.capturing = false;
          continue;
        } else if (nextChar === '=') {
          currentGroup.capturing = false;
          currentGroup.lookahead = 'positive';
          continue;
        } else if (nextChar === '!') {
          currentGroup.capturing = false;
          currentGroup.lookahead = 'negative';
          continue;
        }
      } else if (
        (char === '?' || char === '+' || char === '*') &&
        (lastMatch =
          currentSequence.sequence[currentSequence.sequence.length - 1])
      ) {
        if (lastMatch.type === 'group' && lastMatch.lookahead) {
          throw new SyntaxError('Unexpected quantifier on lookahead group');
        }

        lastMatch.quantifier = {
          type: 'quantifier',
          required: char === '+',
          singular: char === '?',
        };

        continue;
      }

      throw new SyntaxError('Unexpected token ' + char);
    }

    stackIndex++;
    quasiIndex = 0;
  }

  return rootSequence;
};

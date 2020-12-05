import * as reghex from '../../../src/core';
import * as types from '@babel/types';
import template from '@babel/template';
import { transform } from '@babel/core';
import { makeHelpers } from '../transform';

const match = (name) => (quasis, ...expressions) => {
  const helpers = makeHelpers({ types, template });

  let str = '';
  for (let i = 0; i < quasis.length; i++) {
    str += quasis[i];
    if (i < expressions.length) str += '${' + expressions[i].toString() + '}';
  }

  const testPlugin = () => ({
    visitor: {
      TaggedTemplateExpression(path) {
        helpers.transformMatch(path);
      },
    },
  });

  const { code } = transform(
    `(function () { return match('${name}')\`${str}\`; })()`,
    {
      babelrc: false,
      presets: [],
      plugins: [testPlugin],
    }
  );

  const argKeys = Object.keys(reghex).filter((x) => {
    return x.startsWith('_') || x === 'tag';
  });

  const args = argKeys.map((key) => reghex[key]);
  return new Function(...argKeys, 'return ' + code)(...args);
};

const expectToParse = (node, input, result, lastIndex = 0) => {
  const state = { input, index: 0 };
  expect(node(state)).toEqual(
    result === undefined ? result : reghex.tag(result, 'node')
  );

  // NOTE: After parsing we expect the current index to exactly match the
  // sum amount of matched characters
  if (result === undefined) {
    expect(state.index).toBe(0);
  } else {
    const index = lastIndex || result.reduce((acc, x) => acc + x.length, 0);
    expect(state.index).toBe(index);
  }
};

describe('required matcher', () => {
  const node = match('node')`${/1/}`;
  it.each`
    input  | result
    ${'1'} | ${['1']}
    ${''}  | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('optional matcher', () => {
  const node = match('node')`${/1/}?`;
  it.each`
    input  | result
    ${'1'} | ${['1']}
    ${'_'} | ${[]}
    ${''}  | ${[]}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('star matcher', () => {
  const node = match('node')`${/1/}*`;
  it.each`
    input    | result
    ${'1'}   | ${['1']}
    ${'11'}  | ${['1', '1']}
    ${'111'} | ${['1', '1', '1']}
    ${'_'}   | ${[]}
    ${''}    | ${[]}
  `('should return $result when "$input" is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('plus matcher', () => {
  const node = match('node')`${/1/}+`;
  it.each`
    input    | result
    ${'1'}   | ${['1']}
    ${'11'}  | ${['1', '1']}
    ${'111'} | ${['1', '1', '1']}
    ${'_'}   | ${undefined}
    ${''}    | ${undefined}
  `('should return $result when "$input" is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('optional then required matcher', () => {
  const node = match('node')`${/1/}? ${/2/}`;
  it.each`
    input   | result
    ${'12'} | ${['1', '2']}
    ${'2'}  | ${['2']}
    ${''}   | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('star then required matcher', () => {
  const node = match('node')`${/1/}* ${/2/}`;
  it.each`
    input    | result
    ${'12'}  | ${['1', '2']}
    ${'112'} | ${['1', '1', '2']}
    ${'2'}   | ${['2']}
    ${''}    | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('plus then required matcher', () => {
  const node = match('node')`${/1/}+ ${/2/}`;
  it.each`
    input    | result
    ${'12'}  | ${['1', '2']}
    ${'112'} | ${['1', '1', '2']}
    ${'2'}   | ${undefined}
    ${''}    | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('optional group then required matcher', () => {
  const node = match('node')`(${/1/} ${/2/})? ${/3/}`;
  it.each`
    input    | result
    ${'123'} | ${['1', '2', '3']}
    ${'3'}   | ${['3']}
    ${'_'}   | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('star group then required matcher', () => {
  const node = match('node')`(${/1/} ${/2/})* ${/3/}`;
  it.each`
    input      | result
    ${'123'}   | ${['1', '2', '3']}
    ${'12123'} | ${['1', '2', '1', '2', '3']}
    ${'3'}     | ${['3']}
    ${'13'}    | ${undefined}
    ${'_'}     | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('plus group then required matcher', () => {
  const node = match('node')`(${/1/} ${/2/})+ ${/3/}`;
  it.each`
    input      | result
    ${'123'}   | ${['1', '2', '3']}
    ${'12123'} | ${['1', '2', '1', '2', '3']}
    ${'3'}     | ${undefined}
    ${'13'}    | ${undefined}
    ${'_'}     | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('optional group with nested optional matcher, then required matcher', () => {
  const node = match('node')`(${/1/}? ${/2/})? ${/3/}`;
  it.each`
    input    | result
    ${'123'} | ${['1', '2', '3']}
    ${'23'}  | ${['2', '3']}
    ${'3'}   | ${['3']}
    ${'13'}  | ${undefined}
    ${'_'}   | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('star group with nested optional matcher, then required matcher', () => {
  const node = match('node')`(${/1/}? ${/2/})* ${/3/}`;
  it.each`
    input     | result
    ${'123'}  | ${['1', '2', '3']}
    ${'23'}   | ${['2', '3']}
    ${'223'}  | ${['2', '2', '3']}
    ${'2123'} | ${['2', '1', '2', '3']}
    ${'3'}    | ${['3']}
    ${'13'}   | ${undefined}
    ${'_'}    | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('plus group with nested optional matcher, then required matcher', () => {
  const node = match('node')`(${/1/}? ${/2/})+ ${/3/}`;
  it.each`
    input     | result
    ${'123'}  | ${['1', '2', '3']}
    ${'23'}   | ${['2', '3']}
    ${'223'}  | ${['2', '2', '3']}
    ${'2123'} | ${['2', '1', '2', '3']}
    ${'3'}    | ${undefined}
    ${'13'}   | ${undefined}
    ${'_'}    | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('plus group with nested plus matcher, then required matcher', () => {
  const node = match('node')`(${/1/}+ ${/2/})+ ${/3/}`;
  it.each`
    input       | result
    ${'123'}    | ${['1', '2', '3']}
    ${'1123'}   | ${['1', '1', '2', '3']}
    ${'12123'}  | ${['1', '2', '1', '2', '3']}
    ${'121123'} | ${['1', '2', '1', '1', '2', '3']}
    ${'3'}      | ${undefined}
    ${'23'}     | ${undefined}
    ${'13'}     | ${undefined}
    ${'_'}      | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('plus group with nested required and plus matcher, then required matcher', () => {
  const node = match('node')`(${/1/} ${/2/}+)+ ${/3/}`;
  it.each`
    input       | result
    ${'123'}    | ${['1', '2', '3']}
    ${'1223'}   | ${['1', '2', '2', '3']}
    ${'122123'} | ${['1', '2', '2', '1', '2', '3']}
    ${'13'}     | ${undefined}
    ${'_'}      | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('nested plus group with nested required and plus matcher, then required matcher or alternate', () => {
  const node = match('node')`(${/1/} ${/2/}+)+ ${/3/} | ${/1/}`;
  it.each`
    input       | result
    ${'123'}    | ${['1', '2', '3']}
    ${'1223'}   | ${['1', '2', '2', '3']}
    ${'122123'} | ${['1', '2', '2', '1', '2', '3']}
    ${'1'}      | ${['1']}
    ${'13'}     | ${['1']}
    ${'_'}      | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('nested plus group with nested required and plus matcher, then alternate', () => {
  const node = match('node')`(${/1/} ${/2/}+)+ (${/3/} | ${/4/})`;
  it.each`
    input     | result
    ${'123'}  | ${['1', '2', '3']}
    ${'124'}  | ${['1', '2', '4']}
    ${'1223'} | ${['1', '2', '2', '3']}
    ${'1224'} | ${['1', '2', '2', '4']}
    ${'1'}    | ${undefined}
    ${'13'}   | ${undefined}
    ${'_'}    | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('regular alternate', () => {
  const node = match('node')`${/1/} | ${/2/} | ${/3/} | ${/4/}`;
  it.each`
    input  | result
    ${'1'} | ${['1']}
    ${'2'} | ${['2']}
    ${'3'} | ${['3']}
    ${'4'} | ${['4']}
    ${'_'} | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('nested alternate in nested alternate in alternate', () => {
  const node = match('node')`((${/1/} | ${/2/}) | ${/3/}) | ${/4/}`;
  it.each`
    input  | result
    ${'1'} | ${['1']}
    ${'2'} | ${['2']}
    ${'3'} | ${['3']}
    ${'4'} | ${['4']}
    ${'_'} | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('alternate after required matcher', () => {
  const node = match('node')`${/1/} (${/2/} | ${/3/})`;
  it.each`
    input   | result
    ${'12'} | ${['1', '2']}
    ${'13'} | ${['1', '3']}
    ${'14'} | ${undefined}
    ${'3'}  | ${undefined}
    ${'_'}  | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('alternate with star group and required matcher after required matcher', () => {
  const node = match('node')`${/1/} (${/2/}* ${/3/} | ${/4/})`;
  it.each`
    input     | result
    ${'123'}  | ${['1', '2', '3']}
    ${'1223'} | ${['1', '2', '2', '3']}
    ${'13'}   | ${['1', '3']}
    ${'14'}   | ${['1', '4']}
    ${'12'}   | ${undefined}
    ${'15'}   | ${undefined}
    ${'_'}    | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('alternate with plus group and required matcher after required matcher', () => {
  const node = match('node')`${/1/} (${/2/}+ ${/3/} | ${/4/})`;
  it.each`
    input     | result
    ${'123'}  | ${['1', '2', '3']}
    ${'1223'} | ${['1', '2', '2', '3']}
    ${'14'}   | ${['1', '4']}
    ${'13'}   | ${undefined}
    ${'12'}   | ${undefined}
    ${'15'}   | ${undefined}
    ${'_'}    | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('alternate with optional and required matcher after required matcher', () => {
  const node = match('node')`${/1/} (${/2/}? ${/3/} | ${/4/})`;
  it.each`
    input    | result
    ${'123'} | ${['1', '2', '3']}
    ${'13'}  | ${['1', '3']}
    ${'14'}  | ${['1', '4']}
    ${'12'}  | ${undefined}
    ${'15'}  | ${undefined}
    ${'_'}   | ${undefined}
  `('should return $result when $input is passed', ({ input, result }) => {
    expectToParse(node, input, result);
  });
});

describe('non-capturing group', () => {
  const node = match('node')`${/1/} (?: ${/2/}+)`;
  it.each`
    input    | result       | lastIndex
    ${'12'}  | ${['1']}     | ${2}
    ${'122'} | ${['1']}     | ${3}
    ${'13'}  | ${undefined} | ${0}
    ${'1'}   | ${undefined} | ${0}
    ${'_'}   | ${undefined} | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

describe('non-capturing group with plus matcher, then required matcher', () => {
  const node = match('node')`(?: ${/1/}+) ${/2/}`;
  it.each`
    input    | result       | lastIndex
    ${'12'}  | ${['2']}     | ${2}
    ${'112'} | ${['2']}     | ${3}
    ${'1'}   | ${undefined} | ${0}
    ${'13'}  | ${undefined} | ${0}
    ${'2'}   | ${undefined} | ${0}
    ${'_'}   | ${undefined} | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

describe('non-capturing group with star group and required matcher, then required matcher', () => {
  const node = match('node')`(?: ${/1/}* ${/2/}) ${/3/}`;
  it.each`
    input     | result       | lastIndex
    ${'123'}  | ${['3']}     | ${3}
    ${'1123'} | ${['3']}     | ${4}
    ${'23'}   | ${['3']}     | ${2}
    ${'13'}   | ${undefined} | ${0}
    ${'2'}    | ${undefined} | ${0}
    ${'_'}    | ${undefined} | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

describe('non-capturing group with plus group and required matcher, then required matcher', () => {
  const node = match('node')`(?: ${/1/}+ ${/2/}) ${/3/}`;
  it.each`
    input     | result       | lastIndex
    ${'123'}  | ${['3']}     | ${3}
    ${'1123'} | ${['3']}     | ${4}
    ${'23'}   | ${undefined} | ${0}
    ${'13'}   | ${undefined} | ${0}
    ${'2'}    | ${undefined} | ${0}
    ${'_'}    | ${undefined} | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

describe('non-capturing group with optional and required matcher, then required matcher', () => {
  const node = match('node')`(?: ${/1/}? ${/2/}) ${/3/}`;
  it.each`
    input    | result       | lastIndex
    ${'123'} | ${['3']}     | ${3}
    ${'23'}  | ${['3']}     | ${2}
    ${'13'}  | ${undefined} | ${0}
    ${'2'}   | ${undefined} | ${0}
    ${'_'}   | ${undefined} | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

describe('positive lookahead group', () => {
  const node = match('node')`(?= ${/1/}) ${/\d/}`;
  it.each`
    input   | result       | lastIndex
    ${'1'}  | ${['1']}     | ${1}
    ${'13'} | ${['1']}     | ${1}
    ${'2'}  | ${undefined} | ${0}
    ${'_'}  | ${undefined} | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

describe('positive lookahead group with plus matcher', () => {
  const node = match('node')`(?= ${/1/}+) ${/\d/}`;
  it.each`
    input   | result       | lastIndex
    ${'1'}  | ${['1']}     | ${1}
    ${'11'} | ${['1']}     | ${1}
    ${'12'} | ${['1']}     | ${1}
    ${'22'} | ${undefined} | ${0}
    ${'2'}  | ${undefined} | ${0}
    ${'_'}  | ${undefined} | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

describe('positive lookahead group with plus group and required matcher', () => {
  const node = match('node')`(?= ${/1/}+ ${/2/}) ${/\d/}`;
  it.each`
    input     | result       | lastIndex
    ${'12'}   | ${['1']}     | ${1}
    ${'112'}  | ${['1']}     | ${1}
    ${'1123'} | ${['1']}     | ${1}
    ${'2'}    | ${undefined} | ${0}
    ${'1'}    | ${undefined} | ${0}
    ${'2'}    | ${undefined} | ${0}
    ${'_'}    | ${undefined} | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

describe('negative lookahead group', () => {
  const node = match('node')`(?! ${/1/}) ${/\d/}`;
  it.each`
    input   | result       | lastIndex
    ${'2'}  | ${['2']}     | ${1}
    ${'23'} | ${['2']}     | ${1}
    ${'1'}  | ${undefined} | ${0}
    ${'1'}  | ${undefined} | ${0}
    ${'_'}  | ${undefined} | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

describe('longer negative lookahead group', () => {
  const node = match('node')`${/1/} (?! ${/2/} ${/3/}) ${/\d/} ${/\d/}`;
  it.each`
    input    | result             | lastIndex
    ${'145'} | ${['1', '4', '5']} | ${3}
    ${'124'} | ${['1', '2', '4']} | ${3}
    ${'123'} | ${undefined}       | ${0}
    ${'2'}   | ${undefined}       | ${0}
    ${'_'}   | ${undefined}       | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

describe('negative lookahead group with plus matcher', () => {
  const node = match('node')`(?! ${/1/}+) ${/\d/}`;
  it.each`
    input   | result       | lastIndex
    ${'2'}  | ${['2']}     | ${1}
    ${'21'} | ${['2']}     | ${1}
    ${'22'} | ${['2']}     | ${1}
    ${'11'} | ${undefined} | ${0}
    ${'1'}  | ${undefined} | ${0}
    ${'_'}  | ${undefined} | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

describe('negative lookahead group with plus group and required matcher', () => {
  const node = match('node')`(?! ${/1/}+ ${/2/}) ${/\d/}`;
  it.each`
    input    | result       | lastIndex
    ${'21'}  | ${['2']}     | ${1}
    ${'211'} | ${['2']}     | ${1}
    ${'113'} | ${['1']}     | ${1}
    ${'1'}   | ${['1']}     | ${1}
    ${'112'} | ${undefined} | ${0}
    ${'12'}  | ${undefined} | ${0}
    ${'_'}   | ${undefined} | ${0}
  `(
    'should return $result when $input is passed',
    ({ input, result, lastIndex }) => {
      expectToParse(node, input, result, lastIndex);
    }
  );
});

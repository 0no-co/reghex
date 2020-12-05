import { parse } from './parser';

const parseTag = (quasis, ...expressions) => parse(quasis, expressions);

it('supports parsing expressions', () => {
  expect(parseTag`${1}`).toEqual({
    sequence: [
      {
        expression: 1,
        quantifier: undefined,
      },
    ],
    alternation: undefined,
  });
});

it('supports parsing expressions with quantifiers', () => {
  let ast;

  ast = parseTag`${1}?`;
  expect(ast).toHaveProperty('sequence.0.quantifier', '?');

  ast = parseTag`${1}+`;
  expect(ast).toHaveProperty('sequence.0.quantifier', '+');

  ast = parseTag`${1}*`;
  expect(ast).toHaveProperty('sequence.0.quantifier', '*');
});

it('supports top-level alternations', () => {
  let ast;

  ast = parseTag`${1} | ${2}`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.expression', 1);
  expect(ast).toHaveProperty('alternation.sequence.0.expression', 2);

  ast = parseTag`${1}? | ${2}?`;
  expect(ast).toHaveProperty('sequence.0.quantifier', '?');
});

it('supports groups with quantifiers', () => {
  let ast;

  ast = parseTag`(${1} ${2})`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.length', 2);
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.0.expression', 1);
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.1.expression', 2);

  ast = parseTag`(${1} ${2}?)?`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.quantifier', '?');
  expect(ast).toHaveProperty(
    'sequence.0.sequence.sequence.0.quantifier',
    undefined
  );
});

it('supports non-capturing groups', () => {
  const ast = parseTag`(?: ${1})`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.capture', ':');
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.length', 1);
});

it('supports positive lookahead groups', () => {
  const ast = parseTag`(?= ${1})`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.capture', '=');
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.length', 1);
});

it('supports negative lookahead groups', () => {
  const ast = parseTag`(?! ${1})`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.capture', '!');
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.length', 1);
});

it('supports groups with alternates', () => {
  expect(parseTag`(${1} | ${2}) ${3}`).toMatchInlineSnapshot(`
    Object {
      "sequence": Array [
        Object {
          "sequence": Object {
            "alternation": Object {
              "sequence": Array [
                Object {
                  "expression": 2,
                },
              ],
            },
            "sequence": Array [
              Object {
                "expression": 1,
              },
            ],
          },
        },
        Object {
          "expression": 3,
        },
      ],
    }
  `);
});

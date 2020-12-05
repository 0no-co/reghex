import { parse } from './parser';

const parseTag = (quasis, ...expressions) => parse(quasis, expressions);

it('supports parsing expressions with quantifiers', () => {
  let ast;

  ast = parseTag`${1}?`;
  expect(ast).toHaveProperty('0.quantifier', '?');

  ast = parseTag`${1}+`;
  expect(ast).toHaveProperty('0.quantifier', '+');

  ast = parseTag`${1}*`;
  expect(ast).toHaveProperty('0.quantifier', '*');
});

it('supports top-level alternations', () => {
  let ast;

  ast = parseTag`${1} | ${2}`;
  expect(ast).toHaveProperty('length', 1);
  expect(ast).toHaveProperty('0.expression', 1);
  expect(ast).toHaveProperty('alternation.0.expression', 2);

  ast = parseTag`${1}? | ${2}?`;
  expect(ast).toHaveProperty('0.quantifier', '?');
});

it('supports groups with quantifiers', () => {
  let ast;

  ast = parseTag`(${1} ${2})`;
  expect(ast).toHaveProperty('length', 1);
  expect(ast).toHaveProperty('0.sequence.length', 2);
  expect(ast).toHaveProperty('0.sequence.0.expression', 1);
  expect(ast).toHaveProperty('0.sequence.1.expression', 2);

  ast = parseTag`(${1} ${2}?)?`;
  expect(ast).toHaveProperty('length', 1);
  expect(ast).toHaveProperty('0.quantifier', '?');
  expect(ast).toHaveProperty('0.sequence.0.quantifier', undefined);
});

it('supports non-capturing groups', () => {
  const ast = parseTag`(?: ${1})`;
  expect(ast).toHaveProperty('length', 1);
  expect(ast).toHaveProperty('0.capture', ':');
  expect(ast).toHaveProperty('0.sequence.length', 1);
});

it('supports positive lookahead groups', () => {
  const ast = parseTag`(?= ${1})`;
  expect(ast).toHaveProperty('length', 1);
  expect(ast).toHaveProperty('0.capture', '=');
  expect(ast).toHaveProperty('0.sequence.length', 1);
});

it('supports negative lookahead groups', () => {
  const ast = parseTag`(?! ${1})`;
  expect(ast).toHaveProperty('length', 1);
  expect(ast).toHaveProperty('0.capture', '!');
  expect(ast).toHaveProperty('0.sequence.length', 1);
});

it('supports groups with alternates', () => {
  expect(parseTag`(${1} | ${2}) ${3}`).toMatchInlineSnapshot(`
    Array [
      Object {
        "sequence": Array [
          Object {
            "expression": 1,
          },
        ],
      },
      Object {
        "expression": 3,
      },
    ]
  `);
});

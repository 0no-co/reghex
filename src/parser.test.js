import { parse } from './parser';

const parseTag = (quasis, ...expressions) => parse(quasis, expressions);

it('supports parsing expressions', () => {
  expect(parseTag`${1}`).toEqual({
    type: 'sequence',
    sequence: [
      {
        type: 'expression',
        expression: 1,
        quantifier: null,
      },
    ],
    alternation: null,
  });
});

it('supports parsing expressions with quantifiers', () => {
  let ast;

  ast = parseTag`${1}?`;
  expect(ast).toHaveProperty('sequence.0.type', 'expression');
  expect(ast).toHaveProperty('sequence.0.quantifier', 'optional');

  ast = parseTag`${1}+`;
  expect(ast).toHaveProperty('sequence.0.type', 'expression');
  expect(ast).toHaveProperty('sequence.0.quantifier', 'repeating');

  ast = parseTag`${1}*`;
  expect(ast).toHaveProperty('sequence.0.type', 'expression');
  expect(ast).toHaveProperty('sequence.0.quantifier', 'multiple');
});

it('supports top-level alternations', () => {
  let ast;

  ast = parseTag`${1} | ${2}`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.type', 'expression');
  expect(ast).toHaveProperty('sequence.0.expression', 1);
  expect(ast).toHaveProperty('alternation.type', 'sequence');
  expect(ast).toHaveProperty('alternation.sequence.0.expression', 2);

  ast = parseTag`${1}? | ${2}?`;
  expect(ast).toHaveProperty('sequence.0.quantifier', 'optional');
});

it('supports groups with quantifiers', () => {
  let ast;

  ast = parseTag`(${1} ${2})`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.type', 'group');
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.length', 2);
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.0.expression', 1);
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.1.expression', 2);

  ast = parseTag`(${1} ${2}?)?`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.type', 'group');
  expect(ast).toHaveProperty('sequence.0.quantifier', 'optional');
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.0.quantifier', null);
});

it('supports non-capturing groups', () => {
  const ast = parseTag`(?: ${1})`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.type', 'group');
  expect(ast).toHaveProperty('sequence.0.capturing', false);
  expect(ast).toHaveProperty('sequence.0.lookahead', null);
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.length', 1);
});

it('supports positive lookahead groups', () => {
  const ast = parseTag`(?= ${1})`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.type', 'group');
  expect(ast).toHaveProperty('sequence.0.capturing', false);
  expect(ast).toHaveProperty('sequence.0.lookahead', 'positive');
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.length', 1);
});

it('supports negative lookahead groups', () => {
  const ast = parseTag`(?! ${1})`;
  expect(ast).toHaveProperty('sequence.length', 1);
  expect(ast).toHaveProperty('sequence.0.type', 'group');
  expect(ast).toHaveProperty('sequence.0.capturing', false);
  expect(ast).toHaveProperty('sequence.0.lookahead', 'negative');
  expect(ast).toHaveProperty('sequence.0.sequence.sequence.length', 1);
});

it('supports groups with alternates', () => {
  expect(parseTag`(${1} | ${2}) ${3}`).toMatchInlineSnapshot(`
    Object {
      "alternation": null,
      "sequence": Array [
        Object {
          "capturing": true,
          "lookahead": null,
          "quantifier": null,
          "sequence": Object {
            "alternation": Object {
              "alternation": null,
              "sequence": Array [
                Object {
                  "expression": 2,
                  "quantifier": null,
                  "type": "expression",
                },
              ],
              "type": "sequence",
            },
            "sequence": Array [
              Object {
                "expression": 1,
                "quantifier": null,
                "type": "expression",
              },
            ],
            "type": "sequence",
          },
          "type": "group",
        },
        Object {
          "expression": 3,
          "quantifier": null,
          "type": "expression",
        },
      ],
      "type": "sequence",
    }
  `);
});

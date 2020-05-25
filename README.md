<div align="center">
  <img alt="reghex" width="250" src="docs/reghex-logo.png" />
  <br />
  <br />
  <strong>
    The magical sticky regex-based parser generator
  </strong>
  <br />
  <br />
  <br />
</div>

Leveraging the power of sticky regexes and Babel code generation, `reghex` allows
you to code parsers quickly, by surrounding regular expressions with a regex-like
[DSL](https://en.wikipedia.org/wiki/Domain-specific_language).

With `reghex` you can generate a parser from a tagged template literal, which is
quick to prototype and generates reasonably compact and performant code.

_This project is still in its early stages and is experimental. Its API may still
change and some issues may need to be ironed out._

## Quick Start

##### 1. Install with yarn or npm

```sh
yarn add reghex
# or
npm install --save reghex
```

##### 2. Add the plugin to your Babel configuration (`.babelrc`, `babel.config.js`, or `package.json:babel`)

```json
{
  "plugins": ["reghex/babel"]
}
```

Alternatively, you can set up [`babel-plugin-macros`](https://github.com/kentcdodds/babel-plugin-macros) and
import `reghex` from `"reghex/macro"` instead.

##### 3. Have fun writing parsers!

```js
import match, { parse } from 'reghex';

const name = match('name')`
  ${/\w+/}
`;

parse(name)('hello');
// [ "hello", .tag = "name" ]
```

## Concepts

The fundamental concept of `reghex` are regexes, specifically
[sticky regexes](https://www.loganfranken.com/blog/831/es6-everyday-sticky-regex-matches/)!
These are regular expressions that don't search a target string, but instead match at the
specific position they're at. The flag for sticky regexes is `y` and hence
they can be created using `/phrase/y` or `new RegExp('phrase', 'y')`.

**Sticky Regexes** are the perfect foundation for a parsing framework in JavaScript!
Because they only match at a single position they can be used to match patterns
continuously, as a parser would. Like global regexes, we can then manipulate where
they should be matched by setting `regex.lastIndex = index;` and after matching
read back their updated `regex.lastIndex`.

> **Note:** Sticky Regexes aren't natively
> [supported in any versions of Internet Explorer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky#Browser_compatibility). `reghex` works around this by imitating its behaviour, which may decrease performance on IE11.

This primitive allows us to build up a parser from regexes that you pass when
authoring a parser function, also called a "matcher" in `reghex`. When `reghex` compiles
to parser code, this code is just a sequence and combination of sticky regexes that
are executed in order!

```js
let input = 'phrases should be parsed...';
let lastIndex = 0;

const regex = /phrase/y;
function matcher() {
  let match;
  // Before matching we set the current index on the RegExp
  regex.lastIndex = lastIndex;
  // Then we match and store the result
  if ((match = regex.exec(input))) {
    // If the RegExp matches successfully, we update our lastIndex
    lastIndex = regex.lastIndex;
  }
}
```

This mechanism is used in all matcher functions that `reghex` generates.
Internally `reghex` keeps track of the input string and the current index on
that string, and the matcher functions execute regexes against this state.

## Authoring Guide

You can write "matchers" by importing the default import from `reghex` and
using it to write a matcher expression.

```js
import match from 'reghex';

const name = match('name')`
  ${/\w+/}
`;
```

As can be seen above, the `match` function, which is what we've called the
default import, is called with a "node name" and is then called as a tagged
template. This template is our **parsing definition**.

`reghex` functions only with its Babel plugin, which will detect `match('name')`
and replace the entire tag with a parsing function, which may then look like
the following in your transpiled code:

```js
import { _pattern /* ... */ } from 'reghex';

var _name_expression = _pattern(/\w+/);
var name = function name() {
  /* ... */
};
```

We've now successfully created a matcher, which matches a single regex, which
is a pattern of one or more letters. We can execute this matcher by calling
it with the curried `parse` utility:

```js
import { parse } from 'reghex';

const result = parse(name)('Tim');

console.log(result); // [ "Tim", .tag = "name" ]
console.log(result.tag); // "name"
```

If the string (Here: "Tim") was parsed successfully by the matcher, it will
return an array that contains the result of the regex. The array is special
in that it will also have a `tag` property set to the matcher's name, here
`"name"`, which we determined when we defined the matcher as `match('name')`.

```js
import { parse } from 'reghex';
parse(name)('42'); // undefined
```

Similarly, if the matcher does not parse an input string successfully, it will
return `undefined` instead.

### Nested matchers

This on its own is nice, but a parser must be able to traverse a string and
turn it into an [Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree).
To introduce nesting to `reghex` matchers, we can refer to one matcher in another!
Let's extend our original example;

```js
import match from 'reghex';

const name = match('name')`
  ${/\w+/}
`;

const hello = match('hello')`
  ${/hello /} ${name}
`;
```

The new `hello` matcher is set to match `/hello /` and then attempts to match
the `name` matcher afterwards. If either of these matchers fail, it will return
`undefined` as well and roll back its changes. Using this matcher will give us
**nested abstract output**.

We can also see in this example that _outside_ of the regex interpolations,
whitespace and newlines don't matter.

```js
import { parse } from 'reghex';

parse(hello)('hello tim');
/*
  [
    "hello",
    ["tim", .tag = "name"],
    .tag = "hello"
  ]
*/
```

### Regex-like DSL

We've seen in the previous examples that matchers are authored using tagged
template literals, where interpolations can either be filled using regexes,
`${/pattern/}`, or with other matchers `${name}`.

The tagged template syntax supports more ways to match these interpolations,
using a regex-like Domain Specific Language. Unlike in regexes, whitespace
and newlines don't matter, which makes it easier to format and read matchers.

We can create **sequences** of matchers by adding multiple expressions in
a row. A matcher using `${/1/} ${/2/}` will attempt to match `1` and then `2`
in the parsed string. This is just one feature of the regex-like DSL. The
available operators are the following:

| Operator | Example            | Description                                                                                                                                                                                           |
| -------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `?`      | `${/1/}?`          | An **optional** may be used to make an interpolation optional. This means that the interpolation may or may not match.                                                                            |
| `*`      | `${/1/}*`          | A **star** can be used to match an arbitrary amount of interpolation or none at all. This means that the interpolation may repeat itself or may not be matched at all.                            |
| `+`      | `${/1/}+`          | A **plus** is used like `*` and must match one or more times. When the matcher doesn't match, that's considered a failing case, since the match isn't optional.                                       |
| `\|`     | `${/1/} \| ${/2/}` | An **alternation** can be used to match either one thing or another, falling back when the first interpolation fails.                                                                                 |
| `()`     | `(${/1/} ${/2/})+` | A **group** can be used to apply one of the other operators to an entire group of interpolations.                                                                                                        |
| `(?: )`  | `(?: ${/1/})`      | A **non-capturing group** is like a regular group, but the interpolations matched inside it don't appear in the parser's output.                                                         |
| `(?= )`  | `(?= ${/1/})`      | A **positive lookahead** checks whether interpolations match, and if so continues the matcher without changing the input. If it matches, it's essentially ignored.                             |
| `(?! )`  | `(?! ${/1/})`      | A **negative lookahead** checks whether interpolations _don't_ match, and if so continues the matcher without changing the input. If the interpolations do match the matcher is aborted. |

We can combine and compose these operators to create more complex matchers.
For instance, we can extend the original example to only allow a specific set
of names by using the `|` operator:

```js
const name = match('name')`
  ${/tim/} | ${/tom/} | ${/tam/}
`;

parse(name)('tim'); // [ "tim", .tag = "name" ]
parse(name)('tom'); // [ "tom", .tag = "name" ]
parse(name)('patrick'); // undefined
```

The above will now only match specific name strings. When one pattern in this
chain of **alternations** does not match, it will try the next one.

We can also use **groups** to add more matchers around the alternations themselves,
by surrounding the alternations with `(` and `)`

```js
const name = match('name')`
  (${/tim/} | ${/tom/}) ${/!/}
`;

parse(name)('tim!'); // [ "tim", "!", .tag = "name" ]
parse(name)('tom!'); // [ "tom", "!", .tag = "name" ]
parse(name)('tim'); // undefined
```

Maybe we're also not that interested in the `"!"` showing up in the output node.
If we want to get rid of it, we can use a **non-capturing group** to hide it,
while still requiring it.

```js
const name = match('name')`
  (${/tim/} | ${/tom/}) (?: ${/!/})
`;

parse(name)('tim!'); // [ "tim", .tag = "name" ]
parse(name)('tim'); // undefined
```

Lastly, like with regexes, `?`, `*`, and `+` may be used as "quantifiers". The first two
may also be optional and _not_ match their patterns without the matcher failing.
The `+` operator is used to match an interpolation _one or more_ times, while the
`*` operators may match _zero or more_ times. Let's use this to allow the `"!"`
to repeat.

```js
const name = match('name')`
  (${/tim/} | ${/tom/})+ (?: ${/!/})*
`;

parse(name)('tim!'); // [ "tim", .tag = "name" ]
parse(name)('tim!!!!'); // [ "tim", .tag = "name" ]
parse(name)('tim'); // [ "tim", .tag = "name" ]
parse(name)('timtim'); // [ "tim", tim", .tag = "name" ]
```

As we can see from the above, like in regexes, quantifiers can be combined with groups,
non-capturing groups, or other groups.

### Transforming as we match

In the previous sections, we've seen that the **nodes** that `reghex` outputs are arrays containing
match strings or other nodes and have a special `tag` property with the node's type.
We can **change this output** while we're parsing by passing a function to our matcher definition.

```js
const name = match('name', (x) => x[0])`
  (${/tim/} | ${/tom/}) ${/!/}
`;

parse(name)('tim'); // "tim"
```

In the above example, we're passing a small function, `x => x[0]` to the matcher as a
second argument. This will change the matcher's output, which causes the parser to
now return a new output for this matcher.

We can use this function creatively by outputting full AST nodes, maybe even like the
ones that resemble Babel's output:

```js
const identifier = match('identifier', (x) => ({
  type: 'Identifier',
  name: x[0],
}))`
  ${/[\w_][\w\d_]+/}
`;

parse(name)('var_name'); // { type: "Identifier", name: "var_name" }
```

We've now entirely changed the output of the parser for this matcher. Given that each
matcher can change its output, we're free to change the parser's output entirely.
By **returning a falsy value** in this matcher, we can also change the matcher to not have
matched, which would cause other matchers to treat it like a mismatch!

```js
import match, { parse } from 'reghex';

const name = match('name')((x) => {
  return x[0] !== 'tim' ? x : undefined;
})`
  ${/\w+/}
`;

const hello = match('hello')`
  ${/hello /} ${name}
`;

parse(name)('tom'); // ["hello", ["tom", .tag = "name"], .tag = "hello"]
parse(name)('tim'); // undefined
```

Lastly, if we need to create these special array nodes ourselves, we can use `reghex`'s
`tag` export for this purpose.

```js
import { tag } from 'reghex';

tag(['test'], 'node_name');
// ["test", .tag = "node_name"]
```

**That's it! May the RegExp be ever in your favor.**

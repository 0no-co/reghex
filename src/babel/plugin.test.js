import { transform } from '@babel/core';
import reghexPlugin from './plugin';

it('works with standard features', () => {
  const code = `
    import { match } from 'reghex/macro';

    const node = match('node')\`
      \${1}+ | \${2}+ (\${3} ( \${4}? \${5} ) )*
    \`;
  `;

  expect(
    transform(code, { babelrc: false, presets: [], plugins: [reghexPlugin] })
      .code
  ).toMatchSnapshot();
});

it('works while only minifying', () => {
  const code = `
    import { match } from 'reghex/macro';

    const node = match('node')\`
      \${1}+ | \${2}+ (\${3} ( \${4}? \${5} ) )*
    \`;
  `;

  expect(
    transform(code, {
      babelrc: false,
      presets: [],
      plugins: [[reghexPlugin, { codegen: false }]],
    }).code
  ).toMatchSnapshot();
});

it('works with local recursion', () => {
  // NOTE: A different default name is allowed
  const code = `
    import { match as m, tag } from 'reghex';

    const inner = m('inner')\`
      \${/inner/}
    \`;

    const node = m('node')\`
      \${inner}
    \`;
  `;

  expect(
    transform(code, { babelrc: false, presets: [], plugins: [reghexPlugin] })
      .code
  ).toMatchSnapshot();
});

it('works with self-referential thuns', () => {
  const code = `
    import { match, tag } from 'reghex';

    const inner = m('inner')\`
      \${() => node}
    \`;

    const node = m('node')\`
      \${inner}
    \`;
  `;

  expect(
    transform(code, { babelrc: false, presets: [], plugins: [reghexPlugin] })
      .code
  ).toMatchSnapshot();
});

it('works with transform functions', () => {
  const code = `
    import { match } from 'reghex';

    const first = match('inner', x => x)\`\`;

    const transform = x => x;
    const second = match('node', transform)\`\`;
  `;

  expect(
    transform(code, { babelrc: false, presets: [], plugins: [reghexPlugin] })
      .code
  ).toMatchSnapshot();
});

it('works with non-capturing groups', () => {
  const code = `
    import { match } from 'reghex';

    const node = match('node')\`
      \${1} (\${2} | (?: \${3})+)
    \`;
  `;

  expect(
    transform(code, { babelrc: false, presets: [], plugins: [reghexPlugin] })
      .code
  ).toMatchSnapshot();
});

it('works together with @babel/plugin-transform-modules-commonjs', () => {
  const code = `
    import { match } from 'reghex';

    const node = match('node')\`
      \${1} \${2}
    \`;
  `;

  expect(
    transform(code, {
      babelrc: false,
      presets: [],
      plugins: [
        reghexPlugin,
        [
          '@babel/plugin-transform-modules-commonjs',
          {
            noInterop: true,
            loose: true,
          },
        ],
      ],
    }).code
  ).toMatchSnapshot();
});

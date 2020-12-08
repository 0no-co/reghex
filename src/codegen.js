export const _exec = '_exec';
const _state = 'state';
const _node = 'node';
const _match = 'x';

let _interpolations = 0;

function js(/* arguments */) {
  let body = arguments[0][0];
  for (let i = 1; i < arguments.length; i++)
    body = body + arguments[i] + arguments[0][i];
  return body.trim();
}

const copy = (prev) => {
  const next = {};
  for (const key in prev) next[key] = prev[key];
  return next;
};

const assignIndex = (depth) =>
  js`var y${depth} = ${_state}.y` +
  (_interpolations ? js`, var x${depth} = ${_state}.x;` : ';');

const restoreIndex = (depth) =>
  js`${_state}.y = y${depth}` +
  (_interpolations ? js`, ${_state}.x = x${depth};` : ';');

const astExpression = (ast, depth, opts) => {
  const restoreLength =
    (opts.length && opts.abort && js`${_node}.length = ln${opts.length};`) ||
    '';

  const abort = js`
    ${opts.onAbort}
    ${restoreIndex(opts.index)}
    ${restoreLength}
    ${opts.abort}
  `;

  const expression = ast.expression.fn
    ? `${ast.expression.id}(${_state})`
    : `${_exec}(${_state}, ${ast.expression.id})`;

  if (!opts.capture) {
    return js`
      if (!${expression}) {
        ${abort}
      }
    `;
  }

  return js`
    if (${_match} = ${expression}) {
      ${_node}.push(${_match});
    } else {
      ${abort}
    }
  `;
};

const astGroup = (ast, depth, opts) => {
  const capture = !!opts.capture && !ast.capture;

  opts = copy(opts);
  opts.capture = capture;

  let group = '';
  if (!opts.length && capture) {
    opts.length = depth;
    return js`
      ${js`var ln${depth} = ${_node}.length;`}
      ${astSequence(ast.sequence, depth + 1, opts)}
    `;
  }

  return astSequence(ast.sequence, depth + 1, opts);
};

const astChild = (ast, depth, opts) =>
  ast.expression ? astExpression(ast, depth, opts) : astGroup(ast, depth, opts);

const astQuantifier = (ast, depth, opts) => {
  const { index, abort, onAbort } = opts;
  const invert = `inv_${depth}`;
  const loop = `loop_${depth}`;
  const count = `j${depth}`;

  opts = copy(opts);
  if (ast.capture === '!') {
    opts.index = depth;
    opts.abort = js`break ${invert}`;
  }

  let child;
  if (ast.quantifier === '+') {
    opts.onAbort = js`
      if (${count}) {
        ${restoreIndex(depth)}
        break ${loop};
      } else {
        ${onAbort}
      }
    `;

    child = js`
      ${loop}: for (var ${count} = 0; 1; ${count}++) {
        ${assignIndex(depth)}
        ${astChild(ast, depth, opts)}
      }
    `;
  } else if (ast.quantifier === '*') {
    opts.length = 0;
    opts.index = depth;
    opts.abort = js`break ${loop};`;
    opts.onAbort = '';

    child = js`
      ${loop}: for (;;) {
        ${assignIndex(depth)}
        ${astChild(ast, depth, opts)}
      }
    `;
  } else if (ast.quantifier === '?') {
    opts.index = depth;
    opts.abort = '';
    opts.onAbort = '';

    child = js`
      ${assignIndex(depth)}
      ${astChild(ast, depth, opts)}
    `;
  } else {
    child = astChild(ast, depth, opts);
  }

  if (ast.capture === '!') {
    return js`
      ${invert}: {
        ${assignIndex(depth)}
        ${child}
        ${restoreIndex(index)}
        ${abort}
      }
    `;
  } else if (ast.capture === '=') {
    return js`
      ${assignIndex(depth)}
      ${child}
      ${restoreIndex(depth)}
    `;
  } else {
    return child;
  }
};

const astSequence = (ast, depth, opts) => {
  const alternation = ast.alternation ? `alt_${depth}` : '';

  let body = '';
  for (; ast; ast = ast.alternation) {
    const block = `block_${depth}`;

    let childOpts = opts;
    if (ast.alternation) {
      childOpts = copy(opts);
      childOpts.index = depth;
      childOpts.abort = js`break ${block};`;
      childOpts.onAbort = '';
    }

    let sequence = '';
    for (let i = 0; i < ast.length; i++)
      sequence += astQuantifier(ast[i], depth, childOpts);

    if (!ast.alternation) {
      body += sequence;
    } else {
      body += js`
        ${block}: {
          ${assignIndex(depth)}
          ${sequence}
          break ${alternation};
        }
      `;
    }
  }

  if (!alternation) return body;

  return js`
    ${alternation}: {
      ${body}
    }
  `;
};

const astRoot = (ast, name, transform, interpolations) => {
  _interpolations = interpolations;

  return js`
    (function (${_state}) {
      ${assignIndex(1)}
      var ${_node} = [];
      var ${_match};

      ${astSequence(ast, 2, {
        interpolations,
        index: 1,
        length: 0,
        onAbort: '',
        abort: js`return;`,
        capture: true,
      })}

      ${_node}.tag = ${name};
      return ${transform ? js`(${transform})(${_node})` : _node};
    })
  `;
};

export { astRoot };

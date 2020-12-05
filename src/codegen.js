const _state = 'state';
const _match = 'match';
const _node = 'node';

function js(/* arguments */) {
  let body = arguments[0][0];
  for (let i = 1; i < arguments.length; i++)
    body = body + arguments[i] + arguments[0][i];
  return body.trim();
}

const newOpts = (prev, next) => ({
  index: next.index != null ? next.index : prev.index,
  length: next.length != null ? next.length : prev.length,
  onAbort: next.onAbort != null ? next.onAbort : prev.onAbort,
  abort: next.abort != null ? next.abort : prev.abort,
  capture: next.capture != null ? next.capture : prev.capture,
});

const assignIndex = (depth) =>
  depth ? js`var index_${depth} = ${_state}.index;` : '';

const restoreIndex = (depth) =>
  depth ? js`${_state}.index = index_${depth};` : '';

const abortOnCondition = (condition, hooks) => js`
  if (${condition}) {
    ${restoreIndex(opts.index)}
    ${opts.abort || ''}
  } else {
    ${opts.onAbort || ''}
  }
`;

const astExpression = (ast, depth, opts) => {
  const restoreLength =
    opts.length &&
    opts.abort &&
    js`
    ${_node}.length = length_${opts.length};
  `;

  const abort = js`
    ${opts.onAbort || ''}
    ${restoreIndex(opts.index)}
    ${restoreLength || ''}
    ${opts.abort || ''}
  `;

  if (!opts.capture) {
    return js`
      if (!(${ast.expression})) {
        ${abort}
      }
    `;
  }

  return js`
    if (${_match} = ${ast.expression}) {
      ${_node}.push(${_match});
    } else {
      ${abort}
    }
  `;
};

const astGroup = (ast, depth, opts) => {
  if (ast.sequence.length === 1)
    return astExpression(ast.sequence[0], depth, opts);

  const capture = !!opts.capture && !ast.capture;

  let group = '';
  if (!opts.length && capture) {
    return js`
      ${js`var length_${depth} = ${_node}.length;`}
      ${astSequence(
        ast.sequence,
        depth + 1,
        newOpts(opts, {
          length: depth,
          capture,
        })
      )}
    `;
  }

  return astSequence(
    ast.sequence,
    depth + 1,
    newOpts(opts, {
      capture,
    })
  );
};

const astChild = (ast, depth, opts) =>
  ast.type === 'expression'
    ? astExpression(ast, depth, opts)
    : astGroup(ast, depth, opts);

const astRepeating = (ast, depth, opts) => {
  const label = `loop_${depth}`;
  const count = `count_${depth}`;
  return js`
    ${label}: for (var ${count} = 0; true; ${count}++) {
      ${assignIndex(depth)}
      ${astChild(
        ast,
        depth,
        newOpts(opts, {
          onAbort: js`
          if (${count}) {
            ${restoreIndex(depth)}
            break ${label};
          } else {
            ${opts.onAbort || ''}
          }
        `,
        })
      )}
    }
  `;
};

const astMultiple = (ast, depth, opts) => {
  const label = `loop_${depth}`;
  return js`
    ${label}: while (true) {
      ${assignIndex(depth)}
      ${astChild(
        ast,
        depth,
        newOpts(opts, {
          length: 0,
          index: depth,
          abort: js`break ${label};`,
          onAbort: '',
        })
      )}
    }
  `;
};

const astOptional = (ast, depth, opts) => js`
  ${assignIndex(depth)}
  ${astChild(
    ast,
    depth,
    newOpts(opts, {
      index: depth,
      abort: '',
      onAbort: '',
    })
  )}
`;

const astQuantifier = (ast, depth, opts) => {
  const { index, abort } = opts;
  const label = `invert_${depth}`;

  if (ast.capture === '!') {
    opts = newOpts(opts, {
      index: depth,
      abort: js`break ${label};`,
    });
  }

  let child;
  if (ast.quantifier === '+') {
    child = astRepeating(ast, depth, opts);
  } else if (ast.quantifier === '*') child = astMultiple(ast, depth, opts);
  else if (ast.quantifier === '?') child = astOptional(ast, depth, opts);
  else child = astChild(ast, depth, opts);

  if (ast.capture === '!') {
    return js`
      ${label}: {
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
  const alternation = ast.alternation ? `alternation_${depth}` : '';

  let body = '';
  for (; ast; ast = ast.alternation) {
    const block = `block_${depth}`;

    let childOpts = opts;
    if (ast.alternation) {
      childOpts = newOpts(opts, {
        index: depth,
        abort: js`break ${block};`,
        onAbort: '',
      });
    }

    let sequence = '';
    for (let i = 0; i < ast.sequence.length; i++)
      sequence += astQuantifier(ast.sequence[i], depth, childOpts);

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

const astRoot = (ast, name, transform) => js`
  (function (${_state}) {
    ${assignIndex(1)}
    var ${_node} = [];
    var ${_match};

    ${astSequence(ast, 2, {
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

export { astRoot };

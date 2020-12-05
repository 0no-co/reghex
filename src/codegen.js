const _state = 'state';
const _match = 'match';
const _node = 'node';

function js(/* arguments */) {
  let body = arguments[0][0];
  for (let i = 1; i < arguments.length; i++)
    body = body + arguments[i] + arguments[0][i];
  return body.trim();
}

const assignIndex = (depth) =>
  depth ? js`var index_${depth} = ${_state}.index;` : '';

const restoreIndex = (depth) =>
  depth ? js`${_state}.index = index_${depth};` : '';

const abortOnCondition = (condition, hooks) => js`
  if (${condition}) {
    ${restoreIndex(opts.index)}
    ${opts.abort}
  } else {
    ${opts.onAbort}
  }
`;

const astExpression = (ast, depth, opts) => {
  const abort = js`
    ${opts.onAbort}
    ${restoreIndex(opts.index)}
    ${
      opts.length && opts.abort
        ? js`
      ${_node}.length = length_${opts.length};
    `
        : ''
    }
    ${opts.abort || ''}
  `;

  if (!opts.capturing) {
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

  const capturing = !!opts.capturing && !!ast.capturing;

  let group = '';
  if (!opts.length && capturing) {
    return js`
      ${js`var length_${depth} = ${_node}.length;`}
      ${astAlternation(ast.sequence, depth + 1, {
        ...opts,
        length: depth,
        capturing,
      })}
    `;
  }

  return astAlternation(ast.sequence, depth + 1, {
    ...opts,
    capturing,
  });
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
      ${astChild(ast, depth, {
        ...opts,
        onAbort: js`
          if (${count}) {
            ${restoreIndex(depth)}
            break ${label};
          } else {
            ${opts.onAbort}
          }
        `,
      })}
    }
  `;
};

const astMultiple = (ast, depth, opts) => {
  const label = `loop_${depth}`;
  return js`
    ${label}: while (true) {
      ${assignIndex(depth)}
      ${astChild(ast, depth, {
        ...opts,
        length: 0,
        index: depth,
        abort: js`break ${label};`,
        onAbort: '',
      })}
    }
  `;
};

const astOptional = (ast, depth, opts) => js`
  ${assignIndex(depth)}
  ${astChild(ast, depth, {
    ...opts,
    index: depth,
    abort: '',
    onAbort: '',
  })}
`;

const astQuantifier = (ast, depth, opts) => {
  const { index, abort } = opts;
  const label = `invert_${depth}`;

  if (ast.lookahead === 'negative') {
    opts = {
      ...opts,
      index: depth,
      abort: js`break ${label};`,
    };
  }

  let child;
  if (ast.quantifier === 'repeating') {
    child = astRepeating(ast, depth, opts);
  } else if (ast.quantifier === 'multiple')
    child = astMultiple(ast, depth, opts);
  else if (ast.quantifier === 'optional') child = astOptional(ast, depth, opts);
  else child = astChild(ast, depth, opts);

  if (ast.lookahead === 'negative') {
    return js`
      ${label}: {
        ${assignIndex(depth)}
        ${child}
        ${restoreIndex(index)}
        ${abort}
      }
    `;
  } else if (ast.lookahead) {
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
  const block = `block_${depth}`;
  const alternation = `alternation_${depth}`;

  if (ast.alternation) {
    opts = {
      ...opts,
      index: depth,
      abort: js`break ${block};`,
      onAbort: '',
    };
  }

  let sequence = '';
  for (let i = 0; i < ast.sequence.length; i++)
    sequence += astQuantifier(ast.sequence[i], depth, opts);

  if (!ast.alternation) {
    return sequence;
  }

  return js`
    ${block}: {
      ${assignIndex(depth)}
      ${sequence}
      break ${alternation};
    }
  `;
};

const astAlternation = (ast, depth, opts) => {
  if (!ast.alternation) return astSequence(ast, depth, opts);

  let sequence = '';
  for (let child = ast; child; child = child.alternation)
    sequence += astSequence(child, depth, opts);

  return js`
    alternation_${depth}: {
      ${sequence}
    }
  `;
};

const astRoot = (ast, name, transform) => js`
  (function (${_state}) {
    ${assignIndex(1)}
    var ${_node} = [];
    var ${_match};

    ${astAlternation(ast, 2, {
      index: 1,
      length: 0,
      onAbort: '',
      abort: js`return;`,
      capturing: true,
    })}

    ${_node}.tag = ${name};
    return ${transform ? js`(${transform})(${_node})` : _node};
  })
`;

export { astRoot };

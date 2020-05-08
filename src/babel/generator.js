let t;
let ids = {};

export function initGenerator(_ids, _t) {
  ids = _ids;
  t = _t;
}

/** var id = getLastIndex(); */
class AssignIndexNode {
  constructor(id) {
    this.id = id;
  }

  statement() {
    const call = t.callExpression(ids.getLastIndex, []);
    return t.variableDeclaration('var', [t.variableDeclarator(this.id, call)]);
  }
}

/** setLastIndex(id); */
class RestoreIndexNode {
  constructor(id) {
    this.id = id;
  }

  statement() {
    const expression = t.callExpression(ids.setLastIndex, [this.id]);
    return t.expressionStatement(expression);
  }
}

/** var id = node.length; */
class AssignLengthNode {
  constructor(id) {
    this.id = id;
  }

  statement() {
    return t.variableDeclaration('var', [
      t.variableDeclarator(
        this.id,
        t.memberExpression(ids.node, t.identifier('length'))
      ),
    ]);
  }
}

/** node.length = id; */
class RestoreLengthNode {
  constructor(id) {
    this.id = id;
  }

  statement() {
    const expression = t.assignmentExpression(
      '=',
      t.memberExpression(ids.node, t.identifier('length')),
      this.id
    );

    return t.expressionStatement(expression);
  }
}

/** return; break id; */
class AbortNode {
  constructor(id) {
    this.id = id || null;
  }

  statement() {
    const statement = this.id ? t.breakStatement(this.id) : t.returnStatement();
    return statement;
  }
}

/** if (condition) { return; break id; } */
class AbortConditionNode {
  constructor(condition, opts) {
    this.condition = condition || null;

    this.abort = opts.abort;
    this.abortCondition = opts.abortCondition || null;
    this.restoreIndex = opts.restoreIndex;
  }

  statement() {
    return t.ifStatement(
      this.condition,
      t.blockStatement(
        [this.restoreIndex.statement(), this.abort.statement()].filter(Boolean)
      ),
      this.abortCondition ? this.abortCondition.statement() : null
    );
  }
}

/** Generates a full matcher for an expression */
class ExpressionNode {
  constructor(ast, depth, opts) {
    this.ast = ast;
    this.depth = depth || 0;
    this.capturing = !!opts.capturing;
    this.restoreIndex = opts.restoreIndex;
    this.restoreLength = opts.restoreLength || null;
    this.abortCondition = opts.abortCondition || null;
    this.abort = opts.abort || null;
  }

  statements() {
    const execMatch = this.ast.expression;
    const assignMatch = t.assignmentExpression('=', ids.match, execMatch);

    const successNodes = t.blockStatement([
      t.expressionStatement(
        t.callExpression(t.memberExpression(ids.node, t.identifier('push')), [
          ids.match,
        ])
      ),
    ]);

    const abortNodes = t.blockStatement(
      [
        this.abortCondition && this.abortCondition.statement(),
        this.abort && this.restoreLength && this.restoreLength.statement(),
        this.restoreIndex && this.restoreIndex.statement(),
        this.abort && this.abort.statement(),
      ].filter(Boolean)
    );

    return [
      !this.capturing
        ? t.ifStatement(t.unaryExpression('!', execMatch), abortNodes)
        : t.ifStatement(assignMatch, successNodes, abortNodes),
    ];
  }
}

/** Generates a full matcher for a group */
class GroupNode {
  constructor(ast, depth, opts) {
    this.ast = ast;
    this.depth = depth || 0;
    if (ast.sequence.length === 1) {
      return new ExpressionNode(ast.sequence[0], depth, opts);
    }

    const lengthId = t.identifier(`length_${depth}`);
    const childOpts = {
      ...opts,
      capturing: !!opts.capturing && !!ast.capturing,
    };

    this.assignLength = null;
    if (!childOpts.restoreLength && childOpts.capturing) {
      this.assignLength = new AssignLengthNode(lengthId);
      childOpts.restoreLength = new RestoreLengthNode(lengthId);
    }

    this.alternation = new AlternationNode(ast.sequence, depth + 1, childOpts);
  }

  statements() {
    return [
      this.assignLength && this.assignLength.statement(),
      ...this.alternation.statements(),
    ].filter(Boolean);
  }
}

/** Generates looping logic around another group or expression matcher */
class QuantifierNode {
  constructor(ast, depth, opts) {
    const { quantifier } = ast;
    this.ast = ast;
    this.depth = depth || 0;

    const invertId = t.identifier(`invert_${this.depth}`);
    const loopId = t.identifier(`loop_${this.depth}`);
    const iterId = t.identifier(`iter_${this.depth}`);
    const indexId = t.identifier(`index_${this.depth}`);
    const ChildNode = ast.type === 'group' ? GroupNode : ExpressionNode;
    const childOpts = { ...opts };

    this.assignIndex = null;
    this.restoreIndex = null;
    this.blockId = null;
    this.abort = null;
    if (ast.type === 'group' && !!ast.lookahead) {
      this.restoreIndex = new RestoreIndexNode(indexId);
      this.assignIndex = new AssignIndexNode(indexId);
      childOpts.restoreIndex = null;
    }

    if (ast.type === 'group' && ast.lookahead === 'negative') {
      this.blockId = invertId;
      this.abort = opts.abort;
      childOpts.abort = new AbortNode(invertId);
    }

    if (quantifier && !quantifier.singular && quantifier.required) {
      childOpts.abortCondition = new AbortConditionNode(iterId, {
        ...opts,
        restoreIndex: new RestoreIndexNode(indexId),
        abort: new AbortNode(loopId),
      });
    } else if (quantifier && !quantifier.singular) {
      childOpts.restoreLength = null;
      childOpts.restoreIndex = new RestoreIndexNode(indexId);
      childOpts.abort = new AbortNode(loopId);
      childOpts.abortCondition = null;
    } else if (quantifier && !quantifier.required) {
      childOpts.restoreIndex = new RestoreIndexNode(indexId);
      childOpts.abortCondition = null;
      childOpts.abort = null;
    }

    this.childNode = new ChildNode(ast, depth, childOpts);
  }

  statements() {
    const { quantifier } = this.ast;
    const loopId = t.identifier(`loop_${this.depth}`);
    const iterId = t.identifier(`iter_${this.depth}`);
    const indexId = t.identifier(`index_${this.depth}`);
    const getLastIndex = t.callExpression(ids.getLastIndex, []);

    let statements;
    if (quantifier && !quantifier.singular && quantifier.required) {
      statements = [
        t.labeledStatement(
          loopId,
          t.forStatement(
            t.variableDeclaration('var', [
              t.variableDeclarator(iterId, t.numericLiteral(0)),
            ]),
            t.booleanLiteral(true),
            t.updateExpression('++', iterId),
            t.blockStatement([
              t.variableDeclaration('var', [
                t.variableDeclarator(indexId, getLastIndex),
              ]),
              ...this.childNode.statements(),
            ])
          )
        ),
      ];
    } else if (quantifier && !quantifier.singular) {
      statements = [
        t.labeledStatement(
          loopId,
          t.whileStatement(
            t.booleanLiteral(true),
            t.blockStatement([
              t.variableDeclaration('var', [
                t.variableDeclarator(indexId, getLastIndex),
              ]),
              ...this.childNode.statements(),
            ])
          )
        ),
      ];
    } else if (quantifier && !quantifier.required) {
      statements = [
        t.variableDeclaration('var', [
          t.variableDeclarator(indexId, getLastIndex),
        ]),
        ...this.childNode.statements(),
      ];
    } else {
      statements = this.childNode.statements();
    }

    if (this.restoreIndex && this.assignIndex) {
      statements.unshift(this.assignIndex.statement());
      statements.push(this.restoreIndex.statement());
    }

    if (this.blockId) {
      statements = [
        t.labeledStatement(
          this.blockId,
          t.blockStatement([...statements, this.abort.statement()])
        ),
      ];
    }

    return statements;
  }
}

/** Generates a matcher of a sequence of sub-matchers for a single sequence */
class SequenceNode {
  constructor(ast, depth, opts) {
    this.ast = ast;
    this.depth = depth || 0;

    const indexId = t.identifier(`index_${depth}`);
    const blockId = t.identifier(`block_${this.depth}`);

    this.returnStatement = opts.returnStatement;
    this.assignIndex = ast.alternation ? new AssignIndexNode(indexId) : null;

    this.quantifiers = ast.sequence.map((childAst) => {
      return new QuantifierNode(childAst, depth, {
        ...opts,
        restoreIndex: ast.alternation
          ? new RestoreIndexNode(indexId)
          : opts.restoreIndex,
        abortCondition: ast.alternation ? null : opts.abortCondition,
        abort: ast.alternation ? new AbortNode(blockId) : opts.abort,
      });
    });
  }

  statements() {
    const blockId = t.identifier(`block_${this.depth}`);
    const alternationId = t.identifier(`alternation_${this.depth}`);
    const statements = this.quantifiers.reduce((block, node) => {
      block.push(...node.statements());
      return block;
    }, []);

    if (!this.ast.alternation) {
      return statements;
    }

    const abortNode =
      this.depth === 0 ? this.returnStatement : t.breakStatement(alternationId);

    return [
      t.labeledStatement(
        blockId,
        t.blockStatement([
          this.assignIndex && this.assignIndex.statement(),
          ...statements,
          abortNode,
        ])
      ),
    ];
  }
}

/** Generates matchers for sequences with (or without) alternations */
class AlternationNode {
  constructor(ast, depth, opts) {
    this.ast = ast;
    this.depth = depth || 0;
    this.sequences = [];
    for (let current = ast; current; current = current.alternation) {
      this.sequences.push(new SequenceNode(current, depth, opts));
    }
  }

  statements() {
    if (this.sequences.length === 1) {
      return this.sequences[0].statements();
    }

    const statements = [];
    for (let i = 0; i < this.sequences.length; i++) {
      statements.push(...this.sequences[i].statements());
    }

    if (this.depth === 0) {
      return statements;
    }

    const alternationId = t.identifier(`alternation_${this.depth}`);
    return [t.labeledStatement(alternationId, t.blockStatement(statements))];
  }
}

export class RootNode {
  constructor(ast, nameNode, transformNode) {
    const indexId = t.identifier('last_index');

    this.returnStatement = t.returnStatement(
      transformNode ? t.callExpression(transformNode, [ids.node]) : ids.node
    );

    this.nameNode = nameNode;
    this.node = new AlternationNode(ast, 0, {
      returnStatement: this.returnStatement,
      restoreIndex: new RestoreIndexNode(indexId, true),
      restoreLength: null,
      abortCondition: null,
      abort: new AbortNode(),
      capturing: true,
    });
  }

  statements() {
    const indexId = t.identifier('last_index');
    const getLastIndex = t.callExpression(ids.getLastIndex, []);

    return [
      t.variableDeclaration('var', [
        t.variableDeclarator(ids.match),
        t.variableDeclarator(indexId, getLastIndex),
        t.variableDeclarator(
          ids.node,
          t.callExpression(ids.tag, [t.arrayExpression(), this.nameNode])
        ),
      ]),
      ...this.node.statements(),
      this.returnStatement,
    ];
  }
}

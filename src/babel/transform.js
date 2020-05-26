import { parse } from '../parser';
import { SharedIds } from './sharedIds';
import { initGenerator, RootNode } from './generator';

export function makeHelpers(t) {
  const regexPatternsRe = /^[()\[\]|.+?*]|[^\\][()\[\]|.+?*$^]|\\[wdsWDS]/;
  const importSourceRe = /reghex$|^reghex\/macro/;
  const importName = 'reghex';
  const ids = new SharedIds(t);
  initGenerator(ids, t);

  let _hasUpdatedImport = false;

  return {
    /** Adds the reghex import declaration to the Program scope */
    updateImport(path) {
      if (_hasUpdatedImport) return;
      if (!importSourceRe.test(path.node.source.value)) return;
      _hasUpdatedImport = true;

      const defaultSpecifierIndex = path.node.specifiers.findIndex((node) => {
        return t.isImportDefaultSpecifier(node);
      });

      if (defaultSpecifierIndex > -1) {
        path.node.specifiers.splice(defaultSpecifierIndex, 1);
      }

      if (path.node.source.value !== importName) {
        path.node.source = t.stringLiteral(importName);
      }

      path.node.specifiers.push(
        t.importSpecifier(
          (ids.execId = path.scope.generateUidIdentifier('exec')),
          t.identifier('_exec')
        ),
        t.importSpecifier(
          (ids.substrId = path.scope.generateUidIdentifier('substr')),
          t.identifier('_substr')
        ),
        t.importSpecifier(
          (ids.patternId = path.scope.generateUidIdentifier('pattern')),
          t.identifier('_pattern')
        )
      );

      const tagImport = path.node.specifiers.find((node) => {
        return t.isImportSpecifier(node) && node.imported.name === 'tag';
      });
      if (!tagImport) {
        path.node.specifiers.push(
          t.importSpecifier(
            (ids.tagId = path.scope.generateUidIdentifier('tag')),
            t.identifier('tag')
          )
        );
      } else {
        ids.tagId = tagImport.imported;
      }
    },

    /** Determines whether the given tagged template expression is a reghex match */
    isMatch(path) {
      if (
        t.isTaggedTemplateExpression(path.node) &&
        t.isCallExpression(path.node.tag) &&
        t.isIdentifier(path.node.tag.callee) &&
        path.scope.hasBinding(path.node.tag.callee.name)
      ) {
        if (t.isVariableDeclarator(path.parentPath))
          path.parentPath._isMatch = true;
        return true;
      }

      return (
        t.isVariableDeclarator(path.parentPath) && path.parentPath._isMatch
      );
    },

    /** Given a reghex match, returns the path to reghex's match import declaration */
    getMatchImport(path) {
      t.assertTaggedTemplateExpression(path.node);
      const binding = path.scope.getBinding(path.node.tag.callee.name);

      if (
        binding.kind !== 'module' ||
        !t.isImportDeclaration(binding.path.parent) ||
        !importSourceRe.test(binding.path.parent.source.value) ||
        !t.isImportDefaultSpecifier(binding.path.node)
      ) {
        return null;
      }

      return binding.path.parentPath;
    },

    /** Given a match, returns an evaluated name or a best guess */
    getMatchName(path) {
      t.assertTaggedTemplateExpression(path.node);
      const nameArgumentPath = path.get('tag.arguments.0');
      const { confident, value } = nameArgumentPath.evaluate();
      if (!confident && t.isIdentifier(nameArgumentPath.node)) {
        return nameArgumentPath.node.name;
      } else if (confident && typeof value === 'string') {
        return value;
      } else {
        return path.scope.generateUidIdentifierBasedOnNode(path.node);
      }
    },

    /** Given a match, hoists its expressions in front of the match's statement */
    _prepareExpressions(path) {
      t.assertTaggedTemplateExpression(path.node);

      const variableDeclarators = [];
      const matchName = this.getMatchName(path);

      const hoistedExpressions = path.node.quasi.expressions.map(
        (expression, i) => {
          if (
            t.isIdentifier(expression) &&
            path.scope.hasBinding(expression.name)
          ) {
            const binding = path.scope.getBinding(expression.name);
            if (t.isVariableDeclarator(binding.path.node)) {
              const matchPath = binding.path.get('init');
              if (this.isMatch(matchPath)) return expression;
            }
          } else if (
            t.isRegExpLiteral(expression) &&
            !regexPatternsRe.test(expression.pattern)
          ) {
            // NOTE: This is an optimisation path, where the pattern regex is inlined
            // and has determined to be "simple" enough to be turned into a string
            return t.stringLiteral(
              expression.pattern.replace(/\\./g, (x) => x[1])
            );
          }

          const id = path.scope.generateUidIdentifier(
            `${matchName}_expression`
          );

          variableDeclarators.push(
            t.variableDeclarator(
              id,
              t.callExpression(ids.pattern, [expression])
            )
          );

          return id;
        }
      );

      if (variableDeclarators.length) {
        path
          .getStatementParent()
          .insertBefore(t.variableDeclaration('var', variableDeclarators));
      }

      return hoistedExpressions.map((id) => {
        // Use _substr helper instead if the expression is a string
        if (t.isStringLiteral(id)) {
          return t.callExpression(ids.substr, [ids.state, id]);
        }

        // Directly call expression if it's sure to be another matcher
        const binding = path.scope.getBinding(id.name);
        if (binding && t.isVariableDeclarator(binding.path.node)) {
          const matchPath = binding.path.get('init');
          if (this.isMatch(matchPath)) {
            return t.callExpression(id, [ids.state]);
          }
        }

        return t.callExpression(ids.exec, [ids.state, id]);
      });
    },

    _prepareTransform(path) {
      const transformNode = path.node.tag.arguments[1];
      if (!transformNode) return null;
      if (t.isIdentifier(transformNode)) return transformNode;

      const matchName = this.getMatchName(path);
      const id = path.scope.generateUidIdentifier(`${matchName}_transform`);
      const declarator = t.variableDeclarator(id, transformNode);

      path
        .getStatementParent()
        .insertBefore(t.variableDeclaration('var', [declarator]));
      return id;
    },

    transformMatch(path) {
      if (!path.node.tag.arguments.length) {
        throw path
          .get('tag')
          .buildCodeFrameError(
            'match() must at least be called with a node name'
          );
      }

      const matchName = this.getMatchName(path);
      const nameNode = path.node.tag.arguments[0];
      const quasis = path.node.quasi.quasis.map((x) => x.value.cooked);

      const expressions = this._prepareExpressions(path);
      const transformNode = this._prepareTransform(path);

      let ast;
      try {
        ast = parse(quasis, expressions);
      } catch (error) {
        if (error.name !== 'SyntaxError') throw error;
        throw path.get('quasi').buildCodeFrameError(error.message);
      }

      const generator = new RootNode(ast, nameNode, transformNode);
      const body = t.blockStatement(generator.statements());
      const matchFunctionId = path.scope.generateUidIdentifier(matchName);
      const matchFunction = t.functionExpression(
        matchFunctionId,
        [ids.state],
        body
      );
      path.replaceWith(matchFunction);
    },
  };
}

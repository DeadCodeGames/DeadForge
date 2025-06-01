module.exports = {
    meta: {
        type: 'layout',
        docs: {
            description: 'enforce space after commas in array destructuring except when the element before is empty, and disallow trailing comma before last empty element',
            category: 'Stylistic Issues',
            recommended: false
        },
        fixable: 'whitespace',
        schema: [],
        messages: {
            missingSpace: 'Expected a space after comma in array destructuring.',
            unexpectedSpace: 'Unexpected space after comma before empty element.',
            unexpectedTrailingComma: 'Unexpected trailing comma before last empty element in array destructuring.'
        }
    },

    create(context) {
        const sourceCode = context.getSourceCode();

        return {
            ArrayPattern(node) {
                const tokens = sourceCode.getTokens(node);

                tokens.forEach((token, i) => {
                    if (token.value !== ',') return;

                    const prev = tokens[i - 1];
                    const next = tokens[i + 1];
                    if (!prev || !next) return;

                    const hasSpace = sourceCode.isSpaceBetweenTokens(token, next);

                    if (prev.value === '[') {
                        if (hasSpace) {
                            context.report({
                                loc: token.loc,
                                messageId: 'unexpectedSpace',
                                fix(fixer) {
                                    return fixer.replaceTextRange(
                                        [token.range[1], next.range[0]],
                                        ''
                                    );
                                }
                            });
                        }
                    } else {
                        if (!hasSpace) {
                            context.report({
                                loc: token.loc,
                                messageId: 'missingSpace',
                                fix(fixer) {
                                    return fixer.insertTextAfter(token, ' ');
                                }
                            });
                        }
                    }
                });

                const elements = node.elements;
                if (elements.length > 0 && elements[elements.length - 1] === null) {
                    const closeBracket = sourceCode.getLastToken(node);
                    const tokenBeforeClose = sourceCode.getTokenBefore(closeBracket);
                    if (tokenBeforeClose && tokenBeforeClose.value === ',') {
                        context.report({
                            loc: tokenBeforeClose.loc,
                            messageId: 'unexpectedTrailingComma',
                            fix(fixer) {
                                return fixer.remove(tokenBeforeClose);
                            }
                        });
                    }
                }
            }
        };
    }
};

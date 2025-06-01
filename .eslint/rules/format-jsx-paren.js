module.exports = {
    meta: {
        type: "layout",
        docs: {
            description: "Enforce line breaks between parentheses and JSX tags in multiline expressions",
            category: "Stylistic Issues",
            recommended: false,
        },
        fixable: "whitespace",
        schema: [], // no options
        messages: {
            openingTagSameLine: "Opening JSX tag must not be on the same line as the preceding parenthesis in multiline expressions",
            closingTagSameLine: "Closing JSX tag must not be on the same line as the following parenthesis in multiline expressions",
        },
    },

    create: function (context) {
        const sourceCode = context.getSourceCode();

        /**
         * Checks if a JSX expression spans multiple lines
         * @param {Node} jsxElement - The JSX element to check
         * @returns {boolean} - Whether the JSX expression spans multiple lines
         */
        function isMultilineJSX(jsxElement) {
            const startLine = jsxElement.loc.start.line;
            const endLine = jsxElement.loc.end.line;
            return startLine !== endLine;
        }

        return {
            JSXElement(node) {
                // Skip if not wrapped in parentheses or not multiline
                if (!isMultilineJSX(node)) {
                    return;
                }

                // Get the parent node which might have the parentheses
                const parent = node.parent;
                if (!parent) return;

                // Look for a return statement or expression with parentheses
                if (parent.type === "ReturnStatement" || parent.type === "ArrowFunctionExpression") {
                    const tokenBefore = sourceCode.getTokenBefore(node);
                    const tokenAfter = sourceCode.getTokenAfter(node);

                    // Check if there's an opening parenthesis before the JSX element
                    if (tokenBefore && tokenBefore.value === '(') {
                        const openingParenLine = tokenBefore.loc.start.line;
                        const jsxOpeningLine = node.loc.start.line;

                        if (openingParenLine === jsxOpeningLine) {
                            context.report({
                                node: node,
                                loc: {
                                    start: tokenBefore.loc.end,
                                    end: node.loc.start
                                },
                                messageId: "openingTagSameLine",
                                fix: function (fixer) {
                                    return fixer.insertTextAfter(tokenBefore, "\n");
                                }
                            });
                        }
                    }

                    // Check if there's a closing parenthesis after the JSX element
                    if (tokenAfter && tokenAfter.value === ')') {
                        const closingJsxLine = node.loc.end.line;
                        const closingParenLine = tokenAfter.loc.start.line;

                        if (closingJsxLine === closingParenLine) {
                            context.report({
                                node: node,
                                loc: {
                                    start: node.loc.end,
                                    end: tokenAfter.loc.start
                                },
                                messageId: "closingTagSameLine",
                                fix: function (fixer) {
                                    return fixer.insertTextBefore(tokenAfter, "\n");
                                }
                            });
                        }
                    }
                }
            }
        };
    }
};
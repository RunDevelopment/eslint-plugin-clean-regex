/**
 * @fileoverview Rule to disallow lookarounds which match the empty string for regular expressions
 * @author Michael Schmidt
 */
"use strict";

const { RegExpParser, visitRegExpAST } = require("regexpp");
const { createRuleListener, locOfElement, replaceElement } = require("../rules-util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",

		docs: {
			description: "disallow lookarounds which match the empty word",
			category: "Possible Errors",
			recommended: true,
			url: "https://eslint.org/docs/rules/no-extra-semi"
		},
		fixable: "code",
		schema: []
	},

	create(context) {

		const parser = new RegExpParser();

		return createRuleListener({
			RegexLiteral(node) {
				const { pattern, flags } = node.regex;

				let ast;
				try {
					ast = parser.parsePattern(pattern, undefined, undefined, flags.includes("u"));
				} catch (error) {
					return; // ignore invalid patterns no-invalid-regex will handle this for us.
				}

				const literalNode = node;

				visitRegExpAST(ast, {
					onAssertionEnter(node) {
						if (node.kind === "lookahead" || node.kind === "lookbehind") {
							const content = /^\(\?<?[=!]([\s\S]*)\)$/.exec(node.raw)[1];
							if (RegExp(content, flags).test("")) {
								context.report({
									message: `Empty lookaround: The ${node.kind} ${node.raw} can match the empty string.`,
									loc: locOfElement(literalNode, node)
								});
							}
						}
					}
				});
			}
		});
	}
};

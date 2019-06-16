/**
 * @fileoverview Rule to disallow capturing groups which can only match one string in regular expressions
 * @author Michael Schmidt
 */
"use strict";

const { RegExpParser, visitRegExpAST } = require("regexpp");
const { isConstant } = require("../util");
const { createRuleListener, locOfElement } = require("../rules-util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",

		docs: {
			description: "disallow capturing groups which can match one word",
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
			RegexLiteral(regexLiteral) {
				const { pattern, flags } = regexLiteral.regex;

				let ast;
				try {
					ast = parser.parsePattern(pattern, undefined, undefined, flags.includes("u"));
				} catch (error) {
					return; // ignore invalid patterns no-invalid-regex will handle this for us.
				}

				visitRegExpAST(ast, {
					onCapturingGroupEnter(node) {
						if (node.alternatives.length === 1) {
							const concatenation = node.alternatives[0].elements;

							if (concatenation.length === 0) {
								context.report({
									message: "Empty capturing group",
									loc: locOfElement(regexLiteral, node)
								});
								return;
							}

							if (isConstant(concatenation)) {
								context.report({
									message: `Constant capturing group: The capturing group ${node.raw} can only capture one word.`,
									loc: locOfElement(regexLiteral, node)
								});
								return;
							}
						}
					}
				});
			}
		});
	}
};

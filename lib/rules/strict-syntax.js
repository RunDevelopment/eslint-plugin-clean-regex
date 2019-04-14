/**
 * @fileoverview Rule to disallow regular expressions which do not follow strict syntax.
 * @author Michael Schmidt
 */
"use strict";

const { RegExpParser } = require("regexpp");
const { createRuleListener, copyLoc } = require("../rules-util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",

		docs: {
			description: "disallow regexes that do not follow strict syntax",
			category: "Best Practices",
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
				const { pattern } = node.regex;

				try {
					parser.parsePattern(pattern, undefined, undefined, true);
				} catch (error) {
					if (error instanceof SyntaxError) {
						const loc = copyLoc(node.loc);

						const regexError = /** @type {SyntaxError & { index?: number}} */ (error);
						if (typeof regexError.index === "number") {
							const column = loc.start.column + "/".length + regexError.index;
							loc.start.column = column;
							loc.end.column = column + 1;
						}

						context.report({
							message: `Strict syntax: ${error.message.substr("Invalid regular expression: ".length)}`,
							loc
						});
					}
				}
			}
		});
	}
};

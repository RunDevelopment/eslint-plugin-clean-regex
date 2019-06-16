/**
 * @fileoverview Rule to disallow suboptimal quantifiers inside lookarounds
 * @author Michael Schmidt
 */
"use strict";

const { RegExpParser, visitRegExpAST } = require("regexpp");
const { createRuleListener, locOfElement } = require("../rules-util");


/**
 *
 * @param {import("regexpp/ast").Alternative[]} alternatives
 * @returns {import("regexpp/ast").Quantifier[]}
 */
function getLooseEnds(alternatives) {
	/** @type {import("regexpp/ast").Quantifier[]} */
	const looseEnds = [];

	for (const { elements } of alternatives) {
		if (elements.length > 0) {
			const last = elements[elements.length - 1];
			switch (last.type) {
				case "Quantifier":
					if (last.min != last.max) {
						looseEnds.push(last);
					}
					break;

				case "Group":
					looseEnds.push(...getLooseEnds(last.alternatives));
					break;

				// we ignore capturing groups on purpose.
				// Example: /(?=(a*))\w+\1/ (no ideal but it illustrates the point)

				default:
					break;
			}
		}
	}

	return looseEnds;
}


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
			RegexLiteral(regexLiteral) {
				const { pattern, flags } = regexLiteral.regex;

				let ast;
				try {
					ast = parser.parsePattern(pattern, undefined, undefined, flags.includes("u"));
				} catch (error) {
					return; // ignore invalid patterns no-invalid-regex will handle this for us.
				}

				visitRegExpAST(ast, {
					onAssertionEnter(node) {
						if (node.kind === "lookahead" || node.kind === "lookbehind") {
							const looseEnds = getLooseEnds(node.alternatives);

							for (const end of looseEnds) {
								context.report({
									message: `Suboptimal lookaround: Quantified expression ${node.raw} at the end of the expression tree should only be matched a constant number of times.`,
									loc: locOfElement(regexLiteral, end)
								});
							}
						}
					}
				});
			}
		});
	}
};

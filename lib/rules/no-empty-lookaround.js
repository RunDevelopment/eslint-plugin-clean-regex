/**
 * @fileoverview Rule to disallow lookarounds which match the empty string for regular expressions
 * @author Michael Schmidt
 */
"use strict";

const { RegExpParser, visitRegExpAST } = require("regexpp");
const { createRuleListener, locOfElement } = require("../rules-util");


/**
 *
 * @param {import("regexpp/ast").Alternative[]} alts
 */
function alternativesAreEmpty(alts) {
	return alts.some(alt => {
		for (const element of alt.elements) {
			if (!elementIsEmpty(element)) {
				return false;
			}
		}
		return true;
	});
}
/**
 *
 * @param {import("regexpp/ast").Element} element
 */
function elementIsEmpty(element) {
	switch (element.type) {
		case "Assertion":
			if (element.kind === "lookahead" || element.kind === "lookbehind") {
				return alternativesAreEmpty(element.alternatives);
			} else {
				return false;
			}

		case "Quantifier":
			return element.min == 0 || elementIsEmpty(element.element);

		case "Group":
		case "CapturingGroup":
			return alternativesAreEmpty(element.alternatives);

		default:
			return false;
	}
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
							if (elementIsEmpty(node)) {
								context.report({
									message: `Empty lookaround: The ${node.kind} ${node.raw} should not match the empty string.`,
									loc: locOfElement(regexLiteral, node)
								});
							}
						}
					}
				});
			}
		});
	}
};

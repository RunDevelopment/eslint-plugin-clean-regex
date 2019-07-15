/**
 * @fileoverview Rule to disallow unnecessary non-capturing groups
 * @author Michael Schmidt
 */
"use strict";

const { visitRegExpAST } = require("regexpp");
const { createRuleListener } = require("../rules-util");
const util = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",

		docs: {
			description: "disallow unnecessary non-capturing groups",
			category: "Best Practices",
			recommended: true,
			url: "https://eslint.org/docs/rules/no-extra-semi"
		},
		fixable: "code",
		schema: []
	},

	create(context) {
		return createRuleListener(({ pattern, reportElement }) => {

			visitRegExpAST(pattern, {
				onGroupEnter(node) {

					const parentAlt = node.parent.type === "Alternative" ? node.parent : node.parent.parent;
					const parentAltIndex = parentAlt.elements.indexOf(node.parent.type === "Alternative" ? node : node.parent);

					if (parentAltIndex === -1) {
						throw new Error("Could not find group in alternation!");
					}

					/**
					 * Returns whether the concatenation sibling of this groups (including quantifier) matches
					 * the given pattern.
					 *
					 * @param {number} relativeIndex The index of the sibling relating to this group.
					 * E.g. -1 is the previous element.
					 * @param {string | RegExp} pattern
					 * @param {"Character" | "Quantifier" | "Group" | "CapturingGroup" | "CharacterClass" | "Assertion" | "CharacterSet" | "Backreference" | null} [type="Character"]
					 */
					function matchSibling(relativeIndex, pattern, type = "Character") {
						if (parentAlt.elements[parentAltIndex + relativeIndex]) {
							if (type && parentAlt.elements[parentAltIndex + relativeIndex].type !== type) {
								return false;
							}

							if (typeof pattern === "string") {
								return parentAlt.elements[parentAltIndex + relativeIndex].raw === pattern;
							} else {
								return pattern.test(parentAlt.elements[parentAltIndex + relativeIndex].raw);
							}
						}
						return false;
					}

					// only one concatenation, so no (?:a|b)
					if (node.alternatives.length === 1) {
						const concatenation = node.alternatives[0].elements;

						// empty, so (?:)
						if (concatenation.length === 0) {
							context.report({
								message: "Empty non-capturing group.",
								...reportElement(node)
							});
							return;
						}

						// don't report some cases where we can't safely remove the group (see tests for examples)
						if (concatenation.length > 0
							&& concatenation[0].type === "Character" && !concatenation[0].raw.startsWith("\\")) {

							const char = /** @type {import("regexpp/ast").Character} */ (concatenation[0]);

							const isDigit = util.isDigit(char.value);
							const isHex = util.isHexDigit(char.value);
							const isLetter = util.isLetter(char.value);

							if (parentAltIndex > 0) {
								// \1(?:2) or \0(?:2)
								if (isDigit && matchSibling(-1, /^\\\d+$/, null)) {
									return;
								}

								const unescapedHex = /^[\da-f]$/i;

								// \x4(?:1) or \x(?:4)1
								if (isHex && (
									matchSibling(-1, "\\x") ||
									matchSibling(-2, "\\x") && matchSibling(-1, unescapedHex)
								)) {
									return;
								}

								// \u004(?:1) or \u00(?:4)1 or \u0(?:0)41 or \u(?:0)041
								if (isHex && (
									matchSibling(-1, "\\u") ||
									matchSibling(-1, unescapedHex) && (matchSibling(-2, "\\u") ||
										matchSibling(-2, unescapedHex) && (matchSibling(-3, "\\u") ||
											matchSibling(-3, unescapedHex) && matchSibling(-4, "\\u")
										)
									)
								)) {
									return;
								}

								// \c(?:A)
								if (isLetter && matchSibling(-1, "\c")) {
									return;
								}

								// a{(?:2)} or b{2,(?:10)} or b{(?:2})
								if (isDigit || char.raw === "," || char.raw === "}") {
									let digitOrComma = 0;
									while (digitOrComma < parentAltIndex && matchSibling(-digitOrComma - 1, /^[\d,]$/)) {
										digitOrComma++;
									}
									if (matchSibling(-digitOrComma - 1, "{")) {
										return;
									}
								}

								// \u{(?:41)} or \u{F(?:F)} or \u{FF(?:})
								if (isHex || char.raw === "}") {
									let hexDigits = 0;
									while (hexDigits < parentAltIndex && matchSibling(-hexDigits - 1, unescapedHex)) {
										hexDigits++;
									}
									if (matchSibling(-hexDigits - 1, "{") && matchSibling(-hexDigits - 2, "\\u")) {
										return;
									}
								}

							}
						}

						// only one element
						if (concatenation.length === 1) {
							const element = concatenation[0];
							const type = element.type;

							// the groups can always be removed for these elements
							// even if a quantifier is attached to the group
							if (type === "CapturingGroup" || type === "Character" || type === "CharacterClass" ||
								type === "CharacterSet" || type === "Group") {
								context.report({
									message: `The non-capturing group around ${element.raw} is unnecessary.`,
									...reportElement(node)
								});
								return;
							}
						}

						if (node.parent.type !== "Quantifier") {
							context.report({
								message: `The non-capturing group ${node.raw} has neither quantifiers nor does it contain alternations and this therefore unnecessary.`,
								...reportElement(node)
							});
							return;
						}
					}
				}
			});

		});
	}
};

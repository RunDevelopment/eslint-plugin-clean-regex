"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");


/**
 *
 * @param {import("regexpp/ast").LookaroundAssertion} node
 * @returns {import("regexpp/ast").Assertion | null}
 */
function getTriviallyNestedAssertion(node) {
	const alternatives = node.alternatives;
	if (alternatives.length === 1) {
		const elements = alternatives[0].elements;
		if (elements.length === 1) {
			const element = elements[0];
			if (element.type === "Assertion") {
				return element;
			}
		}
	}

	return null;
}

/**
 *
 * @param {import("regexpp/ast").LookaroundAssertion} lookaround
 */
function negateLookaround(lookaround) {
	let wasReplaced = false;
	const replacement = lookaround.raw.replace(/^(\(\?<?)([=!])/, (m, g1, g2) => {
		wasReplaced = true;
		return g1 + (g2 == "=" ? "!" : "=");
	});

	if (!wasReplaced) {
		throw new Error(`The lookaround ${lookaround.raw} could not be negated!`);
	}

	return replacement;
}
/**
 *
 * @param {import("regexpp/ast").BoundaryAssertion} boundary
 */
function negateBoundary(boundary) {
	let wasReplaced = false;
	const replacement = boundary.raw.replace(/^\\b/i, (m) => {
		wasReplaced = true;
		return m == "\\b" ? "\\B" : "\\b";
	});

	if (!wasReplaced) {
		throw new Error(`The lookaround ${boundary.raw} could not be negated!`);
	}

	return replacement;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow lookarounds that only contain another assertion.",
			category: "Possible Errors",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {
		return createRuleListener(({ visitAST, replaceElement }) => {

			visitAST({
				onAssertionEnter(node) {
					if (node.kind === "lookahead" || node.kind === "lookbehind") {
						const inner = getTriviallyNestedAssertion(node);

						if (!inner) return;

						let replacement;

						if (!node.negate) {
							// the outer lookaround can be replace with the inner assertion as is
							replacement = inner.raw;
						} else {
							// the outer lookaround can be replace with the inner assertion negated
							switch (inner.kind) {
								case "lookahead":
								case "lookbehind":
									replacement = negateLookaround(inner);
									break;

								case "word":
									replacement = negateBoundary(inner);
									break;

								default:
									// not possible for anchors. E.g. (?!$), (?<!^)
									break;
							}
						}

						if (replacement) {
							context.report({
								message: `The outer ${node.kind} is unnecessary.`,
								...replaceElement(node, replacement)
							});
						}
					}
				}
			});

		});
	}
};

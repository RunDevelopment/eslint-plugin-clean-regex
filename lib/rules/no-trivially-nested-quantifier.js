"use strict";

const { mention, shorten } = require("../format");
const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");

/**
 * @param {Quantifier} node
 * @param {Quantifier} nested
 * @returns {Quant | null}
 *
 * @typedef {{ min: number; max: number; greedy: boolean }} Quant
 * @typedef {import("regexpp/ast").Quantifier} Quantifier
 */
function getCombinedQuant(node, nested) {
	if (node.max === 0 || nested.max === 0) {
		// other rules deal with this case
		return null;
	} else if (node.greedy === nested.greedy) {
		const greedy = node.greedy;
		if (nested.min === nested.max && node.min === node.max) {
			// e.g. (?:a{2}){4} == a{8}
			const prod = nested.min * node.min;
			return {
				min: prod,
				max: prod,
				greedy,
			};
		} else if (nested.min <= 1) {
			// e.g. (?:a+){4} == a{4,} and (?:a*){4} == a* and (?:a{1,2}){3,4} == a{3,8}
			return {
				min: nested.min * node.min,
				max: nested.max * node.max,
				greedy,
			};
		} else if (nested.max === Infinity && node.min > 0) {
			// e.g. (?:a{5,}){4} == a{20,}
			return {
				min: nested.min * node.min,
				max: nested.max * node.max,
				greedy,
			};
		} else {
			return null;
		}
	} else {
		return null;
	}
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow nested quantifiers that can be rewritten as one quantifier.",
			url: getDocUrl(__filename),
		},
		fixable: "code",
	},

	create(context) {
		return createRuleListener(({ visitAST, replaceElement }) => {
			/** @type {Set<import("regexpp/ast").Node>} */
			const ignore = new Set();

			visitAST({
				onQuantifierEnter(node) {
					const element = node.element;
					if (
						!util.hasSomeAncestor(node, a => ignore.has(a)) &&
						element.type === "Group" &&
						element.alternatives.length === 1 &&
						element.alternatives[0].elements.length === 1
					) {
						const nested = element.alternatives[0].elements[0];
						if (nested.type === "Quantifier") {
							// found a nested quantifier
							// let's see whether we can rewrite it them

							let newQuant = getCombinedQuant(node, nested);
							if (newQuant) {
								const quant = util.quantifierToString(newQuant);
								const replacement = nested.element.raw + quant;
								const messagePreview = shorten(nested.element.raw, 20, "end") + quant;

								ignore.add(node);
								context.report({
									message: `The nested quantifiers can be rewritten as ${mention(messagePreview)}.`,
									...replaceElement(node, replacement),
								});
							}
						}
					}
				},
			});
		});
	},
};

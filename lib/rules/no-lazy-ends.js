"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");

/**
 * @param {import("regexpp/ast").Alternative[]} alternatives
 * @returns {import("regexpp/ast").Quantifier[]}
 */
function getLazyEndQuantifiers(alternatives) {
	/** @type {import("regexpp/ast").Quantifier[]} */
	const quantifiers = [];

	for (const { elements } of alternatives) {
		if (elements.length > 0) {
			const last = elements[elements.length - 1];
			switch (last.type) {
				case "Quantifier":
					if (!last.greedy && last.min !== last.max) {
						quantifiers.push(last);
					} else if (last.max === 1) {
						const element = last.element;
						if (element.type === "Group" || element.type === "CapturingGroup") {
							quantifiers.push(...getLazyEndQuantifiers(element.alternatives));
						}
					}
					break;

				case "CapturingGroup":
				case "Group":
					quantifiers.push(...getLazyEndQuantifiers(last.alternatives));
					break;

				default:
					break;
			}
		}
	}

	return quantifiers;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow lazy quantifiers at the end of an expression.",
			url: getDocUrl(__filename),
		},
	},

	create(context) {
		return createRuleListener(({ pattern, reportElement, reportQuantifier }) => {
			const lazyQuantifiers = getLazyEndQuantifiers(pattern.alternatives);

			for (const lazy of lazyQuantifiers) {
				if (lazy.min === 0) {
					context.report({
						message:
							"The quantifier and the quantified element can be removed because the quantifier is lazy and has a minimum of 0.",
						...reportElement(lazy),
					});
				} else if (lazy.min === 1) {
					context.report({
						message: "The quantifier can be removed because the quantifier is lazy and has a minimum of 1.",
						...reportQuantifier(lazy),
					});
				} else {
					context.report({
						message: `The quantifier can be replaced with '{${lazy.min}}' because the quantifier is lazy and has a minimum of ${lazy.min}.`,
						...reportQuantifier(lazy),
					});
				}
			}
		});
	},
};

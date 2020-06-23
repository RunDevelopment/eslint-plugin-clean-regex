"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");


/**
 * @param {import("regexpp/ast").Quantifier} node
 * @returns {string}
 */
function withoutLazy(node) {
	let raw = util.getQuantifierRaw(node);
	raw = raw.substr(0, raw.length - 1); // remove "?"
	return raw;
}


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow unnecessarily lazy quantifiers.",
			category: "Best Practices",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {

		return createRuleListener(({ visitAST, flags, replaceQuantifier }) => {

			visitAST({
				onQuantifierEnter(node) {
					if (node.greedy) {
						return;
					}

					if (node.min === node.max) {
						// a constant lazy quantifier (e.g. /a{2}?/)
						context.report({
							message: "The lazy modifier is unnecessary for constant quantifiers.",
							...replaceQuantifier(node, withoutLazy(node))
						});
						return;
					}

					// This is more tricky.
					// The basic idea here is that if the first character of the quantified element and the first
					// character of whatever comes after the quantifier are always different, then the lazy modifier
					// doesn't matter.
					// E.g. /a+?b+/ == /a+b+/

					const matchingDir = util.matchingDirection(node);
					const firstChar = util.getFirstCharOf(node, matchingDir, flags);
					if (firstChar.nonEmpty && !firstChar.char.isAll) {
						const afterChar = util.getFirstCharAfter(node, matchingDir, flags);
						if (afterChar.nonEmpty && firstChar.char.isDisjointWith(afterChar.char)) {
							context.report({
								message: "The lazy modifier is unnecessary because the first character of the quantified element are always different from the characters that come after the quantifier.",
								...replaceQuantifier(node, withoutLazy(node))
							});
							return;
						}
					}
				}
			});

		});
	}
};

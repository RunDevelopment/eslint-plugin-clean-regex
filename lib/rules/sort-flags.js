"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Requires the flags of regular expressions to be sorted.",
			category: "Stylistic Issues",
			url: getDocUrl(__filename)
		},
		fixable: "code",
		schema: []
	},

	create(context) {

		/** @type {string} */
		const order = "gimsuy";

		/**
		 * A compare function for regex flags.
		 *
		 * @param {string} a
		 * @param {string} b
		 */
		const compareFn = (a, b) => {
			const aIndex = order.indexOf(a);
			const bIndex = order.indexOf(b);

			if (aIndex === -1) throw new Error(`Unknown flag ${a}.`);
			if (bIndex === -1) throw new Error(`Unknown flag ${b}.`);

			return aIndex - bIndex;
		};

		return createRuleListener(({ flags, replaceFlags, reportFlags }) => {
			try {
				const sortedFlags = flags.raw.split("").sort(compareFn).join("");

				if (flags.raw !== sortedFlags) {
					context.report({
						message: `The flags ${flags.raw} should in the order ${sortedFlags}.`,
						...replaceFlags(sortedFlags)
					});
				}
			} catch (e) {
				context.report({
					message: e.message,
					...reportFlags()
				});
			}
		});
	}
};

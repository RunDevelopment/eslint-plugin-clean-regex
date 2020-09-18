import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Requires the regex flags to be sorted.",
			url: getDocUrl(/* #GENERATED */ "sort-flags"),
		},
		fixable: "code",
	},

	create(context) {
		const order = "gimsuy";

		/**
		 * A compare function for regex flags.
		 */
		const compareFn = (a: string, b: string): number => {
			const aIndex = order.indexOf(a);
			const bIndex = order.indexOf(b);

			if (aIndex === -1) {
				throw new Error(`Unknown flag ${a}.`);
			}
			if (bIndex === -1) {
				throw new Error(`Unknown flag ${b}.`);
			}

			return aIndex - bIndex;
		};

		return createRuleListener(({ flags, replaceFlags, reportFlags }) => {
			try {
				const sortedFlags = flags.raw.split("").sort(compareFn).join("");

				if (flags.raw !== sortedFlags) {
					context.report({
						message: `The flags ${flags.raw} should in the order ${sortedFlags}.`,
						...replaceFlags(sortedFlags),
					});
				}
			} catch (e) {
				context.report({
					message: e.message,
					...reportFlags(),
				});
			}
		});
	},
} as CleanRegexRule;

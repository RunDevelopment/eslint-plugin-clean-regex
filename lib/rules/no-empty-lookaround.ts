import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { mention } from "../format";
import { isPotentiallyEmpty } from "../ast-util";

export default {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow lookarounds that can match the empty string.",
			url: getDocUrl(/* #GENERATED */ "no-empty-lookaround"),
		},
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {
			visitAST({
				onAssertionEnter(node) {
					if (node.kind !== "lookahead" && node.kind !== "lookbehind") {
						return; // we don't need to check standard assertions
					}

					// we have to check the alternatives ourselves because negative lookarounds which trivially reject
					// cannot match the empty string.
					const empty = isPotentiallyEmpty(node.alternatives, { backreferencesAreNonEmpty: true });

					if (empty) {
						context.report({
							message:
								`The ${node.kind} ${mention(node)} is non-functional as it matches the empty string.` +
								` It will always trivially ${node.negate ? "reject" : "accept"}.`,
							...reportElement(node),
						});
					}
				},
			});
		});
	},
} as CleanRegexRule;

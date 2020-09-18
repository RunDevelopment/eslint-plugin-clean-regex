import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { backreferenceAlwaysAfterGroup, isEmptyBackreference } from "../util";

export default {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow backreferences that reference a group that might not be matched.",
			url: getDocUrl(/* #GENERATED */ "no-potentially-empty-backreference"),
		},
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {
			visitAST({
				onBackreferenceEnter(node) {
					if (isEmptyBackreference(node)) {
						// handled by no-empty-backreference
						return;
					}

					if (!backreferenceAlwaysAfterGroup(node)) {
						context.report({
							message:
								"Some path leading to the backreference do not go through the referenced capturing group without resetting its text.",
							...reportElement(node),
						});
					}
				},
			});
		});
	},
} as CleanRegexRule;

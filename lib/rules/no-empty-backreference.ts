import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { isEmptyBackreference, isZeroLength } from "../util";

export default {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow backreferences that will always be replaced with the empty string.",
			url: getDocUrl(/* #GENERATED */ "no-empty-backreference"),
		},
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {
			visitAST({
				onBackreferenceEnter(node) {
					if (isZeroLength(node.resolved)) {
						context.report({
							message: "The referenced capturing group can only match the empty string.",
							...reportElement(node),
						});
						return;
					}

					if (isEmptyBackreference(node)) {
						context.report({
							message:
								"The backreference is not reachable from the referenced capturing group without resetting the captured string.",
							...reportElement(node),
						});
						return;
					}
				},
			});
		});
	},
} as CleanRegexRule;

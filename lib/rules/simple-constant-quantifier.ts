import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { getQuantifierRaw, quantToString } from "../ast-util";

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Prefer simple constant quantifiers over the range form.",
			url: getDocUrl(/* #GENERATED */ "simple-constant-quantifier"),
		},
		fixable: "code",
	},

	create(context) {
		return createRuleListener(({ visitAST, replaceQuantifier }) => {
			visitAST({
				onQuantifierEnter(node) {
					if (node.min !== node.max || node.min < 2) {
						// we let no-unnecessary-quantifier handle the {1} case and no-zero-quantifier will handle {0}
						return;
					}

					const currentRaw = getQuantifierRaw(node);
					const simpleRaw = quantToString(node);

					if (simpleRaw !== currentRaw) {
						context.report({
							message: `This constant quantifier can be simplified to "${simpleRaw}".`,
							...replaceQuantifier(node, simpleRaw),
						});
					}
				},
			});
		});
	},
} as CleanRegexRule;

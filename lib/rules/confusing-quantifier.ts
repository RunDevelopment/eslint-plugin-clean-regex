import { mention } from "../format";
import { createRuleListener, getDocUrl, CleanRegexRule } from "../rules-util";
import { isPotentiallyEmpty, quantToString } from "../util";

export default {
	meta: {
		type: "problem",
		docs: {
			description: "Warn about confusing quantifiers.",
			url: getDocUrl(/* #GENERATED */ "confusing-quantifier"),
		},
	},

	create(context) {
		return createRuleListener(({ visitAST, reportQuantifier }) => {
			visitAST({
				onQuantifierEnter(node) {
					if (node.min > 0 && isPotentiallyEmpty(node.element)) {
						const proposal = quantToString({ ...node, min: 0 });
						context.report({
							message:
								`This quantifier is confusing because its minimum is ${node.min} but it can match the empty string.` +
								` Maybe replace it with ${mention(
									proposal
								)} to reflect that it can match the empty string?`,
							...reportQuantifier(node),
						});
						return;
					}
				},
			});
		});
	},
} as CleanRegexRule;

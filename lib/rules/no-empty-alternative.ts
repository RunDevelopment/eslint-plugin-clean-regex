import { CapturingGroup, Group, Pattern } from "regexpp/ast";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";

export default {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow alternatives without elements.",
			url: getDocUrl(/* #GENERATED */ "no-empty-alternative"),
		},
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {
			function checkAlternatives(node: CapturingGroup | Group | Pattern) {
				if (node.alternatives.length >= 2) {
					// We want to have at least two alternatives because the zero alternatives isn't possible because of
					// the parser and one alternative is already handled by other rules.
					for (let i = 0; i < node.alternatives.length; i++) {
						const alt = node.alternatives[i];
						if (alt.elements.length === 0) {
							context.report({
								message: "No empty alternatives. Use quantifiers instead.",
								...reportElement(node),
							});
							// don't report the same node multiple times
							return;
						}
					}
				}
			}

			visitAST({
				onGroupEnter: checkAlternatives,
				onCapturingGroupEnter: checkAlternatives,
				onPatternEnter: checkAlternatives,
				// While lookarounds can contain empty alternatives, lookarounds with empty alternatives are already
				// covered by the `no-empty-lookaround`.
			});
		});
	},
} as CleanRegexRule;

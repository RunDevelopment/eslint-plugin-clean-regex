import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { isEmpty, isPotentiallyEmpty, isZeroLength } from "../ast-util";

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow unnecessary quantifiers.",
			url: getDocUrl(/* #GENERATED */ "no-unnecessary-quantifier"),
		},
		fixable: "code",
	},

	create(context) {
		return createRuleListener(({ visitAST, replaceElement, reportQuantifier }) => {
			visitAST({
				onQuantifierEnter(node) {
					if (node.min === 1 && node.max === 1) {
						context.report({
							message: "Unnecessary quantifier.",
							...replaceElement(node, node.element.raw),
						});
						return;
					}

					// only report from here on

					if (isEmpty(node.element)) {
						// we only report the quantifier.
						// no-unnecessary-group can then remove the element
						context.report({
							message: "The quantified element is empty, so the quantifier can be removed.",
							...reportQuantifier(node),
						});
						return;
					}

					if (node.min === 0 && node.max === 1 && isPotentiallyEmpty(node.element)) {
						context.report({
							message:
								"The optional quantifier can be removed because the quantified element can match the empty string.",
							...reportQuantifier(node),
						});
						return;
					}

					if (node.min > 0 && isZeroLength(node.element)) {
						context.report({
							message:
								"The quantified element does not consume characters, so the quantifier (minimum > 0) can be removed.",
							...reportQuantifier(node),
						});
						return;
					}
				},
			});
		});
	},
} as CleanRegexRule;

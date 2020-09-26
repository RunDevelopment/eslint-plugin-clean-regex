import { Quantifier } from "regexpp/ast";
import { mention, shorten } from "../format";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { hasSomeAncestor, quantToString, Quant } from "../util";

function getCombinedQuant(node: Quantifier, nested: Quantifier): Quant | null {
	if (node.max === 0 || nested.max === 0) {
		// other rules deal with this case
		return null;
	} else if (node.greedy === nested.greedy) {
		const greedy = node.greedy;
		if (nested.min === nested.max && node.min === node.max) {
			// e.g. (?:a{2}){4} == a{8}
			const prod = nested.min * node.min;
			return {
				min: prod,
				max: prod,
				greedy,
			};
		} else if (nested.min <= 1) {
			// e.g. (?:a+){4} == a{4,} and (?:a*){4} == a* and (?:a{1,2}){3,4} == a{3,8}
			return {
				min: nested.min * node.min,
				max: nested.max * node.max,
				greedy,
			};
		} else if (nested.max === Infinity && node.min > 0) {
			// e.g. (?:a{5,}){4} == a{20,}
			return {
				min: nested.min * node.min,
				max: nested.max * node.max,
				greedy,
			};
		} else {
			return null;
		}
	} else {
		return null;
	}
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow nested quantifiers that can be rewritten as one quantifier.",
			url: getDocUrl(/* #GENERATED */ "no-trivially-nested-quantifier"),
		},
		fixable: "code",
	},

	create(context) {
		return createRuleListener(({ visitAST, replaceElement }) => {
			const ignore: Set<import("regexpp/ast").Node> = new Set();

			visitAST({
				onQuantifierEnter(node) {
					const element = node.element;
					if (
						!hasSomeAncestor(node, a => ignore.has(a)) &&
						element.type === "Group" &&
						element.alternatives.length === 1 &&
						element.alternatives[0].elements.length === 1
					) {
						const nested = element.alternatives[0].elements[0];
						if (nested.type === "Quantifier") {
							// found a nested quantifier
							// let's see whether we can rewrite it them

							const newQuant = getCombinedQuant(node, nested);
							if (newQuant) {
								const quantStr = quantToString(newQuant);
								const replacement = nested.element.raw + quantStr;
								const messagePreview = shorten(nested.element.raw, 20, "end") + quantStr;

								ignore.add(node);
								context.report({
									message: `The nested quantifiers can be rewritten as ${mention(messagePreview)}.`,
									...replaceElement(node, replacement),
								});
							}
						}
					}
				},
			});
		});
	},
} as CleanRegexRule;

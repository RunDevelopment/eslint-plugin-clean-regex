import { Quantifier, Node } from "regexpp/ast";
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

function getSimplifiedChildQuant(parent: Quantifier, child: Quantifier): Quant | null {
	if (parent.max === 0 || child.max === 0) {
		// this rule doesn't handle this
		return null;
	} else if (parent.greedy !== child.greedy) {
		// maybe some optimization is possible, but I'm not sure, so let's be safe
		return null;
	} else {
		let min = child.min;
		let max = child.max;

		if (min === 0 && parent.min === 0) {
			min = 1;
		}
		if (parent.max === Infinity && (min === 0 || min === 1) && max > 1) {
			max = 1;
		}

		return { min, max, greedy: child.greedy };
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
			const ignore: Set<Node> = new Set();

			visitAST({
				onQuantifierEnter(node) {
					if (hasSomeAncestor(node, a => ignore.has(a))) {
						return;
					}
					if (node.max === 0) {
						// this rule does not handle this case
						ignore.add(node);
						return;
					}

					const element = node.element;

					if (
						element.type === "Group" &&
						element.alternatives.length === 1 &&
						element.alternatives[0].elements.length === 1
					) {
						// this is a special case, so we can do some more advanced optimization
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
								return;
							}
						}
					}

					if (element.type === "Group" || element.type === "CapturingGroup") {
						for (const alternative of element.alternatives) {
							const nested = alternative.elements[0];
							if (!(alternative.elements.length === 1 && nested.type === "Quantifier")) {
								continue;
							}

							const newQuant = getSimplifiedChildQuant(node, nested);
							if (!newQuant || (newQuant.min === nested.min && newQuant.max === nested.max)) {
								// quantifier could not be simplified
								continue;
							}

							ignore.add(node);

							if (newQuant.min === 1 && newQuant.max === 1) {
								const replacement = nested.element.raw;

								context.report({
									message:
										"The nested quantifier is unnecessary and can be replaced with its element.",
									...replaceElement(nested, replacement, { dependsOn: node }),
								});
							} else {
								const quantStr = quantToString(newQuant);
								const replacement = nested.element.raw + quantStr;
								const messagePreview = shorten(nested.element.raw, 20, "end") + quantStr;

								ignore.add(node);
								context.report({
									message: `The nested quantifiers can be rewritten as ${mention(messagePreview)}.`,
									...replaceElement(nested, replacement, { dependsOn: node }),
								});
							}
						}
					}
				},
			});
		});
	},
} as CleanRegexRule;

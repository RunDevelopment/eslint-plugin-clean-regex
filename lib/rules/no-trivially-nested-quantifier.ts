import { Quantifier, Node } from "regexpp/ast";
import { mention, shorten } from "../format";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { hasSomeAncestor, quantToString, Quant } from "../ast-util";

function getCombinedQuant(node: Quantifier, nested: Quantifier): Quant | null {
	if (node.max === 0 || nested.max === 0) {
		// other rules deal with this case
		return null;
	} else if (node.greedy === nested.greedy) {
		const greedy = node.greedy;

		// Explanation of the following condition:
		//
		// We are currently given a regular expression of the form `(R{a,b}){c,d}` with a<=b, c<=d, b>0, and d>0. The
		// question is: For what numbers a,b,c,d is `(R{a,b}){c,d}` == `R{a*c,b*d}`?
		//
		// Let's reformulate the question in terms of integer intervals. First, some definitions:
		//   x∈[a,b] ⇔ a <= x <= b
		//   [a,b]*x = [a*x, b*x] for x != 0
		//           = [0, 0] for x == 0
		//
		// The question: For what intervals [a, b] and [c, d] is X=Y for
		//   X = [a*c, b*d] and
		//   Y = { x | x ∈ [a,b]*i where i∈[c,d] } ?
		//
		// The first thing to note is that X ⊇ Y, so we only have to show X\Y = ∅. We can think of the elements X\Y
		// as holes in Y. Holes can only appear between intervals [a,b]*j and [a,b]*(j+1), so let's look at a hole h
		// between [a,b]*c and [a,b]*(c+1):
		//
		// 1.  We can see that [a,b]*(c+1) ⊆ Y iff c+1 <= d ⇔ c != d since we are dealing with integers only and know
		//     that c<=d.
		// 2.  h > b*c and h < a*(c+1). Let's just pick h=b*c+1, then we'll get b*c+1 < a*(c+1).
		//
		// The condition for _no_ hole between [a,b]*c and [a,b]*(c+1) is:
		//   c=d ∨ b*c+1 >= a*(c+1)
		//
		// However, this condition is not defined for b=∞ and c=0. Since [a,b]*x = [0, 0] for x == 0, we will just
		// define 0*∞ = 0. It makes sense for our problem, so the condition for b=∞ and c=0 is:
		//   a <= 1
		//
		// Now to proof that it's sufficient to only check for a hole between the first two intervals. We want to show
		// that if h=b*c+1 is not a hole then there will be no j, c<j<d such that b*j+1 is a hole. The first thing to
		// not that j can only exist if c!=d, so the condition for h to not exist simplifies to b*c+1 >= a*(c+1).
		//
		// 1)  b=∞ and c=0:
		//     b*c+1 >= a*(c+1) ⇔ 1 >= a ⇔ a <= 1. If a <= 1, then h does not exist but since b=∞, we know that the
		//     union of the next interval [a, ∞]*1 = [a, ∞] and [0, 0] = [a, ∞]*0 is [0, ∞]. [0, ∞] is the largest
		//     possible interval meaning that there could not possibly be any holes after it. Therefore, a j, c<j<d
		//     cannot exist.
		// 2)  b==∞ and c>0:
		//     b*c+1 >= a*(c+1) ⇔ ∞ >= a*(c+1) is trivially true, so the hole h between [a,b]*c and [a,b]*(c+1) cannot
		//     exist. There can also be no other holes because [a,b]*c = [a*c,∞] ⊇ [a,b]*i = [a*i,∞] for all i>c.
		// 3)  b<∞:
		//     b*c+1 >= a*(c+1). If c+x is also not a hole for any x >= 0, then there can be no holes.
		//     b*(c+x)+1 >= a*(c+x+1) ⇔ b >= a + (a-1)/(c+x). We know that this is true for x=0 and increasing x will
		//     only make (a-1)/(c+x) smaller, so it is always true. Therefore, there can be no j c<j<d such that b*j+1
		//     is a hole.
		//
		// We've shown that if there is no hole h between the first and second interval, then there can be no other
		// holes. Therefore it is sufficient to only check for the first hole.

		const a = nested.min;
		const b = nested.max;
		const c = node.min;
		const d = node.max;
		const condition = b === Infinity && c === 0 ? a <= 1 : c === d || b * c + 1 >= a * (c + 1);

		if (condition) {
			return {
				min: a * c,
				max: b * d,
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

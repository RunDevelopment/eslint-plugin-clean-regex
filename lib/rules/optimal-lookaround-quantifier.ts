import { Alternative, Quantifier } from "regexpp/ast";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";

function getEndQuantifiers(alternatives: Alternative[]): Quantifier[] {
	const quantifiers: Quantifier[] = [];

	for (const { elements } of alternatives) {
		if (elements.length > 0) {
			const last = elements[elements.length - 1];
			switch (last.type) {
				case "Quantifier":
					if (last.min != last.max) {
						quantifiers.push(last);
					}
					break;

				case "Group":
					quantifiers.push(...getEndQuantifiers(last.alternatives));
					break;

				// we ignore capturing groups on purpose.
				// Example: /(?=(a*))\w+\1/ (no ideal but it illustrates the point)

				default:
					break;
			}
		}
	}

	return quantifiers;
}
function getStartQuantifiers(alternatives: Alternative[]): Quantifier[] {
	const quantifiers: Quantifier[] = [];

	for (const { elements } of alternatives) {
		if (elements.length > 0) {
			const first = elements[0];
			switch (first.type) {
				case "Quantifier":
					if (first.min != first.max) {
						quantifiers.push(first);
					}
					break;

				case "Group":
					quantifiers.push(...getStartQuantifiers(first.alternatives));
					break;

				// we ignore capturing groups on purpose.
				// Example: /(?=(a*))\w+\1/ (no ideal but it illustrates the point)

				default:
					break;
			}
		}
	}

	return quantifiers;
}

export default {
	meta: {
		type: "problem",
		docs: {
			description: "Disallows the alternatives of lookarounds that end with a non-constant quantifier.",
			url: getDocUrl(/* #GENERATED */ "optimal-lookaround-quantifier"),
		},
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {
			visitAST({
				onAssertionEnter(node) {
					if (node.kind === "lookahead" || node.kind === "lookbehind") {
						let endOrStart;
						let quantifiers;
						if (node.kind === "lookahead") {
							endOrStart = "end";
							quantifiers = getEndQuantifiers(node.alternatives);
						} /* if (node.kind === "lookbehind") */ else {
							endOrStart = "start";
							quantifiers = getStartQuantifiers(node.alternatives);
						}

						for (const q of quantifiers) {
							let proposal;
							if (q.min == 0) {
								proposal = "removed";
							} else if (q.min == 1) {
								proposal = `replaced with ${q.element.raw} (no quantifier)`;
							} else {
								proposal = `replaced with ${q.element.raw}{${q.min}}`;
							}

							context.report({
								message:
									`The quantified expression ${q.raw} at the ${endOrStart} of the expression tree should only be matched a constant number of times.` +
									` The expression can be ${proposal} without affecting the lookaround.`,
								...reportElement(q),
							});
						}
					}
				},
			});
		});
	},
} as CleanRegexRule;

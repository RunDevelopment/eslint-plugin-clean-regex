import { Assertion, BoundaryAssertion, LookaroundAssertion } from "regexpp/ast";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";

function getTriviallyNestedAssertion(node: LookaroundAssertion): Assertion | null {
	const alternatives = node.alternatives;
	if (alternatives.length === 1) {
		const elements = alternatives[0].elements;
		if (elements.length === 1) {
			const element = elements[0];
			if (element.type === "Assertion") {
				return element;
			}
		}
	}

	return null;
}

function negateLookaround(lookaround: LookaroundAssertion): string {
	let wasReplaced = false;
	const replacement = lookaround.raw.replace(/^(\(\?<?)([=!])/, (m, g1, g2) => {
		wasReplaced = true;
		return g1 + (g2 == "=" ? "!" : "=");
	});

	if (!wasReplaced) {
		throw new Error(`The lookaround ${lookaround.raw} could not be negated!`);
	}

	return replacement;
}
function negateBoundary(boundary: BoundaryAssertion): string {
	let wasReplaced = false;
	const replacement = boundary.raw.replace(/^\\b/i, m => {
		wasReplaced = true;
		return m == "\\b" ? "\\B" : "\\b";
	});

	if (!wasReplaced) {
		throw new Error(`The lookaround ${boundary.raw} could not be negated!`);
	}

	return replacement;
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow lookarounds that only contain another assertion.",
			url: getDocUrl(/* #GENERATED */ "no-trivially-nested-lookaround"),
		},
		fixable: "code",
	},

	create(context) {
		return createRuleListener(({ visitAST, replaceElement }) => {
			visitAST({
				onAssertionEnter(node) {
					if (node.kind === "lookahead" || node.kind === "lookbehind") {
						const inner = getTriviallyNestedAssertion(node);

						if (!inner) {
							return;
						}

						let replacement;

						if (!node.negate) {
							// the outer lookaround can be replace with the inner assertion as is
							replacement = inner.raw;
						} else {
							// the outer lookaround can be replace with the inner assertion negated
							switch (inner.kind) {
								case "lookahead":
								case "lookbehind":
									replacement = negateLookaround(inner);
									break;

								case "word":
									replacement = negateBoundary(inner);
									break;

								default:
									// not possible for anchors. E.g. (?!$), (?<!^)
									break;
							}
						}

						if (replacement) {
							context.report({
								message: `The outer ${node.kind} is unnecessary.`,
								...replaceElement(node, replacement),
							});
						}
					}
				},
			});
		});
	},
} as CleanRegexRule;

import { Quantifier } from "regexpp/ast";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { getFirstCharAfter, getFirstCharOf, getQuantifierRaw, matchingDirection } from "../util";

function withoutLazy(node: Quantifier): string {
	let raw = getQuantifierRaw(node);
	raw = raw.substr(0, raw.length - 1); // remove "?"
	return raw;
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow unnecessarily lazy quantifiers.",
			url: getDocUrl(/* #GENERATED */ "no-unnecessary-lazy"),
		},
		fixable: "code",
	},

	create(context) {
		return createRuleListener(({ visitAST, flags, replaceQuantifier }) => {
			visitAST({
				onQuantifierEnter(node) {
					if (node.greedy) {
						return;
					}

					if (node.min === node.max) {
						// a constant lazy quantifier (e.g. /a{2}?/)
						context.report({
							message: "The lazy modifier is unnecessary for constant quantifiers.",
							...replaceQuantifier(node, withoutLazy(node)),
						});
						return;
					}

					// This is more tricky.
					// The basic idea here is that if the first character of the quantified element and the first
					// character of whatever comes after the quantifier are always different, then the lazy modifier
					// doesn't matter.
					// E.g. /a+?b+/ == /a+b+/

					const matchingDir = matchingDirection(node);
					const firstChar = getFirstCharOf(node, matchingDir, flags);
					if (firstChar.nonEmpty && !firstChar.char.isAll) {
						const afterChar = getFirstCharAfter(node, matchingDir, flags);
						if (afterChar.nonEmpty && firstChar.char.isDisjointWith(afterChar.char)) {
							context.report({
								message:
									"The lazy modifier is unnecessary because the first character of the quantified element are always different from the characters that come after the quantifier.",
								...replaceQuantifier(node, withoutLazy(node)),
							});
							return;
						}
					}
				},
			});
		});
	},
} as CleanRegexRule;

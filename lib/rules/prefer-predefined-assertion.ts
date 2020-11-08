import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";

import { CharSet, JS } from "refa";
import { CharacterClass, CharacterSet, Element, Flags, LookaroundAssertion } from "regexpp/ast";
import { assertionKindToMatchingDirection, getFirstCharAfter, invertMatchingDirection } from "../ast-util";
import { isMatchAll } from "../char-util";

const _wordCharSetCache = new Map<string, CharSet>();
function getWordCharSet(flags: Flags): CharSet {
	let cacheKey = "";
	if (flags.ignoreCase) {
		cacheKey += "i";
	}
	if (flags.unicode) {
		cacheKey += "u";
	}

	let set = _wordCharSetCache.get(cacheKey);
	if (!set) {
		set = JS.createCharSet([{ kind: "word", negate: false }], flags);
		_wordCharSetCache.set(cacheKey, set);
	}
	return set;
}

function getCharacters(lookaround: LookaroundAssertion): CharacterSet | CharacterClass | null {
	if (lookaround.alternatives.length === 1) {
		const alt = lookaround.alternatives[0];
		if (alt.elements.length === 1) {
			const first = alt.elements[0];
			if (first.type === "CharacterSet" || first.type === "CharacterClass") {
				return first;
			}
		}
	}
	return null;
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Prefer predefined assertions over equivalent lookarounds.",
			url: getDocUrl(/* #GENERATED */ "prefer-predefined-assertion"),
		},
		fixable: "code",
	},

	create(context) {
		return createRuleListener(({ visitAST, flags, replaceElement }) => {
			// /\b/ == /(?<!\w)(?=\w)|(?<=\w)(?!\w)/
			// /\B/ == /(?<=\w)(?=\w)|(?<!\w)(?!\w)/

			const isWord = (chars: CharSet) => chars.isSubsetOf(getWordCharSet(flags));
			const isNonWord = (chars: CharSet) => chars.isDisjointWith(getWordCharSet(flags));

			function replaceWordAssertion(node: LookaroundAssertion, wordNegated: boolean): void {
				const direction = assertionKindToMatchingDirection(node.kind);
				const dependsOn: Element[] = [];

				/**
				 * Whether the lookaround is equivalent to (?!\w) / (?<!\w) or (?=\w) / (?<=\w)
				 */
				let lookaroundNegated = node.negate;
				if (wordNegated) {
					// if the lookaround only contains a \W, then we have to negate the lookaround, so it only
					// contains a \w. This is only possible iff we know that the pattern requires at least one
					// character after the lookaround (in the direction of the lookaround).
					//
					// Examples:
					// (?=\W) == (?!\w|$)   ; Here we need to eliminate the $ which can be done by proving that the
					//                        pattern matches another character after the lookahead. Example:
					// (?=\W).+ == (?!\w).+ ; Since we know that the lookahead is always followed by a dot, we
					//                        eliminate the $ alternative because it will always reject.
					// (?!\W).+ == (?=\w|$).+ == (?=\w).+

					const after = getFirstCharAfter(node, direction, flags);
					dependsOn.push(...after.elements);

					const hasNextCharacter = !after.char.edge;
					if (hasNextCharacter) {
						// we can successfully negate the lookaround
						lookaroundNegated = !lookaroundNegated;
					} else {
						// we couldn't negate the \W, so it's not possible to convert the lookaround into a
						// predefined assertion
						return;
					}
				}

				const before = getFirstCharAfter(node, invertMatchingDirection(direction), flags);
				dependsOn.push(...before.elements);
				if (before.char.edge) {
					// to do the branch elimination necessary, we need to know the previous/next character
					return;
				}

				let otherNegated;
				if (isWord(before.char.char)) {
					// we can think of the previous/next character as \w
					otherNegated = false;
				} else if (isNonWord(before.char.char)) {
					// we can think of the previous/next character as \W
					otherNegated = true;
				} else {
					// the previous/next character is a subset of neither \w nor \W, so we can't do anything here
					return;
				}

				if (lookaroundNegated === otherNegated) {
					// \B
					context.report({
						message: "This assertion can be replaced with a negated word boundary assertion (\\B).",
						...replaceElement(node, "\\B", { dependsOn }),
					});
				} else {
					// \b
					context.report({
						message: "This assertion can be replaced with a word boundary assertion (\\b).",
						...replaceElement(node, "\\b", { dependsOn }),
					});
				}
			}
			function replaceAllAssertion(node: LookaroundAssertion, multiline = false): void {
				if (!node.negate) {
					return;
				}
				if (flags.multiline === multiline) {
					const replacement = node.kind === "lookahead" ? "$" : "^";
					// suggest the change
					context.report({
						message: `This assertion can be replaced with ${replacement}.`,
						...replaceElement(node, replacement, { dependsOnFlags: true }),
					});
				}
			}

			visitAST({
				onAssertionEnter(node) {
					if (node.kind !== "lookahead" && node.kind !== "lookbehind") {
						// this rule doesn't affect predefined assertions
						return;
					}

					const chars = getCharacters(node);
					if (chars === null) {
						return;
					}

					if (chars.type === "CharacterSet") {
						if (chars.kind === "word") {
							replaceWordAssertion(node, chars.negate);
						} else if (chars.kind === "any") {
							if (flags.dotAll) {
								replaceAllAssertion(node);
							} else {
								replaceAllAssertion(node, true);
							}
						} else if (chars.kind === "property") {
							if (isMatchAll(chars, flags)) {
								replaceAllAssertion(node);
							}
						}
					} else {
						if (isMatchAll(chars, flags)) {
							replaceAllAssertion(node);
						}
					}
				},
			});
		});
	},
} as CleanRegexRule;

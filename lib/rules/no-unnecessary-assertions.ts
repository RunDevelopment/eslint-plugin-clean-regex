import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { mention } from "../format";
import { JS } from "refa";
import {
	assertNever,
	getFirstCharAfter,
	getFirstCharConsumedBy,
	getLengthRange,
	hasSomeDescendant,
	isPotentiallyEmpty,
	assertionKindToMatchingDirection,
} from "../util";
import { EdgeAssertion, LookaroundAssertion, WordBoundaryAssertion } from "regexpp/ast";

export default {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow assertions that are known to always accept (or reject).",
			url: getDocUrl(/* #GENERATED */ "no-unnecessary-assertions"),
		},
	},

	create(context) {
		return createRuleListener(({ visitAST, pattern, flags, reportElement }) => {
			if (pattern.raw === /[a-z_]\w*(?!\\)\b(?=\s*;)/.source) {
				console.log("got you");
			}
			function checkStartOrEnd(node: EdgeAssertion): void {
				// Note: /^/ is the same as /(?<!.)/s and /^/m is the same as /(?<!.)/
				// Note: /$/ is the same as /(?!.)/s and /$/m is the same as /(?!.)/

				// get the "next" character
				const direction = assertionKindToMatchingDirection(node.kind);
				const nextChar = getFirstCharAfter(node, direction, flags);

				const followed = node.kind === "end" ? "followed" : "preceded";

				if (!nextChar.edge) {
					// there is always some character of `node`

					if (!flags.multiline) {
						// since the m flag isn't present any character will result in trivial rejection
						context.report({
							message: `${mention(node)} will always reject because it is ${followed} by a character.`,
							...reportElement(node),
						});
					} else {
						// only if the character is a sub set of /./, will the assertion trivially reject

						// with this little flag hack, we can easily create the dot set.
						const oldDotAll = flags.dotAll;
						flags.dotAll = false;
						const dot = JS.createCharSet([{ kind: "any" }], flags);
						flags.dotAll = oldDotAll;

						if (nextChar.char.isSubsetOf(dot)) {
							context.report({
								message: `${mention(
									node
								)} will always reject because it is ${followed} by a non-line-terminator character.`,
								...reportElement(node),
							});
						} else if (nextChar.char.isDisjointWith(dot)) {
							context.report({
								message: `${mention(
									node
								)} will always accept because it is ${followed} by a line-terminator character.`,
								...reportElement(node),
							});
						}
					}
				}
			}

			function checkWordBoundary(node: WordBoundaryAssertion): void {
				const word = JS.createCharSet([{ kind: "word", negate: false }], flags);

				const next = getFirstCharAfter(node, "ltr", flags);
				const prev = getFirstCharAfter(node, "rtl", flags);

				if (prev.edge || next.edge) {
					// we can only do this analysis if we know the previous and next character
					return;
				}

				const nextIsWord = next.char.isSubsetOf(word);
				const prevIsWord = prev.char.isSubsetOf(word);
				const nextIsNonWord = next.char.isDisjointWith(word);
				const prevIsNonWord = prev.char.isDisjointWith(word);

				// Note: /\b/ == /(?:(?<!\w)(?=\w)|(?<=\w)(?!\w))/  (other flags may apply)

				// the idea here is that \B accepts when \b reject and vise versa.
				const accept = node.negate ? "reject" : "accept";
				const reject = node.negate ? "accept" : "reject";

				if (prevIsNonWord) {
					// current branch: /(?<!\w)(?=\w)/

					if (nextIsWord) {
						context.report({
							message: `${mention(
								node
							)} will always ${accept} because it is preceded by a non-word character and followed by a word character.`,
							...reportElement(node),
						});
					}
					if (nextIsNonWord) {
						context.report({
							message: `${mention(
								node
							)} will always ${reject} because it is preceded by a non-word character and followed by a non-word character.`,
							...reportElement(node),
						});
					}
				}
				if (prevIsWord) {
					// current branch: /(?<=\w)(?!\w)/

					if (nextIsNonWord) {
						context.report({
							message: `${mention(
								node
							)} will always ${accept} because it is preceded by a word character and followed by a non-word character.`,
							...reportElement(node),
						});
					}
					if (nextIsWord) {
						context.report({
							message: `${mention(
								node
							)} will always ${reject} because it is preceded by a word character and followed by a word character.`,
							...reportElement(node),
						});
					}
				}
			}

			function checkLookaround(node: LookaroundAssertion): void {
				if (isPotentiallyEmpty(node.alternatives)) {
					// we don't handle trivial accept/reject based on emptiness
					return;
				}

				const direction = assertionKindToMatchingDirection(node.kind);
				const after = getFirstCharAfter(node, direction, flags);
				if (after.edge) {
					return;
				}

				const firstOf = getFirstCharConsumedBy(node.alternatives, direction, flags);
				if (firstOf.empty) {
					return;
				}

				// the idea here is that a negate lookaround accepts when non-negated version reject and vise versa.
				const accept = node.negate ? "reject" : "accept";
				const reject = node.negate ? "accept" : "reject";

				const nodeName = `${node.negate ? "negative " : ""}${node.kind} ${mention(node)}`;

				// Careful now! If exact is false, we are only guaranteed to have a superset of the actual character.
				// False negatives are fine but we can't have false positives.

				if (after.char.isDisjointWith(firstOf.char)) {
					context.report({
						message: `The ${nodeName} will always ${reject}.`,
						...reportElement(node),
					});
				}

				// accept is harder because that can't generally be decided by the first character

				// if this contains another assertion then that might reject. It's out of our control
				if (!hasSomeDescendant(node, d => d !== node && d.type === "Assertion")) {
					const range = getLengthRange(node.alternatives);
					// we only check the first character, so it's only correct if the assertion requires only one
					// character
					if (range.max === 1) {
						// require exactness
						if (firstOf.exact && after.char.isSubsetOf(firstOf.char)) {
							context.report({
								message: `The ${nodeName} will always ${accept}.`,
								...reportElement(node),
							});
						}
					}
				}
			}

			visitAST({
				onAssertionEnter(node) {
					switch (node.kind) {
						case "start":
						case "end":
							checkStartOrEnd(node);
							break;

						case "word":
							checkWordBoundary(node);
							break;

						case "lookahead":
						case "lookbehind":
							checkLookaround(node);
							break;

						default:
							throw assertNever(node);
					}
				},
			});
		});
	},
} as CleanRegexRule;

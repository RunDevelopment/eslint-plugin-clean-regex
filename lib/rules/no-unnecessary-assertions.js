"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const { JS } = require("refa");
const util = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow always accepting or rejecting assertions.",
			category: "Best Practices",
			url: getDocUrl(__filename)
		}
	},

	create(context) {

		return createRuleListener(({ visitAST, flags, reportElement }) => {

			/**
			 * @param {import("regexpp/ast").EdgeAssertion} node
			 */
			function checkStartOrEnd(node) {
				// Note: /^/ is the same as /(?<!.)/s and /^/m is the same as /(?<!.)/
				// Note: /$/ is the same as /(?!.)/s and /$/m is the same as /(?!.)/

				// get the "next" character
				const direction = node.kind === "start" ? "rtl" : "ltr";
				const nextChar = util.getFirstCharAfter(node, direction, flags);

				const followed = node.kind === "end" ? "followed" : "preceded";

				if (nextChar.nonEmpty) {
					// there is always some character of `node`

					if (!flags.multiline) {
						// since the m flag isn't present any character will result in trivial rejection
						context.report({
							message: `'${node.raw}' will always reject because it is ${followed} by a character.`,
							...reportElement(node)
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
								message: `'${node.raw}' will always reject because it is ${followed} by a non-line-terminator character.`,
								...reportElement(node)
							});
						} else if (nextChar.char.isDisjointWith(dot)) {
							context.report({
								message: `'${node.raw}' will always accept because it is ${followed} by a line-terminator character.`,
								...reportElement(node)
							});
						}
					}
				}
			}

			/**
			 * @param {import("regexpp/ast").WordBoundaryAssertion} node
			 */
			function checkWordBoundary(node) {
				const word = JS.createCharSet([{ kind: "word", negate: false }], flags);

				const next = util.getFirstCharAfter(node, "ltr", flags);
				const prev = util.getFirstCharAfter(node, "rtl", flags);

				if (!prev.nonEmpty || !next.nonEmpty) {
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
							message: `'${node.raw}' will always ${accept} because it is preceded by a non-word character and followed by a word character.`,
							...reportElement(node)
						});
					}
					if (nextIsNonWord) {
						context.report({
							message: `'${node.raw}' will always ${reject} because it is preceded by a non-word character and followed by a non-word character.`,
							...reportElement(node)
						});
					}
				}
				if (prevIsWord) {
					// current branch: /(?<=\w)(?!\w)/

					if (nextIsNonWord) {
						context.report({
							message: `'${node.raw}' will always ${accept} because it is preceded by a word character and followed by a non-word character.`,
							...reportElement(node)
						});
					}
					if (nextIsWord) {
						context.report({
							message: `'${node.raw}' will always ${reject} because it is preceded by a word character and followed by a word character.`,
							...reportElement(node)
						});
					}
				}
			}

			/**
			 * @param {import("regexpp/ast").LookaroundAssertion} node
			 */
			function checkLookaround(node) {
				if (util.isPotentiallyEmpty(node.alternatives)) {
					// we don't handle trivial accept/reject based on emptiness
					return;
				}

				const direction = node.kind === "lookahead" ? "ltr" : "rtl";
				const after = util.getFirstCharAfter(node, direction, flags);
				if (!after.nonEmpty) {
					return;
				}

				const firstOf = util.getFirstCharOf(node.alternatives, direction, flags);
				if (!firstOf.nonEmpty) {
					return;
				}

				// the idea here is that a negate lookaround accepts when non-negated version reject and vise versa.
				const accept = node.negate ? "reject" : "accept";
				const reject = node.negate ? "accept" : "reject";

				// Careful now! If exact is false, we are only guaranteed to have a superset of the actual character.
				// False negatives are fine but we can't have false positives.

				if (after.char.isDisjointWith(firstOf.char)) {
					context.report({
						message: `The ${node.kind} will always ${reject}.`,
						...reportElement(node)
					});
				}

				// accept is harder because that can't generally be decided by the first character

				// if this contains another assertion then that might reject. It's out of our control
				if (!util.hasSomeDescendant(node, d => d !== node && d.type === "Assertion")) {
					const range = util.getLengthRange(node.alternatives);
					// we only check the first character, so it's only correct if the assertion requires only one
					// character
					if (range.max === 1) {
						// require exactness
						if (firstOf.exact && after.char.isSubsetOf(firstOf.char)) {
							context.report({
								message: `The ${node.kind} will always ${accept}.`,
								...reportElement(node)
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
							throw util.assertNever(node);
					}
				}
			});

		});
	}
};

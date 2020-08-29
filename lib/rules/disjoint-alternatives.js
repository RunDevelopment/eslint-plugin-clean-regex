"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const { toRegExpString, mention } = require("../format");
const util = require("../util");
const { JS, NFA } = require("refa");

/**
 * @typedef {import("regexpp/ast").Node} Node
 * @typedef {import("regexpp/ast").Alternative} Alternative
 *
 * @typedef {import("refa").ReadonlyNFA} ReadonlyNFA
 */



/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow different alternatives that can match the same words.",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ visitAST, flags, pattern, reportElement }) => {

			const parser = JS.Parser.fromAst({ pattern, flags });

			/**
			 * Converts the given alternative to an NFA. The returned NFA does not accept the empty string.
			 *
			 * @param {Alternative} alt
			 * @returns {ReadonlyNFA}
			 */
			function toNfa(alt) {
				const result = parser.parseElement(alt, { lookarounds: "disable" });
				const nfa = NFA.fromRegex(result.expression, { maxCharacter: result.maxCharacter });
				nfa.removeEmptyWord();
				return nfa;
			}

			/**
			 * @param {Alternative[]} alternatives
			 * @param {ReadonlyNFA} subset
			 * @returns {Alternative[]}
			 */
			function findFirstSuperset(alternatives, subset) {
				for (const alt of alternatives) {
					if (util.nfaIsSupersetOf(toNfa(alt), subset)) {
						return [alt];
					}
				}
				return [];
			}
			/**
			 * @param {Alternative[]} alternatives
			 * @param {ReadonlyNFA} set
			 * @returns {Alternative[] }
			 */
			function findNonDisjoint(alternatives, set) {
				return alternatives.filter(alt => {
					return !areDisjoint(toNfa(alt), set);
				});
			}
			/**
			 * @param {ReadonlyNFA} a
			 * @param {ReadonlyNFA} b
			 * @returns {boolean}
			 */
			function areDisjoint(a, b) {
				return a.isDisjointWith(b, {
					// limit the number of nodes that can be created during the intersection
					maxNodes: 1000
				});
			}

			/**
			 * @param {readonly Alternative[]} alternatives
			 * @returns {Result}
			 *
			 * @typedef {"disjoint" | "reported"} Result
			 */
			function checkAlternatives(alternatives) {
				if (alternatives.length < 2) {
					return "disjoint";
				}

				/** @type {Result} */
				let result = "disjoint";

				/** @type {NFA | undefined} */
				let total = undefined;
				for (const alt of alternatives) {
					const isLast = alt === alternatives[alternatives.length - 1];
					const nfa = toNfa(alt);

					if (nfa.isEmpty) {
						// skip this alternative
					} else if (!total) {
						if (!isLast) {
							total = nfa.copy();
						}
					} else if (areDisjoint(total, nfa)) {
						if (!isLast) {
							total.union(nfa);
						}
					} else {
						const altIndex = alternatives.indexOf(alt);
						const beforeAlternatives = alternatives.slice(0, altIndex);

						const intersection = NFA.intersect(total, nfa);
						const isSubset = util.nfaEquals(nfa, intersection);

						// try to find the alternatives that are not disjoint with this one
						const cause = isSubset ? findFirstSuperset(beforeAlternatives, nfa) : [];
						if (cause.length === 0) {
							cause.push(...findNonDisjoint(beforeAlternatives, nfa));
						}
						const causeMsg = cause
							? cause.map(mention).join(" | ")
							: "the previous one(s)";

						// find out whether this alternative is a superset of the cause
						const isSuperset = util.nfaIsSupersetOf(nfa, util.nfaUnionAll(cause.map(toNfa), nfa.options));

						let message;
						if (isSubset) {
							message = isSuperset
								? `This alternative is the same as ${causeMsg} and can be removed.`
								: `This alternative is a subset of ${causeMsg} and can be removed.`;

							// warn that the alternative contains a capturing group
							if (util.hasSomeDescendant(alt, d => d.type === "CapturingGroup")) {
								message += " This alternative contains a capturing group so be careful when removing.";
							}
						} else {
							message = isSuperset
								? `This alternative is a superset of ${causeMsg}.`
								: (`This alternative is not disjoint with ${causeMsg}.`
									+ ` The shared language is ${toRegExpString(intersection)}.`);
						}

						// whether this ambiguity might cause exponential backtracking
						if (util.underAStar(alt)) {
							message += " This alternative is likely to cause exponential backtracking.";
						}

						context.report({
							message,
							...reportElement(alt)
						});
						result = "reported";
					}
				}

				return result;
			}

			/** @type {Set<Node>} */
			const ignoreNodes = new Set();
			/**
			 * @param {Node} node
			 */
			function ignoreParents(node) {
				for (let parent = node.parent; parent; parent = parent.parent) {
					ignoreNodes.add(parent);
				}
			}
			/**
			 * @param {import("regexpp/ast").Group | import("regexpp/ast").CapturingGroup | import("regexpp/ast").LookaroundAssertion | import("regexpp/ast").Pattern} node
			 * @returns {void}
			 */
			function process(node) {
				if (!ignoreNodes.has(node)) {
					if (checkAlternatives(node.alternatives) === "reported") {
						ignoreParents(node);
					}
				}
			}

			visitAST({
				onAssertionLeave(node) {
					if (node.kind === "lookahead" || node.kind === "lookbehind") {
						process(node);
					}
				},
				onCapturingGroupLeave: process,
				onGroupLeave: process,
				onPatternLeave: process,
			});

		});
	}
};

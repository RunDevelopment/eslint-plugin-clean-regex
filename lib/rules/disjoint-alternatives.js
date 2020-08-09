"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");
const { JS, NFA, TooManyNodesError } = require("refa");


/**
 * @param {import("regexpp/ast").Node | null} node
 * @returns {number}
 */
function underAStar(node) {
	if (node == null) {
		return 1;
	} else {
		const parent = underAStar(node.parent);
		if (node.type === "Quantifier") {
			if (node.max === 0 || parent === 0) {
				return 0;
			} else {
				return parent * node.max;
			}
		} else {
			return parent;
		}
	}
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: ".",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		const exponentialOnly = false;

		return createRuleListener(({ visitAST, flags, pattern, reportElement }) => {

			const parser = JS.Parser.fromAst({ pattern, flags });

			/**
			 * @param {readonly import("regexpp/ast").Alternative[]} alternatives
			 * @returns {Result}
			 *
			 * @typedef {"disjoint" | "reported"} Result
			 */
			function checkAlternatives(alternatives) {
				if (alternatives.length < 2) {
					return "disjoint";
				}

				/** @type {NFA | undefined} */
				let total = undefined;
				for (const alt of alternatives) {
					const result = parser.parseElement(alt, { lookarounds: "disable" });
					const nfa = NFA.fromRegex(result.expression, { maxCharacter: result.maxCharacter });
					nfa.removeEmptyWord();

					if (!total) {
						total = nfa;
					} else {
						let isDisjoint;
						try {
							isDisjoint = total.isDisjointWith(nfa, {
								// limit the number of nodes that can be created during the intersection
								maxNodes: 1000
							});
						} catch (e) {
							if (e instanceof TooManyNodesError) {
								isDisjoint = true;
							}
							throw e;
						}

						if (isDisjoint) {
							total.union(nfa);
						} else {
							const intersection = JS.toSource(NFA.intersect(total, nfa).toRegex());
							const exp = util.hasSomeAncestor(alt, a => a.type === "Quantifier" && a.max > 10);
							const expMessage = exp ? "This is likely to cause exponential backtracking. " : "";
							context.report({
								message: "This alternative is not disjoint with the previous one(s). " + expMessage
									+ `The shared language is /${intersection}/.`,
								...reportElement(alt)
							});
							return "reported";
						}
					}
				}
				return "disjoint";
			}

			/** @type {Set<import("regexpp/ast").Node>} */
			const ignoreNodes = new Set();
			/**
			 * @param {import("regexpp/ast").Node} node
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
					try {
						if (!exponentialOnly || underAStar(node) > 20) {
							if (checkAlternatives(node.alternatives) === "reported") {
								ignoreParents(node);
							}
						}
					} catch (error) {
						console.dir(node.raw);
						throw error;
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

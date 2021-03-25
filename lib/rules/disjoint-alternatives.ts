import { JS, NFA, ReadonlyNFA, TooManyNodesError } from "refa";
import { Alternative, CapturingGroup, Group, LookaroundAssertion, Node, Pattern } from "regexpp/ast";
import { mention, toRegExpString } from "../format";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { hasSomeDescendant, underAStar } from "../ast-util";
import { nfaEquals, nfaIsSupersetOf, nfaUnionAll } from "../fa-util";

export default {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow different alternatives that can match the same words.",
			url: getDocUrl(/* #GENERATED */ "disjoint-alternatives"),
		},
	},

	create(context) {
		return createRuleListener(({ visitAST, flags, pattern, reportElement }) => {
			const parser = JS.Parser.fromAst({ pattern, flags });

			/**
			 * Converts the given alternative to an NFA. The returned NFA does not accept the empty string.
			 */
			function toNfa(alt: Alternative): ReadonlyNFA {
				try {
					const result = parser.parseElement(alt, { backreferences: "disable", assertions: "disable" });
					const nfa = NFA.fromRegex(result.expression, { maxCharacter: result.maxCharacter });
					nfa.withoutEmptyWord();
					return nfa;
				} catch (e) {
					// the NFA construction might fail because the NFA is too big
					if (e instanceof TooManyNodesError) {
						return NFA.empty({ maxCharacter: flags.unicode ? 0x10ffff : 0xffff });
					}

					throw e;
				}
			}

			function findFirstSuperset(alternatives: Alternative[], subset: ReadonlyNFA): Alternative[] {
				for (const alt of alternatives) {
					if (nfaIsSupersetOf(toNfa(alt), subset)) {
						return [alt];
					}
				}
				return [];
			}
			function findNonDisjoint(alternatives: Alternative[], set: ReadonlyNFA): Alternative[] {
				return alternatives.filter(alt => {
					return !areDisjoint(toNfa(alt), set);
				});
			}
			function areDisjoint(a: ReadonlyNFA, b: ReadonlyNFA): boolean {
				return a.isDisjointWith(b, {
					// limit the number of nodes that can be created during the intersection
					maxNodes: 1000,
				});
			}

			type Result = "disjoint" | "reported";
			function checkAlternatives(alternatives: readonly Alternative[]): Result {
				if (alternatives.length < 2) {
					return "disjoint";
				}

				let result: Result = "disjoint";

				let total: NFA | undefined = undefined;
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

						const intersection = NFA.fromIntersection(total, nfa);
						const isSubset = nfaEquals(nfa, intersection);

						// try to find the alternatives that are not disjoint with this one
						const cause = isSubset ? findFirstSuperset(beforeAlternatives, nfa) : [];
						if (cause.length === 0) {
							cause.push(...findNonDisjoint(beforeAlternatives, nfa));
						}
						const causeMsg = cause ? cause.map(mention).join(" | ") : "the previous one(s)";

						// find out whether this alternative is a superset of the cause
						const isSuperset = nfaIsSupersetOf(nfa, nfaUnionAll(cause.map(toNfa), nfa.options));

						let message;
						if (isSubset) {
							message = isSuperset
								? `This alternative is the same as ${causeMsg} and can be removed.`
								: `This alternative is a subset of ${causeMsg} and can be removed.`;

							// warn that the alternative contains a capturing group
							if (hasSomeDescendant(alt, d => d.type === "CapturingGroup")) {
								message += " This alternative contains a capturing group so be careful when removing.";
							}
						} else {
							let sharedLanguageMsg;
							try {
								sharedLanguageMsg = ` The shared language is ${toRegExpString(intersection)}.`;
							} catch (e) {
								// the regex of the intersection might be too big in which case the implementation will
								// throw an error
								sharedLanguageMsg = "";
							}
							message = isSuperset
								? `This alternative is a superset of ${causeMsg}.`
								: `This alternative is not disjoint with ${causeMsg}.${sharedLanguageMsg}`;
						}

						// whether this ambiguity might cause exponential backtracking
						if (underAStar(alt)) {
							message += " This alternative is likely to cause exponential backtracking.";
						}

						context.report({
							message,
							...reportElement(alt),
						});
						result = "reported";
					}
				}

				return result;
			}

			const ignoreNodes: Set<Node> = new Set();
			function ignoreParents(node: Node): void {
				for (let parent = node.parent; parent; parent = parent.parent) {
					ignoreNodes.add(parent);
				}
			}
			function process(node: Group | CapturingGroup | LookaroundAssertion | Pattern): void {
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
	},
} as CleanRegexRule;

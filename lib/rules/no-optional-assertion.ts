import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { mention } from "../format";
import { Assertion, CapturingGroup, Group, Node, Quantifier } from "regexpp/ast";
import { assertNever } from "../util";
import { isZeroLength } from "../ast-util";

/**
 * Returns the closest ascendant quantifier with a minimum of 0.
 */
function getZeroQuantifier(node: Node): (Quantifier & { min: 0 }) | null {
	if (node.type === "Quantifier" && node.min === 0) {
		return node as Quantifier & { min: 0 };
	} else if (node.parent) {
		return getZeroQuantifier(node.parent);
	} else {
		return null;
	}
}

/**
 * Returns whether the given assertion is optional in regard to the given quantifier with a minimum of 0.
 *
 * Optional means that all paths in the element if the quantifier which contain the given assertion also have do not
 * consume characters. For more information and examples on optional assertions, see the documentation page of this
 * rule.
 */
function isOptional(assertion: Assertion, quantifier: Quantifier & { min: 0 }): boolean {
	/**
	 * This will implement a bottom-up approach.
	 */
	function isOptionalImpl(element: Assertion | Quantifier | Group | CapturingGroup): boolean {
		if (element.parent === quantifier) {
			// We reached the top.
			// If we made it this far, we could not disprove that the assertion is optional, so it has to optional.
			return true;
		}

		const parent = element.parent;
		if (parent.type === "Alternative") {
			// make sure that all element before and after are zero length
			for (const e of parent.elements) {
				if (e === element) {
					continue; // we will ignore this element.
				}

				if (!isZeroLength(e)) {
					// Some element around our target element can possibly consume characters.
					// This means, we found a path from or to the assertion which can consume characters.
					return false;
				}
			}

			if (parent.parent.type === "Pattern") {
				throw new Error("The given assertion is not a descendant of the given quantifier.");
			} else {
				return isOptionalImpl(parent.parent);
			}
		} else if (parent.type === "Quantifier") {
			if (parent.max > 1 && !isZeroLength(parent)) {
				// If an ascendant quantifier of the element has maximum of 2 or more, we have to check whether
				// the quantifier itself has zero length.
				// E.g. in /(?:a|(\b|-){2})?/ the \b is not optional
				return false;
			}

			return isOptionalImpl(parent);
		} else {
			throw assertNever(parent);
		}
	}

	return isOptionalImpl(assertion);
}

export default {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow optional assertions.",
			url: getDocUrl(/* #GENERATED */ "no-optional-assertion"),
		},
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {
			visitAST({
				onAssertionEnter(node) {
					const q = getZeroQuantifier(node);

					if (q && isOptional(node, q)) {
						context.report({
							message:
								"This assertion effectively optional and does not change the pattern." +
								` Either remove the assertion or change the parent quantifier ${mention(
									q.raw.substr(q.element.raw.length)
								)}.`,
							...reportElement(node),
						});
					}
				},
			});
		});
	},
} as CleanRegexRule;

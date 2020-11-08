import { Group, QuantifiableElement } from "regexpp/ast";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { areEqual } from "../ast-util";

/**
 * Returns whether the given group is the top-level group of its pattern.
 *
 * A pattern with a top-level groups is of the form `/(?:...)/flags`.
 */
function isTopLevel(group: Group): boolean {
	const parent = group.parent;
	if (parent.type === "Alternative" && parent.elements.length === 1) {
		const parentParent = parent.parent;
		if (parentParent.type === "Pattern" && parentParent.alternatives.length === 1) {
			return true;
		}
	}
	return false;
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow unnecessary non-capturing groups.",
			url: getDocUrl(/* #GENERATED */ "no-unnecessary-group"),
		},
		fixable: "code",
	},

	create(context) {
		const options = context.options[0] || {};
		const allowTop = !!options.allowTop;

		return createRuleListener(({ visitAST, pattern, parseExpression, replaceElement }) => {
			visitAST({
				onGroupEnter(node) {
					if (allowTop && isTopLevel(node)) {
						return;
					}

					// If the pattern is empty, there's nothing we can do.
					if (pattern.raw === "(?:)") {
						return;
					}

					const groupContent = node.raw.substr("(?:".length, node.raw.length - "(?:)".length);

					// If the parent alternative contains only this group, it's unnecessary
					if (node.parent.type === "Alternative" && node.parent.elements.length === 1) {
						context.report({
							message: "Unnecessary non-capturing group.",
							...replaceElement(node, groupContent),
						});
						return;
					}

					// With more than one alternative the group is always necessary
					// (The number of alternatives cannot be zero.)
					// e.g. (?:a|b)
					if (node.alternatives.length !== 1) {
						return;
					}

					const elements = node.alternatives[0].elements;
					const parent = node.parent;

					if (parent.type === "Quantifier") {
						// With zero or more than one element quantified the group is always necessary
						// e.g. (?:ab)* (?:)*
						if (elements.length !== 1) {
							return;
						}
						// if the single element is not quantifiable
						// e.g. (?:\b)* (?:a{2})*
						const type = elements[0].type;
						if (type === "Assertion" || type === "Quantifier") {
							return;
						}
					}

					// remove the group in the source
					const beforeGroup = pattern.raw.substr(0, node.start - pattern.start);
					const afterGroup = pattern.raw.substr(node.end - pattern.start);
					const withoutGroup = beforeGroup + groupContent + afterGroup;

					// if the expression without the group is syntactically valid and semantically equivalent to
					// the expression with the group, the group is unnecessary.
					// Because of backreferences we have to parse the whole pattern. I.e. the parser will interpret \10
					// as the a reference to the tenth capturing group it exists and as \x08 otherwise.
					const ast = parseExpression(withoutGroup);
					if (ast) {
						// replace the group with its contents in the original AST

						let equal;
						if (parent.type === "Alternative") {
							const parentIndex = parent.elements.indexOf(node);

							const oldElements = parent.elements;
							const newElements = [
								...parent.elements.slice(0, parentIndex),
								...elements,
								...parent.elements.slice(parentIndex + 1),
							];

							parent.elements = newElements;

							try {
								equal = areEqual(pattern, ast);
							} finally {
								// switch back
								parent.elements = oldElements;
							}
						} else {
							// we can do this because we check at the beginning of the function that
							//  1) there is exactly one element
							//  2) the element is quantifiable
							parent.element = elements[0] as QuantifiableElement;

							try {
								equal = areEqual(pattern, ast);
							} finally {
								// switch back
								parent.element = node;
							}
						}

						if (equal) {
							context.report({
								message: "Unnecessary non-capturing group.",
								...replaceElement(node, groupContent),
							});
						}
					}
				},
			});
		});
	},
} as CleanRegexRule;

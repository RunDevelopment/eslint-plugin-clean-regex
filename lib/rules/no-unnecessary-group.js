"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow unnecessary non-capturing groups.",
			category: "Best Practices",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {
		return createRuleListener(({ visitAST, pattern, parseExpression, replaceElement }) => {

			visitAST({
				onGroupEnter(node) {

					// If the pattern is empty, there's nothing we can do.
					if ((util.getPattern(node) || {}).raw === "(?:)") {
						return;
					}

					const groupContent = node.raw.substr("(?:".length, node.raw.length - "(?:)".length);

					// If the parent alternative contains only this group, it's unnecessary
					if (node.parent.type === "Alternative" && node.parent.elements.length === 1) {
						context.report({
							message: "Unnecessary non-capturing group.",
							...replaceElement(node, groupContent)
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
								...parent.elements.slice(parentIndex + 1)
							];

							parent.elements = newElements;

							equal = util.areEqual(pattern, ast);

							// switch back
							parent.elements = oldElements;
						} else {
							// we can do this because we check at the beginning of the function that
							//  1) there is exactly one element
							//  2) the element is quantifiable
							parent.element = /** @type {import("regexpp/ast").QuantifiableElement} */ (elements[0]);

							equal = util.areEqual(pattern, ast);

							// switch back
							parent.element = node;
						}

						if (equal) {
							context.report({
								message: "Unnecessary non-capturing group.",
								...replaceElement(node, groupContent)
							});
						}
					}
				}
			});

		});
	}
};

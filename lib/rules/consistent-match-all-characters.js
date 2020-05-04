"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");

/**
 * @typedef {import("regexpp/ast").CharacterClass} CharacterClass
 * @typedef {import("regexpp/ast").CharacterSet} CharacterSet
 * @typedef {import("regexpp/ast").CharacterClassElement} CharacterClassElement
 * @typedef {import("regexpp/ast").AnyCharacterSet} AnyCharacterSet
 * @typedef {import("regexpp/ast").Flags} Flags
 * @typedef {import("regexpp/ast").Node} Node
 */


/**
 *
 * @param {(CharacterClassElement | CharacterSet)[]} elements
 * @param {Readonly<Flags>} flags
 * @returns {boolean}
 */
function doMatchAll(elements, flags) {
	return util.toCharSet(elements, flags).isAll;
}

/**
 *
 * @param {(T & { node: Node })[]} nodes
 * @returns {T[]}
 * @template T
 */
function removeDescendantNodes(nodes) {
	// this is a O(n^2) implementation
	// by sorting the nodes and using binary search, this can be implemented in O(n * log(n))

	return nodes.filter(({ node }) => {
		return !nodes.some(({ node: n }) => n != node && n.start <= node.start && n.end >= node.end);
	});
}

/**
 * @typedef {"dot" | "dot-if-dotAll" | "char-class"} Mode
 * @type {Mode[]}
 */
const modes = ["dot", "dot-if-dotAll", "char-class"];

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Use a certain character class consistently whenever all characters have to be matched.",
			category: "Best Practices",
			url: getDocUrl(__filename)
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					mode: {
						type: "string",
						enum: modes
					},
					charClass: {
						type: "string"
					}
				},
				additionalProperties: false
			}
		]
	},

	create(context) {
		const options = (context.options[0] || {});
		/** @type {Mode} */
		const mode = options.mode || "dot-if-dotAll";
		/** @type {string} */
		const charClass = options.charClass || "[\\s\\S]";

		/**
		 * @param {Readonly<Flags>} flags
		 * @returns {string}
		 */
		function getReplacement(flags) {
			switch (mode) {
				case "dot":
					return ".";

				case "dot-if-dotAll":
					if (flags.dotAll) {
						return ".";
					} else {
						return charClass;
					}

				case "char-class":
					return charClass;

				default:
					throw util.assertNever(mode);
			}
		}

		return createRuleListener(({ visitAST, pattern, flags, replaceElement, replaceLiteral }) => {

			const replacement = getReplacement(flags);

			/** @type {{ node: CharacterClass | AnyCharacterSet; message: string; replacement: string }[]} */
			let nodesToReplace = [];

			visitAST({
				onCharacterClassEnter(node) {
					if (node.raw === replacement) {
						// already correct
						return;
					}

					let doesMatchAll;
					if (node.negate) {
						doesMatchAll = node.elements.length === 0;
					} else {
						doesMatchAll = doMatchAll(node.elements, flags);
					}

					if (doesMatchAll) {
						nodesToReplace.push({
							node,
							message: `Replace this character class with '${replacement}'.`,
							replacement
						});
					}
				},

				onCharacterSetEnter(node) {
					if (node.kind === "any" && flags.dotAll && replacement !== ".") {
						nodesToReplace.push({
							node,
							message: `Replace this dot with '${replacement}'.`,
							replacement
						});
					}
				}
			});

			// remove nodes contained by other nodes
			nodesToReplace = removeDescendantNodes(nodesToReplace);

			// nothing to report
			if (nodesToReplace.length === 0) {
				return;
			}

			if ((replacement === ".") === flags.dotAll) {
				// we don't need to change the flags, so just report all
				nodesToReplace.forEach(({ node, message, replacement }) => {
					context.report({
						message: message,
						...replaceElement(node, replacement)
					});
				});
			} else {
				let newFlags;
				if (replacement === ".") {
					// add s flag
					newFlags = flags.raw + "s";
					// This is a bit trickier because the sorted-flags rule. If the flags are sorted, we will insert s
					// at the correct position, but if they aren't, we will just append the s.
					if (flags.raw === [...flags.raw].sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0)).join("")) {
						// sorted
						newFlags = [...newFlags].sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0)).join("");
					}
				} else {
					// remove s flag
					newFlags = flags.raw.replace(/s/, "");
				}


				// sort replacements
				nodesToReplace.sort((a, b) => a.node.start - b.node.start);

				// create new pattern
				const oldPattern = pattern.raw;
				let lastEndIndex = 0;
				let newPattern = "";

				for (const { node, replacement } of nodesToReplace) {
					newPattern += oldPattern.substr(lastEndIndex, node.start);
					newPattern += replacement;
					lastEndIndex = node.end;
				}
				newPattern += oldPattern.substr(lastEndIndex);

				context.report({
					message: `${nodesToReplace.length} element(s) in the pattern will be replaced with ${replacement} and the s flag will be ${replacement === "." ? "added" : "removed"}.`,
					...replaceLiteral(newPattern, newFlags)
				});
			}
		});
	}
};

/**
 * @typedef {import("eslint").Rule.RuleListener} RuleListener
 * @typedef {import("estree").RegExpLiteral} RegExpLiteral
 * @typedef {import("estree").SourceLocation} SourceLocation
 * @typedef {import("eslint").Rule.RuleFixer} RuleFixer
 * @typedef {import("eslint").Rule.Fix} Fix
 */

/**
 * @typedef RegexRuleListener
 * @property {(this: RuleListener, node: RegExpLiteral) => void} [RegexLiteral]
 */


const util = {
	/**
	 *
	 * @param {RegexRuleListener} rules
	 * @returns {RuleListener}
	 */
	createRuleListener(rules) {
		return {
			Literal(node) {
				const regexNode = /** @type {RegExpLiteral} */ (node);
				if (typeof regexNode.regex === "object") {
					rules.RegexLiteral && rules.RegexLiteral.call(this, regexNode);
				}
			}
		};
	},

	/**
	 *
	 * @param {SourceLocation} loc
	 * @returns {SourceLocation}
	 */
	copyLoc(loc) {
		return {
			start: { ...loc.start },
			end: { ...loc.end }
		};
	},

	/**
	 *
	 * @param {RegExpLiteral} node
	 * @returns {SourceLocation}
	 */
	locOfRegexFlags(node) {
		const loc = util.copyLoc(node.loc);
		const flagCount = Math.max(1, node.regex.flags.length);
		loc.start.column = loc.end.column - flagCount;
		return loc;
	},

	/**
	 *
	 * @param {RegExpLiteral} node
	 * @param {import("regexpp/ast").Element | import("regexpp/ast").CharacterClassElement} element
	 * @returns {SourceLocation}
	 */
	locOfElement(node, element) {
		const loc = util.copyLoc(node.loc);
		const offset = loc.start.column + "/".length;
		loc.start.column = offset + element.start;
		loc.end.column = offset + element.end;
		return loc;
	},

	/**
	 *
	 * @param {RuleFixer} fixer
	 * @param {RegExpLiteral} node
	 * @param {import("regexpp/ast").Element | import("regexpp/ast").CharacterClassElement} element
	 * @param {string} replacement
	 * @returns {Fix}
	 */
	replaceElement(fixer, node, element, replacement) {
		const offset = node.range[0] + "/".length;
		return fixer.replaceTextRange([offset + element.start, offset + element.end], replacement);
	},

	/**
	 * Replaces the flags of the given regex literal with the given string.
	 *
	 * @param {RuleFixer} fixer
	 * @param {RegExpLiteral} node
	 * @param {string} replacement
	 * @returns {Fix}
	 */
	replaceFlags(fixer, node, replacement) {
		const start = node.range[1] - node.regex.flags.length;
		return fixer.replaceTextRange([start, node.range[1]], replacement);
	},

	/**
	 * Returns an element with the details of the report of the given element.
	 *
	 * @param {RegExpLiteral} node
	 * @param {import("regexpp/ast").Element | import("regexpp/ast").CharacterClassElement} element
	 * @param {string} [replacement]
	 * @returns {{ loc: SourceLocation, fix?: (fixer: RuleFixer) => Fix }}
	 */
	reportElement(node, element, replacement) {
		return {
			loc: util.locOfElement(node, element),
			fix: typeof replacement === "undefined" ? undefined : function (fixer) {
				return util.replaceElement(fixer, node, element, replacement);
			}
		};
	},
	/**
	 *
	 *
	 * @param {RegExpLiteral} node
	 * @param {string} [replacement]
	 * @returns {{ loc: SourceLocation, fix?: (fixer: RuleFixer) => Fix }}
	 */
	reportFlags(node, replacement) {
		return {
			loc: util.locOfRegexFlags(node),
			fix: typeof replacement === "undefined" ? undefined : function (fixer) {
				return util.replaceFlags(fixer, node, replacement);
			}
		};
	},
};

module.exports = util;

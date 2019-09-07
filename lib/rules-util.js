const { RegExpParser } = require("regexpp");
const { filenameToRule } = require("./util");

/**
 * @typedef {import("eslint").Rule.RuleListener} RuleListener
 * @typedef {import("estree").RegExpLiteral} RegExpLiteral
 * @typedef {import("estree").SourceLocation} SourceLocation
 * @typedef {import("eslint").Rule.RuleFixer} RuleFixer
 * @typedef {import("eslint").Rule.Fix} Fix
 * @typedef {import("regexpp/ast").Pattern} Pattern
 * @typedef {import("regexpp/ast").Flags} Flags
 * @typedef {import("regexpp/ast").Element} Element
 * @typedef {import("regexpp/ast").Node} Node
 * @typedef {import("regexpp/ast").Quantifier} Quantifier
 */

/**
 * @typedef RegexRuleListenerContext
 * @property {Pattern} pattern
 * @property {Flags} flags
 * @property {(element: Node) => { loc: SourceLocation }} reportElement
 * @property {() => { loc: SourceLocation }} reportFlags
 * @property {(element: Node, replacement: string) => { loc: SourceLocation, fix: (fixer: RuleFixer) => Fix }} replaceElement
 * @property {(replacement: string) => { loc: SourceLocation, fix: (fixer: RuleFixer) => Fix }} replaceFlags
 * @property {(element: Node) => { loc: SourceLocation, fix: (fixer: RuleFixer) => Fix }} removeElement
 * @property {(element: Quantifier, quantifierExpression: string) => { loc: SourceLocation, fix: (fixer: RuleFixer) => Fix }} replaceQuantifier
 * @property {(expression: string) => Pattern | null} parseExpression
 */

const parser = new RegExpParser();
/** @type {Map<string, Pattern | null>} */
const patternCache = new Map();
/** @type {Map<string, Flags | null>} */
const flagsCache = new Map();

/**
 *
 * @param {string} source
 * @param {boolean} uFlag
 * @returns {Pattern | null}
 */
function getPattern(source, uFlag) {
	const key = `${uFlag ? "u" : ""}:${source}`;
	let pattern = patternCache.get(key);
	if (pattern === undefined) {
		pattern = null;
		try {
			pattern = parser.parsePattern(source, undefined, undefined, uFlag);
		} catch (error) { /* no-op */ }
		patternCache.set(key, pattern);
	}
	return pattern;
}

/**
 *
 * @param {string} flags
 * @returns {Flags | null}
 */
function getFlags(flags) {
	const key = flags;
	let f = flagsCache.get(key);
	if (f === undefined) {
		f = null;
		try {
			f = parser.parseFlags(flags);
		} catch (error) { /* no-op */ }
		flagsCache.set(key, f);
	}
	return f;
}


const util = {
	/**
	 *
	 * @param {(context: RegexRuleListenerContext) => void} listener
	 * @returns {RuleListener}
	 */
	createRuleListener(listener) {
		return {
			Literal(node) {
				const regexNode = /** @type {RegExpLiteral} */ (node);
				if (typeof regexNode.regex === "object") {
					const pattern = getPattern(regexNode.regex.pattern, regexNode.regex.flags.indexOf("u") != -1);
					const flags = getFlags(regexNode.regex.flags);

					// both have to be valid
					if (!pattern || !flags) return;

					/** @type {RegexRuleListenerContext} */
					const listenerContext = {
						pattern, flags,

						reportElement(element) {
							return { loc: util.locOfElement(regexNode, element) };
						},
						reportFlags() {
							return { loc: util.locOfRegexFlags(regexNode) };
						},

						replaceElement(element, replacement) {
							return {
								loc: util.locOfElement(regexNode, element),
								fix(fixer) {
									return util.replaceElement(fixer, regexNode, element, replacement);
								}
							};
						},
						replaceFlags(replacement) {
							return {
								loc: util.locOfRegexFlags(regexNode),
								fix(fixer) {
									return util.replaceFlags(fixer, regexNode, replacement);
								}
							};
						},

						removeElement(element) {
							const parent = element.parent;

							if (parent && parent.type === "Alternative" && parent.elements.length === 1) {
								// this element is the only element
								const pattern = parent.parent;
								if (pattern.type === "Pattern" && pattern.alternatives.length === 1) {
									// the whole pattern only has one alternative

									// if this element was removed, the pattern's source would be an empty string which
									// is invalid (//), so replace it with an empty non-capturing group instead.
									return listenerContext.replaceElement(element, "(?:)");
								}
							}

							if (parent && parent.type === "Quantifier") {
								// if this element was removed, the quantifier will quantify the preceding element.
								return listenerContext.replaceElement(element, "(?:)");
							}

							return listenerContext.replaceElement(element, "");
						},
						replaceQuantifier(element, quantifierExpression) {
							const start = element.element.end + 1;
							const end = element.end;
							const rangeOffset = node.range[0] + "/".length;
							const line = node.loc.start.line;

							return {
								loc: {
									start: { line, column: start },
									end: { line, column: end }
								},
								fix(fixer) {
									return fixer.replaceTextRange([rangeOffset + start, rangeOffset + end], quantifierExpression);
								}
							};
						},
						parseExpression(expression) {
							return getPattern(expression, regexNode.regex.flags.indexOf("u") != -1);
						}
					};

					listener.call(this, listenerContext);
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
	 * @param {Node} element
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
	 * @param {Node} element
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

	/**
	 * Returns the URL of the doc of the given rule file.
	 *
	 * @param {string} filename
	 * @returns {string}
	 */
	getDocUrl(filename) {
		const rule = filenameToRule(filename);
		return `https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/${rule}.md`;
	},
};

module.exports = util;

const { RegExpParser } = require("regexpp");

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
 */

/**
 * @typedef RegexRuleListenerContext
 * @property {Pattern} pattern
 * @property {Flags} flags
 * @property {(element: Node) => { loc: SourceLocation }} reportElement
 * @property {() => { loc: SourceLocation }} reportFlags
 * @property {(element: Node, replacement: string) => { loc: SourceLocation, fix: (fixer: RuleFixer) => Fix }} replaceElement
 * @property {(replacement: string) => { loc: SourceLocation, fix: (fixer: RuleFixer) => Fix }} replaceFlags
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

					listener.call(this, {
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
					});
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
};

module.exports = util;

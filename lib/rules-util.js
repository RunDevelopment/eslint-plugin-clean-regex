const { RegExpParser, visitRegExpAST } = require("regexpp");
const { toRegExpString } = require("./format");
const { filenameToRule, repoTreeRoot } = require("./util");

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
 * @typedef {import("regexpp/visitor").RegExpVisitor.Handlers} Handlers
 */

/**
 * @typedef RegexRuleListenerContext
 * @property {Pattern} pattern
 * @property {Flags} flags
 * @property {(handlers: Handlers) => void} visitAST
 * @property {(element: Node) => ReportProps} reportElement
 * @property {(element: Quantifier) => ReportProps} reportQuantifier
 * @property {() => ReportProps} reportFlags
 * @property {(elements: readonly Node[]) => ReportProps} reportElements
 * @property {(patternReplacement: string, flagsReplacement: string) => ReplaceProps} replaceLiteral
 * @property {(element: Node, replacement: string) => ReplaceProps} replaceElement
 * @property {(element: Quantifier, replacement: string) => ReplaceProps} replaceQuantifier
 * @property {(replacement: string) => ReplaceProps} replaceFlags
 * @property {(element: Node) => ReplaceProps} removeElement
 * @property {(expression: string) => Pattern | null} parseExpression
 *
 * @typedef {{ loc: SourceLocation }} ReportProps
 * @typedef {{ loc: SourceLocation, fix: (fixer: RuleFixer) => Fix }} ReplaceProps
 */

const parser = new RegExpParser();
/** @type {Map<string, Pattern | null>} */
const patternCache = new Map();
/** @type {Map<string, Flags | null>} */
const flagsCache = new Map();

/**
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

/**
 * @param {RegExpLiteral} regexNode
 * @returns {RegexRuleListenerContext | null}
 */
function createListenerContext(regexNode) {
	const pattern = getPattern(regexNode.regex.pattern, regexNode.regex.flags.indexOf("u") != -1);
	const flags = getFlags(regexNode.regex.flags);

	// both have to be valid
	if (!pattern || !flags) {
		return null;
	}

	/** @type {RegexRuleListenerContext} */
	const listenerContext = {
		pattern, flags,
		visitAST(handlers) {
			visitRegExpAST(pattern, handlers);
		},

		reportElement(element) {
			return { loc: util.locOfElement(regexNode, element) };
		},
		reportQuantifier(element) {
			return { loc: util.locOfQuantifier(regexNode, element) };
		},
		reportFlags() {
			return { loc: util.locOfRegexFlags(regexNode) };
		},

		reportElements(elements) {
			if (elements.length === 0) {
				throw new Error("There has to be at least one element to report!");
			}

			const locs = elements.map(e => util.locOfElement(regexNode, e));
			let min = locs[0].start;
			let max = locs[0].end;

			for (const { start, end } of locs) {
				if (start.line < min.line || start.line === min.line && start.column <= min.column) {
					min = start;
				}
				if (end.line > max.line || end.line === max.line && end.column >= max.column) {
					max = end;
				}
			}

			return { loc: { start: min, end: max } };
		},

		replaceLiteral(patternReplacement, flagsReplacement) {
			const range = regexNode.range;
			if (!range) {
				throw new Error("The regex literal node does not have a range associated with it.");
			}
			return {
				loc: util.copyLoc(regexNode.loc),
				fix(fixer) {
					return fixer.replaceTextRange(range, toRegExpString({
						source: patternReplacement,
						flags: flagsReplacement,
					}));
				}
			};
		},
		replaceElement(element, replacement) {
			return {
				loc: util.locOfElement(regexNode, element),
				fix(fixer) {
					return util.replaceElement(fixer, regexNode, element, replacement);
				}
			};
		},
		replaceQuantifier(element, replacement) {
			return {
				loc: util.locOfQuantifier(regexNode, element),
				fix(fixer) {
					return util.replaceQuantifier(fixer, regexNode, element, replacement);
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
		parseExpression(expression) {
			return getPattern(expression, regexNode.regex.flags.indexOf("u") != -1);
		}
	};

	return listenerContext;
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
					const listenerContext = createListenerContext(regexNode);
					if (listenerContext !== null) {
						listener.call(this, listenerContext);
					}
				}
			}
		};
	},

	/**
	 *
	 * @param {SourceLocation | undefined | null} loc
	 * @returns {SourceLocation}
	 */
	copyLoc(loc) {
		if (!loc) {
			throw new Error("The node does not include source location information!");
		}
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
	 * @param {RegExpLiteral} node
	 * @param {Quantifier} element
	 * @returns {SourceLocation}
	 */
	locOfQuantifier(node, element) {
		const loc = util.copyLoc(node.loc);
		const offset = loc.start.column + "/".length;
		loc.start.column = offset + element.element.end;
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
		if (!node.range) {
			throw new Error("The given node does not have range information.");
		}

		const offset = node.range[0] + "/".length;
		return fixer.replaceTextRange([offset + element.start, offset + element.end], replacement);
	},

	/**
	 *
	 * @param {RuleFixer} fixer
	 * @param {RegExpLiteral} node
	 * @param {Quantifier} element
	 * @param {string} replacement
	 * @returns {Fix}
	 */
	replaceQuantifier(fixer, node, element, replacement) {
		if (!node.range) {
			throw new Error("The given node does not have range information.");
		}

		const offset = node.range[0] + "/".length;
		return fixer.replaceTextRange([offset + element.element.end, offset + element.end], replacement);
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
		if (!node.range) {
			throw new Error("The given node does not have range information.");
		}

		const start = node.range[1] - node.regex.flags.length;
		return fixer.replaceTextRange([start, node.range[1]], replacement);
	},

	/**
	 * Returns the URL of the doc of the given rule file.
	 *
	 * @param {string} filename
	 * @returns {string}
	 */
	getDocUrl(filename) {
		const rule = filenameToRule(filename);
		return `${repoTreeRoot}/docs/rules/${rule}.md`;
	},
};

module.exports = util;

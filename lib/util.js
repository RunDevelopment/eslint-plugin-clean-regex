"use strict";

const { visitRegExpAST } = require("regexpp");


/**
 * @typedef {import("regexpp/ast").Alternative} Alternative
 * @typedef {import("regexpp/ast").Assertion} Assertion
 * @typedef {import("regexpp/ast").Backreference} Backreference
 * @typedef {import("regexpp/ast").CapturingGroup} CapturingGroup
 * @typedef {import("regexpp/ast").Character} Character
 * @typedef {import("regexpp/ast").CharacterClass} CharacterClass
 * @typedef {import("regexpp/ast").CharacterClassElement} CharacterClassElement
 * @typedef {import("regexpp/ast").CharacterSet} CharacterSet
 * @typedef {import("regexpp/ast").Group} Group
 * @typedef {import("regexpp/ast").Quantifier} Quantifier
 * @typedef {import("regexpp/ast").Element} Element
 * @typedef {import("regexpp/ast").Node} Node
 * @typedef {import("regexpp/ast").Pattern} Pattern
 * @typedef {import("regexpp/ast").Flags} Flags
 * @typedef {import("regexpp/ast").EscapeCharacterSet} EscapeCharacterSet
 * @typedef {import("regexpp/ast").UnicodePropertyCharacterSet} UnicodePropertyCharacterSet
 */

/**
 * @typedef {import("./util-types").Simple<T>} Simple
 * @template T
 */

const util = {

	/**
	 * Returns whether the given node is constant meaning that it can only match one string and what this string is.
	 * If the node is constant, it will return the constant string.
	 *
	 * @param {Node} node
	 * @param {Flags} flags
	 * @returns {false | { word: string }}
	 */
	getConstant(node, flags) {
		switch (node.type) {
			case "Alternative":
				{
					let word = "";
					for (const element of node.elements) {
						const elementResult = util.getConstant(element, flags);
						if (elementResult === false) {
							return false;
						} else {
							word += elementResult.word;
						}
					}
					return { word };
				}
			case "Assertion":
			case "Flags":
				{
					// Assertions are constant because the only affect whether a string matches.
					// Flags are trivially constant
					return { word: "" };
				}
			case "Backreference":
				{
					if (util.isEmptyBackreference(node)) {
						return { word: "" };
					} else {
						// only constant if the expression of the capturing group is constant
						return util.getConstant(node.resolved, flags);
					}
				}
			case "CapturingGroup":
			case "Group":
			case "Pattern":
				{
					if (node.alternatives.length == 0) {
						return { word: "" };
					} else if (node.alternatives.length == 1) {
						return util.getConstant(node.alternatives[0], flags);
					} else {
						/** @type {string | false} */
						let word = false;
						for (const alt of node.alternatives) {
							const altResult = util.getConstant(alt, flags);
							if (altResult === false) {
								return false;
							} else if (word === false) {
								word = altResult.word;
							} else if (word !== altResult.word) {
								return false;
							}
						}
						return word === false ? false : { word };
					}
				}
			case "Character":
				{
					const string = String.fromCodePoint(node.value);
					if (flags.ignoreCase && string.toLowerCase() !== string.toUpperCase()) {
						return false;
					}
					return { word: string };
				}
			case "CharacterClass":
				{
					// Here's a question is the empty character class (`[]` or `[^\s\S]`) constant?
					// I say, no it isn't.
					if (node.negate) {
						// negated character classes are 1) really hard to check and 2) very unlikely to be constant
						return false;
					}

					/** @type {false | string} */
					let word = false;
					for (const element of node.elements) {
						const elementResult = util.getConstant(element, flags);
						if (elementResult === false) {
							return false;
						} else if (word === false) {
							word = elementResult.word;
						} else if (word !== elementResult.word) {
							return false;
						}
					}
					return word === false ? false : { word };
				}
			case "CharacterClassRange":
				{
					return node.min.value == node.max.value && util.getConstant(node.min, flags);
				}
			case "CharacterSet":
				{
					// for themselves, character sets like \w, ., \s are not constant
					return false;
				}
			case "Quantifier":
				{
					if (node.max === 0) {
						return { word: "" };
					}
					const elementResult = util.getConstant(node.element, flags);
					if (elementResult !== false) {
						if (elementResult.word === "") {
							return elementResult;
						} else if (node.min === node.max) {
							let word = "";
							for (let i = node.min; i > 0; i--) {
								word += elementResult.word;
							}
							return { word };
						}
					}
					return false;
				}
			case "RegExpLiteral":
				{
					return util.getConstant(node.pattern, flags);
				}
			default:
				return false;
		}
	},

	/**
	 * Returns whether all paths of the given element don't move the position of the automaton.
	 *
	 * @param {Element} element
	 * @returns {boolean}
	 */
	isZeroLength(element) {
		switch (element.type) {
			case "Assertion":
				return true;

			case "Character":
			case "CharacterClass":
			case "CharacterSet":
				return false;

			case "Quantifier":
				return element.max === 0 || util.isZeroLength(element.element);

			case "Backreference":
				return util.isEmptyBackreference(element);

			case "CapturingGroup":
			case "Group":
				return element.alternatives.every(a => a.elements.every(e => util.isZeroLength(e)));

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * Returns whether at least one path of the given element does not move the position of the automation.
	 *
	 * @param {Element} element
	 * @returns {boolean}
	 */
	isPotentiallyZeroLength(element) {
		switch (element.type) {
			case "Assertion":
				return true;

			case "Backreference":
				if (util.isEmptyBackreference(element)) {
					return true;
				}
				return util.isPotentiallyZeroLength(element.resolved);

			case "Character":
			case "CharacterClass":
			case "CharacterSet":
				return false;

			case "CapturingGroup":
			case "Group":
				return element.alternatives.some(a => a.elements.every(e => util.isPotentiallyZeroLength(e)));

			case "Quantifier":
				return element.min === 0 || util.isPotentiallyZeroLength(element.element);

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * Returns whether all paths of the given element does not move the position of the automation and accept
	 * regardless of prefix and suffix.
	 *
	 * @param {Element | Alternative} element
	 * @returns {boolean}
	 */
	isEmpty(element) {
		switch (element.type) {
			case "Alternative":
				return element.elements.every(util.isEmpty);

			case "Assertion":
				// assertion do not consume characters but they do usually reject some pre- or suffixes
				if (element.kind === "lookahead" || element.kind === "lookbehind") {
					if (!element.negate && element.alternatives.some(util.isPotentiallyEmpty)) {
						// if a positive lookaround is potentially empty, it will trivially accept all pre- or suffixes
						return true;
					}
				}
				return false;

			case "Backreference":
				if (util.isEmptyBackreference(element)) {
					return true;
				}
				return util.isEmpty(element.resolved);

			case "Character":
			case "CharacterClass":
			case "CharacterSet":
				return false;

			case "CapturingGroup":
			case "Group":
				return element.alternatives.every(util.isEmpty);

			case "Quantifier":
				return element.max === 0 || util.isEmpty(element.element);

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * Returns whether at least one path of the given element does not move the position of the automation and accepts
	 * regardless of prefix and suffix.
	 *
	 * This basically means that it can match the empty string and that it does that at any position in any string.
	 * Lookarounds do not affect this as (as mentioned above) all prefixes and suffixes are accepted.
	 *
	 * @param {Element | Alternative} element
	 * @returns {boolean}
	 */
	isPotentiallyEmpty(element) {
		switch (element.type) {
			case "Alternative":
				return element.elements.every(util.isPotentiallyEmpty);

			case "Assertion":
				// assertion do not consume characters but they do usually reject some pre- or suffixes
				if (element.kind === "lookahead" || element.kind === "lookbehind") {
					if (!element.negate && element.alternatives.some(util.isPotentiallyEmpty)) {
						// if a positive lookaround is potentially empty, it will trivially accept all pre- or suffixes
						return true;
					}
				}
				return false;

			case "Backreference":
				if (util.isEmptyBackreference(element)) {
					return true;
				}
				return util.isPotentiallyEmpty(element.resolved);

			case "Character":
			case "CharacterClass":
			case "CharacterSet":
				return false;

			case "CapturingGroup":
			case "Group":
				return element.alternatives.some(util.isPotentiallyEmpty);

			case "Quantifier":
				return element.min === 0 || util.isPotentiallyEmpty(element.element);

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * Returns whether any of the ancestors of the given node fulfill the given condition.
	 *
	 * The ancestors will be iterated in the order from closest to farthest.
	 * The condition function will not be called on the given node.
	 *
	 * @param {Node} node
	 * @param {(ancestor: import("regexpp/ast").BranchNode) => boolean} conditionFn
	 */
	hasSomeAncestor(node, conditionFn) {
		/** @type {Node["parent"]} */
		let parent = node.parent;
		while (parent) {
			if (conditionFn(parent)) {
				return true;
			}
			parent = parent.parent;
		}
		return false;
	},

	/**
	 * Returns whether any of the descendants of the given node fulfill the given condition.
	 *
	 * The descendants will be iterated in a DFS top-to-bottom manner from left to right with the first node being the
	 * given node.
	 *
	 * This function is short-circuited, so as soon as any `conditionFn` returns `true`, `true` will be returned.
	 *
	 * @param {Node & T} node
	 * @param {(descendant: import("./util-types").Descendants<T>) => boolean} conditionFn
	 * @param {(descendant: import("./util-types").Descendants<T>) => boolean} [descentConditionFn] An optional
	 * function to decide whether the descendant of the given node will be checked as well.
	 * @returns {boolean}
	 * @template T
	 */
	hasSomeDescendant(node, conditionFn, descentConditionFn) {
		if (conditionFn(node)) {
			return true;
		}

		if (descentConditionFn && !descentConditionFn(node)) {
			return false;
		}

		switch (node.type) {
			case "Alternative":
				return node.elements.some(e => util.hasSomeDescendant(e, conditionFn, descentConditionFn));
			case "Assertion":
				if (node.kind === "lookahead" || node.kind === "lookbehind") {
					return node.alternatives.some(a => util.hasSomeDescendant(a, conditionFn, descentConditionFn));
				}
				return false;
			case "CapturingGroup":
			case "Group":
			case "Pattern":
				return node.alternatives.some(a => util.hasSomeDescendant(a, conditionFn, descentConditionFn));
			case "CharacterClass":
				return node.elements.some(e => util.hasSomeDescendant(e, conditionFn, descentConditionFn));
			case "CharacterClassRange":
				return util.hasSomeDescendant(node.min, conditionFn, descentConditionFn) ||
					util.hasSomeDescendant(node.max, conditionFn, descentConditionFn);
			case "Quantifier":
				return util.hasSomeDescendant(node.element, conditionFn, descentConditionFn);
			case "RegExpLiteral":
				return util.hasSomeDescendant(node.pattern, conditionFn, descentConditionFn) ||
					util.hasSomeDescendant(node.flags, conditionFn, descentConditionFn);
		}
		return false;
	},

	/**
	 * Returns whether two nodes are semantically equivalent.
	 *
	 * @param {Node | null} x
	 * @param {Node | null} y
	 * @returns {boolean}
	 */
	areEqual(x, y) {
		if (x == y) {
			return true;
		}
		if (!x || !y || x.type != y.type) {
			return false;
		}

		/**
		 *
		 * @param {Node[]} a
		 * @param {Node[]} b
		 * @returns {boolean}
		 */
		function manyAreEqual(a, b) {
			if (a.length !== b.length) {
				return false;
			}
			for (let i = 0; i < a.length; i++) {
				if (!util.areEqual(a[i], b[i])) {
					return false;
				}
			}
			return true;
		}

		/**
		 *
		 * @param {{ alternatives: Alternative[] }} a
		 * @param {{ alternatives: Alternative[] }} b
		 * @returns {boolean}
		 */
		function alternativesAreEqual(a, b) {
			return manyAreEqual(a.alternatives, b.alternatives);
		}

		switch (x.type) {
			case "Alternative":
				{
					const other = /** @type {Alternative} */ (y);
					return manyAreEqual(x.elements, other.elements);
				}

			case "Assertion":
				{
					const other = /** @type {Assertion} */ (y);

					if (x.kind === other.kind) {
						if (x.kind === "lookahead" || x.kind === "lookbehind") {
							const otherLookaround = /** @type {import("regexpp/ast").LookaroundAssertion} */ (y);
							return x.negate === otherLookaround.negate && alternativesAreEqual(x, otherLookaround);
						} else {
							return x.raw === other.raw;
						}
					}
					return false;
				}

			case "Backreference":
				{
					const other = /** @type {Backreference} */ (y);
					return util.areEqual(x.resolved, other.resolved);
				}

			case "CapturingGroup":
				{
					const other = /** @type {CapturingGroup} */ (y);

					const p1 = util.getPattern(x);
					const p2 = util.getPattern(other);
					if (p1 && p2) {
						const n1 = util.getCapturingGroupNumber(p1, x);
						const n2 = util.getCapturingGroupNumber(p2, other);
						if (n1 && n2) {
							return n1 === n2 && alternativesAreEqual(x, other);
						}
					}
					return false;
				}

			case "Character":
				{
					const other = /** @type {Character} */ (y);
					return x.value === other.value;
				}

			case "CharacterClass":
				{
					const other = /** @type {CharacterClass} */ (y);
					return x.negate === other.negate && manyAreEqual(x.elements, other.elements);
				}

			case "CharacterClassRange":
				{
					const other = /** @type {import("regexpp/ast").CharacterClassRange} */ (y);
					return util.areEqual(x.min, other.min) && util.areEqual(x.max, other.max);
				}

			case "CharacterSet":
				{
					const other = /** @type {CharacterSet} */ (y);

					if (x.kind === "property" && other.kind === "property") {
						return x.negate === other.negate && x.key === other.key;
					} else {
						return x.raw === other.raw;
					}
				}

			case "Flags":
				{
					const other = /** @type {Flags} */ (y);
					return x.dotAll === other.dotAll && x.global === other.global && x.ignoreCase === other.ignoreCase
						&& x.multiline === other.multiline && x.sticky === other.sticky && x.unicode === other.unicode;
				}

			case "Group":
			case "Pattern":
				{
					const other = /** @type {Group} */ (y);
					return alternativesAreEqual(x, other);
				}

			case "Quantifier":
				{
					const other = /** @type {Quantifier} */ (y);
					return x.min === other.min && x.max === other.max && x.greedy === other.greedy &&
						util.areEqual(x.element, other.element);
				}

			case "RegExpLiteral":
				{
					const other = /** @type {import("regexpp/ast").RegExpLiteral} */ (y);
					return util.areEqual(x.flags, other.flags) && util.areEqual(x.pattern, other.pattern);
				}

			default:
				throw util.assertNever(x);
		}
	},

	/**
	 *
	 * @param {Pattern} pattern
	 * @param {CapturingGroup} group
	 * @returns {number | null}
	 */
	getCapturingGroupNumber(pattern, group) {
		let found = 0;
		try {
			visitRegExpAST(pattern, {
				onCapturingGroupEnter(node) {
					found++;
					if (node === group) {
						// throw an error to end early
						throw new Error();
					}
				}
			});
			return null;
		} catch (error) {
			return found;
		}
	},

	/**
	 *
	 * @param {Node} node
	 * @returns {Pattern | null}
	 */
	getPattern(node) {
		switch (node.type) {
			case "Pattern":
				return node;
			case "RegExpLiteral":
				return node.pattern;
			case "Flags":
				return node.parent ? node.parent.pattern : null;
			default:
				return util.getPattern(node.parent);
		}
	},

	/**
	 * Returns the minimal hexadecimal escape sequence of a given code point.
	 *
	 * This will use one of the following formats: `\xFF`, `\uFFFF`, or `\u{10FFFF}`.
	 *
	 * @param {number} codePoint
	 */
	minimalHexEscape(codePoint) {
		if (codePoint <= 0xFF) {
			return "\\x" + codePoint.toString(16).padStart(2, "0");
		} else if (codePoint <= 0xFFFF) {
			return "\\u" + codePoint.toString(16).padStart(4, "0");
		} else {
			return "\\u{" + codePoint.toString(16) + "}";
		}
	},

	/**
	 * Returns the rule name of the rule behind the given filename of a rule.
	 *
	 * @param {string} filename The filename of path of a rule.
	 * @returns {string}
	 */
	filenameToRule(filename) {
		const rule = (/([-\w]+)\.js$/.exec(filename) || [undefined, undefined])[1];
		if (!rule) {
			throw new Error(`Invalid rule filename: ${filename}`);
		}
		return rule;
	},

	/**
	 * Returns whether the given character is written as an octal escape.
	 *
	 * This will return `false` for `\0`.
	 *
	 * @param {Character} node
	 * @returns {boolean}
	 */
	isOctalEscape(node) {
		return node.value > 0 && /^\\[0-7]+$/.test(node.raw);
	},

	/**
	 * Returns whether the given node is a escape sequence.
	 *
	 * This includes octal escapes (e.g. `\31`), hexadecimal escapes (e.g. `\xFF` `\u00FFF` `\u{FF}`), control character
	 * escapes (e.g. `\cI`), and other escape sequences like `\n` and `\t`.
	 *
	 * This does not include the character-class-exclusive `\b` escape for backspace.
	 *
	 * This does not include literal escapes where the escaped character is equal to the character after the backslash
	 * (e.g. `\G`, `\\`, `\?`) and character sequences.
	 *
	 * @param {Character} node
	 */
	isEscapeSequence(node) {
		return /^\\(?:[0-7]{1,2}|[1-3][0-7]{2})$/.test(node.raw) // octal
			|| /^\\(?:x[\da-fA-F]{2}|u[\da-fA-F]{4}|u\{[\da-fA-F]{1,6}\})$/.test(node.raw) // hexadecimal
			|| /^\\c[A-Z]$/.test(node.raw) // control character
			|| /^\\[fnrtv]$/.test(node.raw); // form feed, new line, carrier return, tab, vertical tab
	},

	/**
	 *
	 * @param {Node} root
	 * @param {number} index
	 * @returns {Node | undefined}
	 */
	nodeAt(root, index) {
		if (index < root.start || root.end >= index) {
			return undefined;
		}
		if (root.start == index) {
			return root;
		}

		switch (root.type) {
			case "Assertion":
			case "CapturingGroup":
			case "Group":
			case "Pattern":
				if (root.type === "Assertion" && !(root.kind === "lookahead" || root.kind === "lookbehind")) {
					break;
				}

				for (const alt of root.alternatives) {
					if (alt.end >= index) {
						break;
					}
					const result = util.nodeAt(alt, index);
					if (result) {
						return result;
					}
				}
				break;

			case "Quantifier":
				{
					let res = util.nodeAt(root.element, index);
					if (res) return res;
					break;
				}

			case "RegExpLiteral":
				{
					let res = util.nodeAt(root.flags, index);
					if (res) return res;
					res = util.nodeAt(root.pattern, index);
					if (res) return res;
					break;
				}

			default:
				break;
		}

		return root;
	},

	repoTreeRoot: "https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master",

	/**
	 * Throws an error when invoked.
	 *
	 * @param {never} value
	 * @returns {never}
	 */
	assertNever(value) {
		throw new Error(`This part of the code should never be reached but ${value} made it through.`);
	},

	/**
	 * Returns the string representation of the given quantifier.
	 *
	 * @param {{ min: number; max: number; greedy?: boolean }} quant
	 * @returns {string}
	 */
	quantifierToString(quant) {
		if (quant.max < quant.min
			|| quant.min < 0
			|| !Number.isInteger(quant.min)
			|| !(Number.isInteger(quant.max) || quant.max === Infinity)) {
			throw new Error(`Invalid quantifier { min: ${quant.min}, max: ${quant.max} }`);
		}

		let value;
		if (quant.min === 0 && quant.max === 1) {
			value = "?";
		} else if (quant.min === 0 && quant.max === Infinity) {
			value = "*";
		} else if (quant.min === 1 && quant.max === Infinity) {
			value = "+";
		} else if (quant.min === quant.max) {
			value = `{${quant.min}}`;
		} else if (quant.max === Infinity) {
			value = `{${quant.min},}`;
		} else {
			value = `{${quant.min},${quant.max}}`;
		}

		if (!quant.greedy) {
			return value + "?";
		} else {
			return value;
		}
	},

	/**
	 * Returns the raw string of the negated character set.
	 *
	 * I.e. for a given `\S` is will return `"\s"`.
	 *
	 * This __does not__ support the dot character set.
	 *
	 * @param {Readonly<EscapeCharacterSet | UnicodePropertyCharacterSet>} charSet
	 * @returns {string}
	 */
	negateCharacterSetRaw(charSet) {
		let type = charSet.raw[1];
		if (type.toLowerCase() === type) {
			type = type.toUpperCase();
		} else {
			type = type.toLowerCase();
		}
		return `\\${type}${charSet.raw.substr(2)}`;
	},

	/**
	 * Returns the string representation of the given character class elements in a character class.
	 *
	 * @param {Readonly<Simple<CharacterClassElement>>[]} elements
	 * @param {boolean} [negate=false]
	 * @returns {string}
	 */
	elementsToCharacterClass(elements, negate) {
		// This won't do any optimization.
		// Its ONLY job is to generate a valid character class from the given elements.
		// Optimizations can be done by the optimize-character-class rule.

		let result = "";
		elements.forEach((e, i) => {
			switch (e.type) {
				case "Character":
					if (e.raw === "-") {
						if (i === 0 || i === elements.length - 1) {
							result += "-";
						} else {
							result += "\\-";
						}
					} else if (e.raw === "^") {
						if (i === 0) {
							result += "\\^";
						} else {
							result += "^";
						}
					} else if (e.raw === "]") {
						result += "\\]";
					} else {
						result += e.raw;
					}
					break;

				case "CharacterClassRange":
					if (e.min.raw === "^" && i === 0) {
						result += "\\^-" + e.max.raw;
					} else {
						result += e.min.raw + "-" + e.max.raw;
					}
					break;

				case "CharacterSet":
					result += e.raw;
					break;

				default:
					throw util.assertNever(e);
			}
		});

		return "[" + (negate ? "^" : "") + result + "]";
	},

	/**
	 * Returns whether the given backreference will always be replaced with the empty string.
	 *
	 * @param {Backreference} backreference
	 * @returns {boolean}
	 */
	isEmptyBackreference(backreference) {
		const group = backreference.resolved;

		if (backreference.end <= group.end) {
			// The backreference either comes before is the capturing group or is element of it. In either case, the
			// backreference will always be empty in JS.
			return true;
		}

		if (util.hasSomeAncestor(backreference, a => a === group)) {
			// This is an explicit check to guarantee that no infinite recursion can take place even if the source
			// location of the backreference and the group somehow got messed up.
			return true;
		}

		if (util.isZeroLength(group)) {
			// If the referenced group can only match doesn't consume characters, then it can only capture the empty
			// string.
			return true;
		}

		// Now for the hard part:
		// If there exists a path through the regular expression which connect the group and the backreference, then
		// the backreference can capture the group iff we only move up, down, or right relative to the group.

		/**
		 * @param {Element} node
		 * @returns {boolean}
		 */
		function findBackreference(node) {
			const parent = node.parent;

			switch (parent.type) {
				case "Alternative": {
					// if any elements right to the given node contain or are the backreference, we found it.
					const index = parent.elements.indexOf(node);
					const right = parent.elements.slice(index + 1);
					if (right.some(e => util.hasSomeDescendant(e, d => d === backreference))) {
						return true;
					}

					// no luck. let's go up!
					const parentParent = parent.parent;
					if (parentParent.type === "Pattern") {
						// can't go up.
						return false;
					} else {
						return findBackreference(parentParent);
					}
				}

				case "Quantifier":
					return findBackreference(parent);

				default:
					throw new Error("What happened?");
			}
		}

		return !findBackreference(group);
	},

	/**
	 * Returns the raw string of the quantifier without the quantified element.
	 *
	 * E.g. for `a+?`, `+?` will be returned.
	 *
	 * @param {Quantifier} quantifier
	 * @returns {string}
	 */
	getQuantifierRaw(quantifier) {
		return quantifier.raw.substr(quantifier.element.end - quantifier.start);
	},

};

module.exports = util;

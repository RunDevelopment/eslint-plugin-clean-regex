"use strict";

const { visitRegExpAST } = require("regexpp");
const { JS, DFA, CharSet, NFA } = require("refa");

/**
 * @typedef {import("regexpp/ast").Alternative} Alternative
 * @typedef {import("regexpp/ast").Assertion} Assertion
 * @typedef {import("regexpp/ast").LookaroundAssertion} LookaroundAssertion
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
 * @typedef {import("refa").CharSet} CharSet
 * @typedef {import("refa").ReadonlyNFA} ReadonlyNFA
 * @typedef {import("refa").NFAOptions} NFAOptions
 */

/**
 * @typedef {import("./util-types").FirstChar} FirstChar
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
			case "Alternative": {
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
			case "Flags": {
				// Assertions are constant because the only affect whether a string matches.
				// Flags are trivially constant
				return { word: "" };
			}
			case "Backreference": {
				if (util.isEmptyBackreference(node)) {
					return { word: "" };
				} else {
					// only constant if the expression of the capturing group is constant
					return util.getConstant(node.resolved, flags);
				}
			}
			case "CapturingGroup":
			case "Group":
			case "Pattern": {
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
			case "Character": {
				const string = String.fromCodePoint(node.value);
				if (flags.ignoreCase && string.toLowerCase() !== string.toUpperCase()) {
					return false;
				}
				return { word: string };
			}
			case "CharacterClass": {
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
			case "CharacterClassRange": {
				return node.min.value == node.max.value && util.getConstant(node.min, flags);
			}
			case "CharacterSet": {
				// for themselves, character sets like \w, ., \s are not constant
				return false;
			}
			case "Quantifier": {
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
			case "RegExpLiteral": {
				return util.getConstant(node.pattern, flags);
			}
			default:
				return false;
		}
	},

	/**
	 * Returns whether all paths of the given element don't move the position of the automaton.
	 *
	 * @param {Element | Alternative | Alternative[]} element
	 * @returns {boolean}
	 */
	isZeroLength(element) {
		if (Array.isArray(element)) {
			return element.every(a => util.isZeroLength(a));
		}

		switch (element.type) {
			case "Alternative":
				return element.elements.every(e => util.isZeroLength(e));

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
				return util.isZeroLength(element.alternatives);

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * Returns whether at least one path of the given element does not move the position of the automation.
	 *
	 * @param {Element | Alternative | Alternative[]} element
	 * @returns {boolean}
	 */
	isPotentiallyZeroLength(element) {
		if (Array.isArray(element)) {
			return element.some(a => util.isPotentiallyZeroLength(a));
		}

		switch (element.type) {
			case "Alternative":
				return element.elements.every(e => util.isPotentiallyZeroLength(e));

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
				return util.isPotentiallyZeroLength(element.alternatives);

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
	 * @param {Element | Alternative | Alternative[]} element
	 * @returns {boolean}
	 */
	isEmpty(element) {
		if (Array.isArray(element)) {
			return element.every(util.isEmpty);
		}

		switch (element.type) {
			case "Alternative":
				return element.elements.every(util.isEmpty);

			case "Assertion":
				// assertion do not consume characters but they do usually reject some pre- or suffixes
				if (element.kind === "lookahead" || element.kind === "lookbehind") {
					if (!element.negate && util.isPotentiallyEmpty(element.alternatives)) {
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
				return util.isEmpty(element.alternatives);

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
	 * @param {Element | Alternative | Alternative[]} element
	 * @returns {boolean}
	 */
	isPotentiallyEmpty(element) {
		if (Array.isArray(element)) {
			return element.some(util.isPotentiallyEmpty);
		}

		switch (element.type) {
			case "Alternative":
				return element.elements.every(util.isPotentiallyEmpty);

			case "Assertion":
				// assertion do not consume characters but they do usually reject some pre- or suffixes
				if (element.kind === "lookahead" || element.kind === "lookbehind") {
					if (!element.negate && util.isPotentiallyEmpty(element.alternatives)) {
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
				return util.isPotentiallyEmpty(element.alternatives);

			case "Quantifier":
				return element.min === 0 || util.isPotentiallyEmpty(element.element);

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * Returns whether any of the ancestors of the given node fulfills the given condition.
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
				return (
					util.hasSomeDescendant(node.min, conditionFn, descentConditionFn) ||
					util.hasSomeDescendant(node.max, conditionFn, descentConditionFn)
				);
			case "Quantifier":
				return util.hasSomeDescendant(node.element, conditionFn, descentConditionFn);
			case "RegExpLiteral":
				return (
					util.hasSomeDescendant(node.pattern, conditionFn, descentConditionFn) ||
					util.hasSomeDescendant(node.flags, conditionFn, descentConditionFn)
				);
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
			case "Alternative": {
				const other = /** @type {Alternative} */ (y);
				return manyAreEqual(x.elements, other.elements);
			}

			case "Assertion": {
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

			case "Backreference": {
				const other = /** @type {Backreference} */ (y);
				return util.areEqual(x.resolved, other.resolved);
			}

			case "CapturingGroup": {
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

			case "Character": {
				const other = /** @type {Character} */ (y);
				return x.value === other.value;
			}

			case "CharacterClass": {
				const other = /** @type {CharacterClass} */ (y);
				return x.negate === other.negate && manyAreEqual(x.elements, other.elements);
			}

			case "CharacterClassRange": {
				const other = /** @type {import("regexpp/ast").CharacterClassRange} */ (y);
				return util.areEqual(x.min, other.min) && util.areEqual(x.max, other.max);
			}

			case "CharacterSet": {
				const other = /** @type {CharacterSet} */ (y);

				if (x.kind === "property" && other.kind === "property") {
					return x.negate === other.negate && x.key === other.key;
				} else {
					return x.raw === other.raw;
				}
			}

			case "Flags": {
				const other = /** @type {Flags} */ (y);
				return (
					x.dotAll === other.dotAll &&
					x.global === other.global &&
					x.ignoreCase === other.ignoreCase &&
					x.multiline === other.multiline &&
					x.sticky === other.sticky &&
					x.unicode === other.unicode
				);
			}

			case "Group":
			case "Pattern": {
				const other = /** @type {Group} */ (y);
				return alternativesAreEqual(x, other);
			}

			case "Quantifier": {
				const other = /** @type {Quantifier} */ (y);
				return (
					x.min === other.min &&
					x.max === other.max &&
					x.greedy === other.greedy &&
					util.areEqual(x.element, other.element)
				);
			}

			case "RegExpLiteral": {
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
				},
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
		if (codePoint <= 0xff) {
			return "\\x" + codePoint.toString(16).padStart(2, "0");
		} else if (codePoint <= 0xffff) {
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
	 * Returns whether the given character is written as an octal escape sequence (e.g. `\0`, `\12`).
	 *
	 * @param {Character} node
	 * @returns {boolean}
	 */
	isOctalEscapeSequence(node) {
		return /^\\[0-7]+$/.test(node.raw);
	},

	/**
	 * Returns whether the given character is written as a control escape sequence (e.g. `\cI`).
	 *
	 * @param {Character} node
	 * @returns {boolean}
	 */
	isControlEscapeSequence(node) {
		return /^\\c[A-Za-z]$/.test(node.raw);
	},

	/**
	 * Returns whether the given character is written as a hexadecimal escape sequence (e.g. `\xFF` `\u00FFF` `\u{FF}`).
	 *
	 * @param {Character} node
	 * @returns {boolean}
	 */
	isHexadecimalEscapeSequence(node) {
		return /^\\(?:x[\da-fA-F]{2}|u[\da-fA-F]{4}|u\{[\da-fA-F]+\})$/.test(node.raw);
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
	 * @returns {boolean}
	 */
	isEscapeSequence(node) {
		return (
			util.isOctalEscapeSequence(node) || // octal
			util.isHexadecimalEscapeSequence(node) || // hexadecimal
			util.isControlEscapeSequence(node) || // control character
			/^\\[fnrtv]$/.test(node.raw) // form feed, new line, carrier return, tab, vertical tab
		);
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

			case "Quantifier": {
				let res = util.nodeAt(root.element, index);
				if (res) {
					return res;
				}
				break;
			}

			case "RegExpLiteral": {
				let res = util.nodeAt(root.flags, index);
				if (res) {
					return res;
				}
				res = util.nodeAt(root.pattern, index);
				if (res) {
					return res;
				}
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
		if (
			quant.max < quant.min ||
			quant.min < 0 ||
			!Number.isInteger(quant.min) ||
			!(Number.isInteger(quant.max) || quant.max === Infinity)
		) {
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

		if (util.hasSomeAncestor(backreference, a => a === group)) {
			// if the backreference is element of the referenced group
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

					// we have to take the current matching direction into account
					let next;
					if (util.matchingDirection(node) === "ltr") {
						// the next elements to match will be right to the given node
						next = parent.elements.slice(index + 1);
					} else {
						// the next elements to match will be left to the given node
						next = parent.elements.slice(0, index);
					}

					if (next.some(e => util.hasSomeDescendant(e, d => d === backreference))) {
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
	 * Returns whether the given backreference is always matched __after__ the referenced group was matched.
	 *
	 * If there exists any accepting path which goes through the backreference but not through the referenced group,
	 * this will return `false`.
	 *
	 * @param {Backreference} backreference
	 * @returns {boolean}
	 */
	backreferenceAlwaysAfterGroup(backreference) {
		const group = backreference.resolved;

		if (util.hasSomeAncestor(backreference, a => a === group)) {
			// if the backreference is element of the referenced group
			return false;
		}

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

					// we have to take the current matching direction into account
					let next;
					if (util.matchingDirection(node) === "ltr") {
						// the next elements to match will be right to the given node
						next = parent.elements.slice(index + 1);
					} else {
						// the next elements to match will be left to the given node
						next = parent.elements.slice(0, index);
					}

					if (next.some(e => util.hasSomeDescendant(e, d => d === backreference))) {
						return true;
					}

					// no luck. let's go up!
					const parentParent = parent.parent;
					if (parentParent.type === "Pattern") {
						// can't go up.
						return false;
					} else {
						if (parentParent.alternatives.length > 1) {
							// e.g.: (?:a|(a))+b\1
							return false;
						}
						return findBackreference(parentParent);
					}
				}

				case "Quantifier":
					if (parent.min === 0) {
						// e.g.: (a+)?b\1
						return false;
					}
					return findBackreference(parent);

				default:
					throw new Error("What happened?");
			}
		}

		return findBackreference(group);
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

	/**
	 * Returns the direction which which the given node will be matched relative to the closest parent alternative.
	 *
	 * @param {Node} node
	 * @returns {MatchingDirection}
	 *
	 * @typedef {"ltr" | "rtl"} MatchingDirection
	 */
	matchingDirection(node) {
		/** @type {LookaroundAssertion | undefined} */
		let closestLookaround;
		util.hasSomeAncestor(node, a => {
			if (a.type === "Assertion") {
				closestLookaround = a;
				return true;
			}
			return false;
		});

		if (closestLookaround !== undefined && closestLookaround.kind === "lookbehind") {
			// the matching direction in a lookbehind is right to left
			return "rtl";
		}
		// the standard matching direction is left to right
		return "ltr";
	},

	/**
	 * `lookahead` is here equivalent to `ltr` and `lookbehind` is equivalent to `rtl`.
	 *
	 * @param {LookaroundAssertion["kind"] | MatchingDirection} direction
	 * @returns {MatchingDirection}
	 */
	invertMatchingDirection(direction) {
		return direction === "ltr" || direction === "lookahead" ? "rtl" : "ltr";
	},

	/**
	 * Returns whether the given element contains or is an assertion that looks into the given direction.
	 *
	 * `lookahead` is here equivalent to `ltr` and `lookbehind` is equivalent to `rtl`.
	 *
	 * @param {Element} element
	 * @param {LookaroundAssertion["kind"] | MatchingDirection} direction
	 * @returns {boolean}
	 */
	hasAssertionWithDirection(element, direction) {
		return util.hasSomeDescendant(element, d => {
			if (d.type === "Assertion") {
				if (d.kind === "word") {
					// word is both a lookahead and a lookbehind
					return true;
				}
				if (util.isPotentiallyEmpty(element)) {
					// we can generally completely ignore empty lookarounds, they are just dead code
					return false;
				}

				if (direction === "lookahead" || direction === "ltr") {
					return d.kind === "lookahead" || d.kind === "end";
				} else {
					return d.kind === "lookbehind" || d.kind === "start";
				}
			}
			return false;
		});
	},

	/**
	 *
	 * @param {(Simple<CharacterClassElement> | Simple<CharacterSet>)[] | CharacterClass} elements
	 * @param {Flags} flags
	 * @returns {CharSet}
	 */
	toCharSet(elements, flags) {
		if (Array.isArray(elements)) {
			return JS.createCharSet(
				elements.map(e => {
					switch (e.type) {
						case "Character":
							return e.value;
						case "CharacterClassRange":
							return { min: e.min.value, max: e.max.value };
						case "CharacterSet":
							return e;
						default:
							throw util.assertNever(e);
					}
				}),
				flags
			);
		} else {
			const chars = util.toCharSet(elements.elements, flags);
			if (elements.negate) {
				return chars.negate();
			}
			return chars;
		}
	},

	/**
	 * Returns an empty character set for the given flags.
	 *
	 * @param {Flags} flags
	 * @returns {CharSet}
	 */
	emptyCharSet(flags) {
		return JS.createCharSet([], flags);
	},

	/**
	 * Returns how many characters the given element can consume at most and has to consume at least.
	 *
	 * @param {Element | Alternative | Alternative[]} element
	 * @returns {{ min:number; max: number }}
	 */
	getLengthRange(element) {
		if (Array.isArray(element)) {
			let min = 0;
			let max = 0;

			for (const e of element) {
				const eRange = util.getLengthRange(e);
				min += eRange.min;
				max += eRange.max;
			}

			return { min, max };
		}

		switch (element.type) {
			case "Assertion":
				return { min: 0, max: 0 };

			case "Character":
			case "CharacterClass":
			case "CharacterSet":
				return { min: 1, max: 1 };

			case "Quantifier": {
				if (element.max === 0) {
					return { min: 0, max: 0 };
				}
				const elementRange = util.getLengthRange(element.element);
				if (elementRange.max === 0) {
					return { min: 0, max: 0 };
				}
				if (element.min === 0) {
					elementRange.min = 0;
				}
				if (element.max === Infinity) {
					elementRange.max = Infinity;
				}
				return elementRange;
			}

			case "Alternative": {
				let min = 0;
				let max = 0;

				for (const e of element.elements) {
					const eRange = util.getLengthRange(e);
					min += eRange.min;
					max += eRange.max;
				}

				return { min, max };
			}

			case "CapturingGroup":
			case "Group":
				return util.getLengthRange(element.alternatives);

			case "Backreference": {
				if (util.isEmptyBackreference(element)) {
					return { min: 0, max: 0 };
				}
				const resolvedRange = util.getLengthRange(element.resolved);
				if (resolvedRange.min > 0 && !util.backreferenceAlwaysAfterGroup(element)) {
					resolvedRange.min = 0;
				}
				return resolvedRange;
			}

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * If a character is returned, it guaranteed to be a super set of the actual character. If the given element is
	 * always of zero length, then the empty character set will be returned.
	 *
	 * If `exact` is `true` then it is guaranteed that the returned character is guaranteed to be the actual
	 * character at all times if this element is not influenced by lookarounds outside itself.
	 *
	 * @param {Element | Alternative | Alternative[]} element
	 * @param {MatchingDirection} direction
	 * @param {Flags} flags
	 * @returns {FirstChar}
	 */
	getFirstCharOf(element, direction, flags) {
		if (Array.isArray(element)) {
			let nonEmpty = true;
			let exact = true;
			let char = util.emptyCharSet(flags);

			for (const alt of element) {
				const altChar = util.getFirstCharOf(alt, direction, flags);
				char = char.union(altChar.char);
				nonEmpty = nonEmpty && altChar.nonEmpty;
				exact = exact && altChar.exact;
			}

			return { char, nonEmpty, exact };
		}

		switch (element.type) {
			case "Assertion":
				return { char: util.emptyCharSet(flags), nonEmpty: false, exact: true };

			case "Character":
			case "CharacterSet":
				return { char: util.toCharSet([element], flags), nonEmpty: true, exact: true };

			case "CharacterClass":
				return { char: util.toCharSet(element, flags), nonEmpty: true, exact: true };

			case "Quantifier": {
				if (element.max === 0) {
					return { char: util.emptyCharSet(flags), nonEmpty: false, exact: true };
				}
				const elementChar = util.getFirstCharOf(element.element, direction, flags);
				let exact = elementChar.exact;
				if (
					exact &&
					element.max > 1 &&
					util.hasAssertionWithDirection(element, util.invertMatchingDirection(direction))
				) {
					// This is a conservative approximation!
					// The main idea here is that the first char of element of /((?<!a)\w)+/ is exactly \w
					// but the lookbehind will influence \w, so \w isn't exact.
					exact = false;
				}
				return {
					char: elementChar.char,
					nonEmpty: elementChar.nonEmpty && element.min > 0,
					exact: exact,
				};
			}

			case "Alternative": {
				let elements = element.elements;
				if (direction === "rtl") {
					elements = [...elements];
					elements.reverse();
				}

				let nonEmpty = false;
				let exact = true;
				let char = util.emptyCharSet(flags);
				for (let i = 0; i < elements.length; i++) {
					const e = elements[i];
					const eChar = util.getFirstCharOf(e, direction, flags);
					char = char.union(eChar.char);
					exact = exact && eChar.exact;

					if (eChar.nonEmpty) {
						nonEmpty = true;
						if (exact) {
							const rest = elements.slice(i + 1);
							const invDir = util.invertMatchingDirection(direction);
							if (rest.some(r => util.hasAssertionWithDirection(r, invDir))) {
								// This is a conservative approximation!
								// Example: /\w(?<=a)/
								exact = false;
							}
						}
						break;
					} else {
						if (util.hasAssertionWithDirection(e, direction)) {
							// This is a conservative approximation!
							// Example: /(?=a)\w/
							exact = false;
						}
					}
				}

				return { char, nonEmpty, exact };
			}

			case "CapturingGroup":
			case "Group":
				return util.getFirstCharOf(element.alternatives, direction, flags);

			case "Backreference": {
				if (util.isEmptyBackreference(element)) {
					return { char: util.emptyCharSet(flags), nonEmpty: false, exact: true };
				}
				const resolvedChar = util.getFirstCharOf(element.resolved, direction, flags);

				let exact = resolvedChar.exact;
				if (exact) {
					// the resolved character is only exact if it is only a single character.
					// i.e. /(\w)\1/ here the (\w) will capture exactly any word character, but the \1 can only match
					// one word character and that is the only (\w) matched.
					exact = resolvedChar.char.size === 1;
				}

				return {
					char: resolvedChar.char,
					nonEmpty: resolvedChar.nonEmpty && util.backreferenceAlwaysAfterGroup(element),
					exact,
				};
			}

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * Returns the first character after the given element.
	 *
	 * What "after" means depends the on the given direction which will be interpreted as the current matching
	 * direction. You can use this to get the previous character of an element as well.
	 *
	 * All restrictions and limitation of `util.getFirstCharOf` apply.
	 *
	 * @param {Element} afterThis
	 * @param {MatchingDirection} direction
	 * @param {Flags} flags
	 * @returns {FirstChar}
	 */
	getFirstCharAfter(afterThis, direction, flags) {
		/**
		 * @param {Element} element
		 * @param {MatchingDirection} direction
		 * @returns {(Element | "end")[]}
		 */
		function advanceElement(element, direction) {
			const parent = element.parent;
			if (parent.type === "CharacterClass" || parent.type === "CharacterClassRange") {
				throw new Error("The given element cannot be part of a character class.");
			}

			if (parent.type === "Quantifier") {
				if (parent.max <= 1) {
					return advanceElement(parent, direction);
				}
				return [parent, ...advanceElement(parent, direction)];
			} else {
				let altElements = parent.elements;
				if (direction === "rtl") {
					altElements = [...altElements];
					altElements.reverse();
				}

				let index = altElements.indexOf(element);
				if (index === altElements.length - 1) {
					// last element
					const parentParent = parent.parent;
					if (parentParent.type === "Pattern") {
						// there's nothing after that
						return ["end"];
					}
					if (parentParent.type === "Assertion") {
						// handling this too is waaay too complex, so let's just bail
						return ["end"];
					}
					if (parentParent.type === "CapturingGroup" || parentParent.type === "Group") {
						return advanceElement(parentParent, direction);
					}
					throw util.assertNever(parentParent);
				} else {
					// there are still some elements after this one
					return [altElements[index + 1]];
				}
			}
		}

		let nonEmpty = true;
		let exact = true;
		let char = util.emptyCharSet(flags);

		let nextElements = advanceElement(afterThis, direction);
		while (nextElements.length > 0) {
			let elements = nextElements;
			nextElements = [];

			for (const element of elements) {
				if (element === "end") {
					nonEmpty = false;
				} else {
					const firstChar = util.getFirstCharOf(element, direction, flags);
					char = char.union(firstChar.char);
					exact = exact && firstChar.exact;
					if (!firstChar.nonEmpty) {
						// keep going
						nextElements.push(...advanceElement(element, direction));
					}
				}
			}
		}

		return { char, nonEmpty, exact };
	},

	/**
	 * Returns whether the given character class/set matches all characters.
	 *
	 * @param {CharacterClass | CharacterSet} char
	 * @param {Flags} flags
	 * @returns {boolean}
	 */
	isMatchAll(char, flags) {
		if (char.type === "CharacterSet") {
			if (char.kind === "property") {
				return JS.createCharSet([char], flags).isAll;
			} else if (char.kind === "any") {
				return flags.dotAll;
			} else {
				return false;
			}
		} else {
			if (char.negate && char.elements.length === 0) {
				return true;
			} else {
				if (char.negate) {
					return util.toCharSet(char.elements, flags).isEmpty;
				} else {
					return util.toCharSet(char.elements, flags).isAll;
				}
			}
		}
	},

	/**
	 * Returns whether the given character class/set matches no characters.
	 *
	 * @param {CharacterClass | CharacterSet} char
	 * @param {Flags} flags
	 * @returns {boolean}
	 */
	isMatchNone(char, flags) {
		if (char.type === "CharacterSet") {
			if (char.kind === "property") {
				return JS.createCharSet([char], flags).isEmpty;
			} else {
				return false;
			}
		} else {
			if (!char.negate && char.elements.length === 0) {
				return true;
			} else {
				if (char.negate) {
					return util.toCharSet(char.elements, flags).isAll;
				} else {
					return util.toCharSet(char.elements, flags).isEmpty;
				}
			}
		}
	},

	/**
	 * Returns how many times the regex engine may match the given node against a string.
	 *
	 * @param {Node | null} node
	 * @returns {number}
	 */
	effectiveQuantifierMax(node) {
		if (node == null) {
			return 1;
		} else {
			const parent = util.effectiveQuantifierMax(node.parent);
			if (node.type === "Quantifier") {
				if (node.max === 0 || parent === 0) {
					return 0;
				} else {
					return parent * node.max;
				}
			} else {
				return parent;
			}
		}
	},
	/**
	 * Returns whether the given node either is or is under an effectively star quantifier.
	 *
	 * All quantifiers with a max larger than a certain threshold are assumed to have a max of infinity.
	 *
	 * @param {Node} node
	 * @returns {boolean}
	 */
	underAStar(node) {
		return util.effectiveQuantifierMax(node) > 20;
	},

	/**
	 * Returns whether the languages of the given NFA are equal.
	 *
	 * This assumes that both NFA do not have unreachable or trap states.
	 *
	 * @param {ReadonlyNFA} a
	 * @param {ReadonlyNFA} b
	 * @returns {boolean}
	 */
	nfaEquals(a, b) {
		if (a.isEmpty || b.isEmpty) {
			return a.isEmpty === b.isEmpty;
		}
		if (a.options.maxCharacter !== b.options.maxCharacter) {
			return false;
		}

		const { maxCharacter } = a.options;
		const x = a.nodes;
		const y = b.nodes;

		if (x.finals.has(x.initial) !== y.finals.has(y.initial)) {
			// one accepts the empty word, the other one doesn't
			return false;
		}

		/**
		 * @param {Iterable<CharSet>} iter
		 * @returns {CharSet}
		 */
		function unionAll(iter) {
			/** @type {CharSet | undefined} */
			let total = undefined;

			for (const item of iter) {
				if (total === undefined) {
					total = item;
				} else {
					total = total.union(item);
				}
			}

			return total || CharSet.empty(maxCharacter);
		}

		if (!unionAll(x.initial.out.values()).equals(unionAll(y.initial.out.values()))) {
			// first characters of the accepted languages are different
			return false;
		}

		const aDfa = DFA.fromNFA(a);
		aDfa.minimize();
		const bDfa = DFA.fromNFA(b);
		bDfa.minimize();

		return aDfa.structurallyEqual(bDfa);
	},
	/**
	 * @param {ReadonlyNFA} superset
	 * @param {ReadonlyNFA} subset
	 * @returns {boolean}
	 */
	nfaIsSupersetOf(superset, subset) {
		const union = superset.copy();
		union.union(subset);
		return util.nfaEquals(union, superset);
	},
	/**
	 * @param {ReadonlyNFA} subset
	 * @param {ReadonlyNFA} superset
	 * @returns {boolean}
	 */
	nfaIsSubsetOf(subset, superset) {
		return util.nfaIsSupersetOf(superset, subset);
	},
	/**
	 * @param {Iterable<ReadonlyNFA>} nfas
	 * @param {Readonly<NFAOptions>} options
	 * @returns {NFA}
	 */
	nfaUnionAll(nfas, options) {
		let total = NFA.empty(options);
		for (const nfa of nfas) {
			total.union(nfa);
		}
		return total;
	},

	/**
	 * @param {readonly T[]} arr
	 * @param {(item: T, index: number) => boolean} condFn
	 * @template T
	 */
	findIndex(arr, condFn) {
		return arr.findIndex(condFn);
	},
	/**
	 * @param {readonly T[]} arr
	 * @param {(item: T, index: number) => boolean} condFn
	 * @template T
	 */
	findLastIndex(arr, condFn) {
		for (let i = arr.length - 1; i >= 0; i--) {
			if (condFn(arr[i], i)) {
				return i;
			}
		}
		return -1;
	},
};

module.exports = util;

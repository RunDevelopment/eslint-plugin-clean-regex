/**
 * @typedef {{ readonly min: number; readonly max: number }} CharRange
 * @typedef {import("regexpp/ast").Flags} Flags
 * @typedef {import("regexpp/ast").CharacterSet} CharacterSet
 */

const Ranges = {

	/**
	 * Given an array of character ranges, it will remove any duplicates and join overlapping and adjacent ranges.
	 *
	 * While the array itself will be modified, the range objects in the array will not.
	 *
	 * @param {CharRange[]} ranges
	 * @returns {void}
	 */
	optimize(ranges) {
		// runs in O(n * log(n)), n = ranges.length

		ranges.sort((a, b) => a.min - b.min);

		let deleteCount = 0;
		for (let i = 0; i < ranges.length - 1; i++) {
			const current = ranges[i - deleteCount];
			const next = ranges[i + 1];

			if (current.max >= next.max) {
				// current completely contains next.
				deleteCount++;
			} else if (next.min <= current.max + 1) {
				// overlapping or adjacent.
				ranges[i - deleteCount] = { min: current.min, max: next.max };
				deleteCount++;
			} else {
				ranges[i - deleteCount + 1] = next;
			}
		}

		ranges.splice(ranges.length - deleteCount, deleteCount);
	},

	/**
	 * @param {readonly CharRange[]} ranges
	 * @param {number} maximum
	 * @returns {Iterable<CharRange>}
	 */
	negate: function* (ranges, maximum) {
		// runs in O(ranges.length)

		if (ranges.length === 0) {
			yield { min: 0, max: maximum };
		} else {
			const first = ranges[0], last = ranges[ranges.length - 1];
			if (first.min > 0) {
				yield { min: 0, max: first.min - 1 };
			}
			for (let i = 1; i < ranges.length; i++) {
				yield { min: ranges[i - 1].max + 1, max: ranges[i].min - 1 };
			}
			if (last.max < maximum) {
				yield { min: last.max + 1, max: maximum };
			}
		}
	}

};


/** @type {Map<number, Chars>} */
const emptyCache = new Map();
/** @type {Map<number, Chars>} */
const allCache = new Map();

/**
 * An immutable set of characters.
 *
 * All characters in the set have to be between and including 0 and the maximum.
 */
class Chars {

	/**
	 * Returns `true` if this set doesn't contain any characters.
	 *
	 * @returns {boolean}
	 */
	get isEmpty() {
		return this.ranges.length === 0;
	}
	/**
	 * Returns `true` if all characters in the range from 0 to `this.maximum`, including 0 and `this.maximum`, are in the set.
	 *
	 * @returns {boolean}
	 */
	get isAll() {
		return this.ranges.length === 1 && this.ranges[0].min === 0 && this.ranges[0].max === this.maximum;
	}


	/**
	 * @param {number} maximum
	 * @param {readonly CharRange[]} ranges
	 * @private
	 */
	constructor(maximum, ranges) {
		/**
		 * The greatest code point which can be element of the set.
		 *
		 * @type {number}
		 * @readonly
		 */
		this.maximum = maximum;
		/**
		 * An array of ranges representing this character set.
		 *
		 * The array must be guaranteed to have the following properties at all times:
		 *
		 * 1. Any two ranges are disjoint.
		 * 2. Any two ranges are non-adjacent.
		 * 3. 0 <= `min` <= `max` <= `this.maximum` for all ranges.
		 * 4. All ranges are sorted by ascending `min`.
		 *
		 * @type {readonly CharRange[]}
		 * @readonly
		 */
		this.ranges = ranges;
	}

	/**
	 * Returns a string representation of the character set.
	 *
	 * @returns {string}
	 */
	toString() {
		let s = "";
		for (let i = 0, l = this.ranges.length; i < l; i++) {
			const { min, max } = this.ranges[i];
			s += min;
			if (max > min) {
				s += "-" + max;
			}
			s += " ";
		}
		return `Chars (${this.maximum}) [ ${s}]`; // TODO:
	}

	/**
	 * Returns an empty character set with the given maximum.
	 *
	 * @param {number} maximum The greatest code point which can be element of the set.
	 * @returns {Chars}
	 */
	static empty(maximum) {
		let emptySet = emptyCache.get(maximum);
		if (emptySet === undefined) {
			emptySet = new Chars(maximum, []);
			emptyCache.set(maximum, emptySet);
		}
		return emptySet;
	}
	/**
	 * Returns a complete character set with the given maximum.
	 *
	 * @param {number} maximum The greatest code point which will be element of the set.
	 * @returns {Chars}
	 */
	static all(maximum) {
		let allSet = allCache.get(maximum);
		if (allSet === undefined) {
			allSet = new Chars(maximum, [{ min: 0, max: maximum }]);
			allCache.set(maximum, allSet);
		}
		return allSet;
	}


	/**
	 * @param {Chars | Iterable<CharRange>} value
	 * @returns {Iterable<CharRange>}
	 * @private
	 */
	_toRanges(value) {
		if (value instanceof Chars) {
			if (value.maximum !== this.maximum) {
				throw new RangeError("The maximum of the other set has to be equal the maximum of this set.");
			}
			return value.ranges;
		} else {
			return value;
		}
	}

	/**
	 * @param {CharRange} range
	 * @returns {CharRange}
	 * @private
	 */
	_checkRange(range) {
		if (range.min < 0 || range.min > range.max || range.max > this.maximum)
			throw new RangeError(`min=${range.min} has to be >= 0 and <= max.`);
		if (range.max > this.maximum)
			throw new RangeError(`max=${range.max} has to be <= maximum=${this.maximum}.`);
		return range;
	}


	/**
	 * @param {Chars} other
	 * @returns {boolean}
	 */
	equals(other) {
		if (other === this) return true;
		if (!(other instanceof Chars)) return false;
		if (this.maximum !== other.maximum) return false;
		if (this.ranges.length !== other.ranges.length) return false;

		for (let i = 0, l = this.ranges.length; i < l; i++) {
			const thisR = this.ranges[i];
			const otherR = other.ranges[i];
			if (thisR.min !== otherR.min || thisR.max !== otherR.max) return false;
		}
		return true;
	}

	/**
	 * @returns {Chars}
	 */
	negate() {
		return new Chars(this.maximum, [...Ranges.negate(this.ranges, this.maximum)]);
	}

	/**
	 * @param {...(Iterable<CharRange> | Chars)} data
	 * @returns {Chars}
	 */
	union(...data) {
		const newRanges = this.ranges.slice();
		for (const rangesOrSet of data) {
			for (const range of this._toRanges(rangesOrSet)) {
				newRanges.push(this._checkRange(range));
			}
		}

		Ranges.optimize(newRanges);
		return new Chars(this.maximum, newRanges);
	}

	/**
	 * @param {Chars | Iterable<CharRange>} data
	 * @returns {Chars}
	 */
	intersect(data) {
		// TODO: more efficient approach
		const set = data instanceof Chars ? data : Chars.empty(this.maximum).union(data);
		return this.negate().union(Ranges.negate(set.ranges, set.maximum)).negate();
	}

	/**
	 * @param {Chars | Iterable<CharRange>} data
	 * @returns {Chars}
	 */
	without(data) {
		// TODO: more efficient approach
		const set = data instanceof Chars ? data : Chars.empty(this.maximum).union(data);
		return set.union(Ranges.negate(this.ranges, this.maximum)).negate();
	}


	/**
	 * @param {number} character
	 * @returns {boolean}
	 */
	has(character) {
		return this.hasEvery({ min: character, max: character });
	}
	/**
	 * @param {CharRange} range
	 * @returns {boolean}
	 */
	hasEvery(range) {
		// runs in O(log(this.ranges.length))

		const ranges = this.ranges;
		const l = ranges.length;
		const { min, max } = range;

		// this is empty
		if (l == 0)
			return false;

		// out of range
		if (min < ranges[0].min || max > ranges[l - 1].max)
			return false;

		// the out of range check is enough in this case
		if (l == 1)
			return true;

		let low = 0; // inclusive
		let high = l; // exclusive
		while (low < high) {
			const m = low + ((high - low) >> 1);
			const mRange = ranges[m];
			const mMin = mRange.min;

			if (mMin == min) {
				return max <= mRange.max;
			} else if (mMin < min) {
				if (max <= mRange.max)
					return true;
				low = m + 1;
			} else /* if (mMin > min) */ {
				high = m;
			}
		}

		return false;
	}
	/**
	 * @param {CharRange} range
	 * @returns {boolean}
	 */
	hasSome(range) {
		// runs in O(log(this.ranges.length))

		const ranges = this.ranges;
		const l = ranges.length;
		const { min, max } = range;

		// this is empty
		if (l == 0)
			return false;

		// out of range
		if (max < ranges[0].min || min > ranges[l - 1].max)
			return false;

		let low = 0; // inclusive
		let high = l; // exclusive
		while (low < high) {
			const m = low + ((high - low) >> 1);
			const mRange = ranges[m];
			const mMin = mRange.min;

			if (mMin == min) {
				return true; // range.min is in this set
			} else if (mMin < min) {
				if (min <= mRange.max)
					return true;
				low = m + 1;
			} else /* if (mMin > min) */ {
				if (mMin <= max)
					return true;
				high = m;
			}
		}

		return false;
	}

	/**
	 * Returns whether this set contains every character of the given set.
	 *
	 * Returns `true` if the given set is a subset of this set, `false` otherwise.
	 *
	 * @param {Chars} other The character set to compare to.
	 * @returns {boolean}
	 */
	hasEveryOf(other) {
		// runs in O(this.ranges.length + other.ranges.length)

		const thisRanges = this.ranges;
		const otherRanges = this._toRanges(other);

		let i = 0, j = 0;
		let thisItem = thisRanges[i], otherItem = otherRanges[j];

		// try to disprove that other this the smaller set
		// we search for any character in other which is not in this

		while (thisItem && otherItem) {
			if (thisItem.min <= otherItem.min && thisItem.max >= otherItem.max) {
				// if thisItem fully contains otherItem
				otherItem = otherRanges[++j];
			} else if (thisItem.max < otherItem.min) {
				// [thisItem] ... [otherItem]
				thisItem = thisRanges[++i];
			} else {
				// thisItem and otherItem partially overlap
				// or thisItem is after otherItem
				return false;
			}
		}

		// otherItem is still defined that there are some chars in other which are not in this
		return !otherItem;
	}
	/**
	 * Returns whether this set contains some characters of the given set.
	 *
	 * Returns `false` if the given set and this set are disjoint, `true` otherwise.
	 *
	 * @param {Chars} other The character set to compare to.
	 * @returns {boolean}
	 */
	hasSomeOf(other) {
		// runs in O(this.ranges.length + other.ranges.length)

		const thisRanges = this.ranges;
		const otherRanges = this._toRanges(other);

		let i = 0, j = 0;
		let thisItem = thisRanges[i], otherItem = otherRanges[j];

		while (thisItem && otherItem) {
			if (otherItem.max < thisItem.min) {
				// [otherItem] ... [thisItem]
				otherItem = otherRanges[++j];
			} else if (thisItem.max < otherItem.min) {
				// [thisItem] ... [otherItem]
				thisItem = thisRanges[++i];
			} else {
				// thisItem and otherItem have at least one character in common
				return true;
			}
		}

		return false;
	}

}

/**
 * Throws an error when invoked.
 *
 * @param {never} value
 * @param {string} message
 * @returns {never}
 */
function assertNever(value, message) {
	throw new Error(message);
}

/** @typedef {CharRange} */
const DIGIT = { min: 0x30, max: 0x39 }; // 0-9
/** @typedef {readonly CharRange[]} */
const SPACE = [
	{ min: 0x09, max: 0x0d }, // \t \n \v \f \r
	{ min: 0x20, max: 0x20 }, // space
	{ min: 0xa0, max: 0xa0 }, // non-breaking space
	{ min: 0x1680, max: 0x1680 },
	{ min: 0x2000, max: 0x200a },
	{ min: 0x2028, max: 0x2029 },
	{ min: 0x202f, max: 0x202f },
	{ min: 0x205f, max: 0x205f },
	{ min: 0x3000, max: 0x3000 },
	{ min: 0xfeff, max: 0xfeff },
];
/** @typedef {readonly CharRange[]} */
const WORD = [
	{ min: 0x30, max: 0x39 }, // 0-9
	{ min: 0x41, max: 0x5A }, // A-Z
	{ min: 0x5f, max: 0x5f }, // _
	{ min: 0x61, max: 0x7A }, // a-z
];
/** @typedef {readonly CharRange[]} */
const LINE_TERMINATOR = [
	{ min: 0x0a, max: 0x0a }, // \n
	{ min: 0x0d, max: 0x0d }, // \r
	{ min: 0x2028, max: 0x2029 },
];

/**
 * @returns {Map<number, number[]>}
 */
function getUnicodeCaseVariations() {
	/** @type {Map<number, number[]>} */
	const caseVariation = new Map();

	/**
	 *
	 * @param {number} source
	 * @param {number} target
	 * @returns {void}
	 */
	function addCaseVariation(source, target) {
		let sourceVariations = caseVariation.get(source);
		if (sourceVariations === undefined) {
			caseVariation.set(source, sourceVariations = []);
		}
		sourceVariations.push(target);

		let targetVariations = caseVariation.get(target);
		if (targetVariations === undefined) {
			caseVariation.set(target, targetVariations = []);
		}
		targetVariations.push(source);
	}

	for (let i = 0; i <= 0x10FFFF; i++) {
		const s = String.fromCodePoint(i);
		const lower = s.toLowerCase();
		const upper = s.toUpperCase();

		/** @type {number | undefined} */
		let l = undefined;
		/** @type {number | undefined} */
		let u = undefined;
		if (lower.codePointAt(1) === undefined) {
			l = lower.codePointAt(0);
		}
		if (upper.codePointAt(1) === undefined) {
			u = upper.codePointAt(0);
		}
		if (l !== undefined && l < i) addCaseVariation(i, l);
		if (u !== undefined && u < i) addCaseVariation(i, u);
	}

	return caseVariation;
}
/** @type {ReadonlyMap<number, number[]>} */
const CASE_VARIATIONS = getUnicodeCaseVariations();

/**
 * Creates a new character set with the characters equivalent to a JavaScript regular expression character set.
 *
 * @param {Iterable<number | CharRange | Readonly<CharacterSet>>} chars The characters in the set.
 * @param {Readonly<Flags>} flags The flags of the pattern.
 * @returns {Chars}
 */
function toChars(chars, flags) {
	const { unicode, ignoreCase, dotAll } = flags;
	const maximum = unicode ? 0x10FFFF : 0xFFFF;

	/** @type {CharRange[]} */
	const ranges = [];

	/**
	 * @param {number} c
	 * @returns {void}
	 */
	function addVariations(c) {
		const variations = CASE_VARIATIONS.get(c);
		if (variations !== undefined) {
			for (let i = 0, l = variations.length; i < l; i++) {
				const variation = variations[i];
				if (variation <= maximum) {
					ranges.push({ min: variation, max: variation });
				}
			}
		}
	}
	/**
	 * @param {number} min
	 * @param {number} max
	 * @returns {void}
	 */
	function addVariationsRange(min, max) {
		for (let c = min; c <= max; c++) {
			const variations = CASE_VARIATIONS.get(c);
			if (variations !== undefined) {
				for (let i = 0, l = variations.length; i < l; i++) {
					const variation = variations[i];
					if (variation <= maximum && !(min <= variation && variation <= max)) {
						// TODO: more efficient approach
						ranges.push({ min: variation, max: variation });
					}
				}
			}
		}
	}

	for (const char of chars) {
		if (typeof char == "number") {
			ranges.push({ min: char, max: char });
			if (ignoreCase) {
				addVariations(char);
			}
		} else if ("kind" in char) {
			switch (char.kind) {
				case "digit":
					if (char.negate) {
						// we just quickly negate it ourselves. No need for a new Chars
						ranges.push({ min: 0, max: DIGIT.min - 1 }, { min: DIGIT.max + 1, max: maximum });
					} else {
						ranges.push(DIGIT);
					}
					break;

				case "any":
					if (dotAll) {
						// since all character sets and ranges are combined using union, we can stop here
						return Chars.all(maximum);
					} else {
						ranges.push(...Chars.all(maximum).without(LINE_TERMINATOR).ranges);
					}
					break;

				case "property":
					// TODO: implement; just ignore it for now
					break;

				case "space":
				case "word": {
					const setRanges = char.kind === "space" ? SPACE : WORD;
					if (char.negate) {
						ranges.push(...Chars.empty(maximum).union(setRanges).negate().ranges);
					} else {
						ranges.push(...setRanges);
					}
					break;
				}

				default:
					throw assertNever(char, "Invalid predefined character set type");
			}
		} else {
			ranges.push(char);
			if (ignoreCase) {
				addVariationsRange(char.min, char.max);
			}
		}
	}

	return Chars.empty(maximum).union(ranges);
}


module.exports = {
	Chars,
	toChars
};

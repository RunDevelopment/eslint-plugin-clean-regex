import { CharSet, JS } from "refa";
import { CharacterClass, CharacterClassElement, CharacterSet, Flags } from "regexpp/ast";
import { Simple, assertNever } from "./util";

export function toCharSet(
	elements: (Simple<CharacterClassElement> | Simple<CharacterSet>)[] | CharacterClass,
	flags: Partial<Flags>
): CharSet {
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
						throw assertNever(e);
				}
			}),
			flags
		);
	} else {
		const chars = toCharSet(elements.elements, flags);
		if (elements.negate) {
			return chars.negate();
		}
		return chars;
	}
}

const EMPTY_UTF16_CHARSET = CharSet.empty(0xffff);
const EMPTY_UNICODE_CHARSET = CharSet.empty(0x10ffff);
/**
 * Returns an empty character set for the given flags.
 */
export function emptyCharSet(flags: Partial<Flags>): CharSet {
	if (flags.unicode) {
		return EMPTY_UNICODE_CHARSET;
	} else {
		return EMPTY_UTF16_CHARSET;
	}
}
const ALL_UTF16_CHARSET = CharSet.all(0xffff);
const ALL_UNICODE_CHARSET = CharSet.all(0x10ffff);
/**
 * Returns a full character set for the given flags.
 */
export function allCharSet(flags: Partial<Flags>): CharSet {
	if (flags.unicode) {
		return ALL_UNICODE_CHARSET;
	} else {
		return ALL_UTF16_CHARSET;
	}
}
const LINE_TERMINATOR_UTF16_CHARSET = JS.createCharSet([{ kind: "any" }], { unicode: false }).negate();
const LINE_TERMINATOR_UNICODE_CHARSET = JS.createCharSet([{ kind: "any" }], { unicode: true }).negate();
export function lineTerminatorCharSet(flags: Partial<Flags>): CharSet {
	if (flags.unicode) {
		return LINE_TERMINATOR_UNICODE_CHARSET;
	} else {
		return LINE_TERMINATOR_UTF16_CHARSET;
	}
}

/**
 * Returns whether the given character class/set matches all characters.
 */
export function isMatchAll(char: CharacterClass | CharacterSet, flags: Partial<Flags>): boolean {
	if (char.type === "CharacterSet") {
		if (char.kind === "property") {
			return JS.createCharSet([char], flags).isAll;
		} else if (char.kind === "any") {
			return !!flags.dotAll;
		} else {
			return false;
		}
	} else {
		if (char.negate && char.elements.length === 0) {
			return true;
		} else {
			if (char.negate) {
				return toCharSet(char.elements, flags).isEmpty;
			} else {
				return toCharSet(char.elements, flags).isAll;
			}
		}
	}
}

/**
 * Returns whether the given character class/set matches no characters.
 */
export function isMatchNone(char: CharacterClass | CharacterSet, flags: Partial<Flags>): boolean {
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
				return toCharSet(char.elements, flags).isAll;
			} else {
				return toCharSet(char.elements, flags).isEmpty;
			}
		}
	}
}

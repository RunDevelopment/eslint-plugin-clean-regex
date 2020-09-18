import { FiniteAutomaton, JS } from "refa";
import { Node } from "regexpp/ast";

interface Literal {
	readonly source: string;
	readonly flags: string;
}

export function shorten(string: string, maxLength: number, position?: "start" | "end" | "center"): string {
	if (string.length <= maxLength) {
		return string;
	} else {
		maxLength--;
		if (position === "end" || position == undefined) {
			return string.substr(0, maxLength) + "…";
		} else if (position === "start") {
			return "…" + string.substr(string.length - maxLength, maxLength);
		} else if (position === "center") {
			const start = maxLength >>> 1;
			const end = start + (maxLength % 2);
			return string.substr(0, start) + "…" + string.substr(string.length - end, end);
		} else {
			throw new Error("Invalid position.");
		}
	}
}

/**
 * Converts the given value to the string of a `RegExp` literal.
 *
 * @example
 * toRegExpString(/foo/i) // returns "/foo/i"
 */
export function toRegExpString(value: Literal | FiniteAutomaton): string {
	if ("toRegex" in value) {
		const re = value.toRegex();
		const literal = JS.toLiteral(re);
		return toRegExpString(literal);
	} else {
		return `/${value.source}/${value.flags}`;
	}
}

/**
 * Returns a string that mentions the given node or string representation of a node.
 */
export function mention(node: Node | string): string {
	return "`" + (typeof node === "string" ? node : node.raw) + "`";
}

export function many(count: number, unit: string, unitPlural?: string): string {
	if (!unitPlural) {
		if (unit.length > 1 && unit[unit.length - 1] === "y") {
			unitPlural = unit.substr(0, unit.length - 1) + "ies";
		} else {
			unitPlural = unit + "s";
		}
	}

	if (count === 1) {
		return "1 " + unit;
	} else {
		return count + " " + unitPlural;
	}
}

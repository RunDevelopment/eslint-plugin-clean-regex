import type { Rule } from "eslint";
import type { RegExpLiteral, SourceLocation } from "estree";
import { RegExpParser, visitRegExpAST } from "regexpp";
import { Alternative, CharacterClassElement, Element, Flags, Pattern, Quantifier } from "regexpp/ast";
import { RegExpVisitor } from "regexpp/visitor";

export type CleanRegexRule = Rule.RuleModule & {
	meta: Rule.RuleMetaData & {
		type: "problem" | "suggestion" | "layout";
		docs: {
			description: string;
			url: string;
		};
	};
};

export type PatternElement = Pattern | Element | CharacterClassElement | Alternative;
export interface RegexFixOptions {
	/**
	 * The fix depends on these nodes. This means that the fix may not change these nodes but the rule creating the fix
	 * assumes that they are not changed by another fix.
	 */
	dependsOn?: PatternElement | readonly PatternElement[];
	/**
	 * Similar to `dependsOn`, this means that the fix depends on at least one flags. This means that flags may not be
	 * changed by other fixes.
	 */
	dependsOnFlags?: boolean;
}

export interface RegexRuleListenerContext {
	readonly pattern: Pattern;
	readonly flags: Flags;
	readonly visitAST: (handlers: RegExpVisitor.Handlers) => void;
	readonly reportElement: (element: PatternElement) => ReportProps;
	readonly reportQuantifier: (element: Quantifier) => ReportProps;
	readonly reportFlags: () => ReportProps;
	readonly reportElements: (elements: readonly PatternElement[]) => ReportProps;
	readonly replaceLiteral: (patternReplacement: string, flagsReplacement: string) => ReplaceProps;
	readonly replaceElement: (element: PatternElement, replacement: string, options?: RegexFixOptions) => ReplaceProps;
	readonly replaceQuantifier: (element: Quantifier, replacement: string, options?: RegexFixOptions) => ReplaceProps;
	readonly replaceFlags: (replacement: string, options?: RegexFixOptions) => ReplaceProps;
	readonly removeElement: (element: PatternElement, options?: RegexFixOptions) => ReplaceProps;
	readonly parseExpression: (expression: string) => Pattern | null;
}
export interface ReportProps {
	loc: SourceLocation;
}
export interface ReplaceProps extends ReportProps {
	fix: (fixer: Rule.RuleFixer) => Rule.Fix;
}

const parser = new RegExpParser();
const patternCache = new Map<string, Pattern | null>();
const flagsCache = new Map<string, Flags | null>();

function getPattern(source: string, uFlag: boolean): Pattern | null {
	const key = `${uFlag ? "u" : ""}:${source}`;
	let pattern = patternCache.get(key);
	if (pattern === undefined) {
		pattern = null;
		try {
			pattern = parser.parsePattern(source, undefined, undefined, uFlag);
		} catch (error) {
			/* no-op */
		}
		patternCache.set(key, pattern);
	}
	return pattern;
}
function getFlags(flags: string): Flags | null {
	const key = flags;
	let f = flagsCache.get(key);
	if (f === undefined) {
		f = null;
		try {
			f = parser.parseFlags(flags);
		} catch (error) {
			/* no-op */
		}
		flagsCache.set(key, f);
	}
	return f;
}

function createListenerContext(regexNode: RegExpLiteral): RegexRuleListenerContext | null {
	const pattern = getPattern(regexNode.regex.pattern, regexNode.regex.flags.indexOf("u") != -1);
	const flags = getFlags(regexNode.regex.flags);

	// both have to be valid
	if (!pattern || !flags) {
		return null;
	}

	function replaceLiteralImpl(patternReplacement: string, flagsReplacement: string): ReplaceProps {
		const range = regexNode.range;
		if (!range) {
			throw new Error("The regex literal node does not have a range associated with it.");
		}
		return {
			loc: copyLoc(regexNode.loc),
			fix: fixer => fixer.replaceTextRange(range, `/${patternReplacement}/${flagsReplacement}`),
		};
	}
	function replaceElementImpl(
		element: ElementLocation,
		replacement: string,
		options?: RegexFixOptions
	): ReplaceProps {
		if (options?.dependsOnFlags) {
			// replace the whole literal
			const pattern = regexNode.regex.pattern;
			const flags = regexNode.regex.flags;

			const patternReplacement =
				pattern.substring(0, element.start) + replacement + pattern.substring(element.end);
			return replaceLiteralImpl(patternReplacement, flags);
		} else {
			const region: ElementLocation = elementLocUnion([...toArray(options?.dependsOn), element]) ?? element;

			if (region.start === element.start && region.end === element.end) {
				// the element doesn't depend on anything
				return {
					loc: locOfElement(regexNode, element),
					fix: fixer => replaceElement(fixer, regexNode, element, replacement),
				};
			} else {
				// the elements also depends on some other elements
				const regionPattern = regexNode.regex.pattern.substring(region.start, region.end);
				const regionReplacement =
					regionPattern.substring(0, element.start - region.start) +
					replacement +
					regionPattern.substring(element.end - region.start);

				return {
					loc: locOfElement(regexNode, element),
					fix: fixer => replaceElement(fixer, regexNode, region, regionReplacement),
				};
			}
		}
	}

	const listenerContext: RegexRuleListenerContext = {
		pattern,
		flags,
		visitAST(handlers) {
			visitRegExpAST(pattern, handlers);
		},

		reportElement(element) {
			return { loc: locOfElement(regexNode, element) };
		},
		reportQuantifier(element) {
			return { loc: locOfElement(regexNode, elementLocOfQuantifier(element)) };
		},
		reportFlags() {
			return { loc: locOfRegexFlags(regexNode) };
		},

		reportElements(elements) {
			const union = elementLocUnion(elements);
			if (!union) {
				throw new Error("There has to be at least one element to report!");
			}
			return { loc: locOfElement(regexNode, union) };
		},

		replaceLiteral: replaceLiteralImpl,
		replaceElement: replaceElementImpl,
		replaceQuantifier(element, replacement, options) {
			const quant = elementLocOfQuantifier(element);
			return replaceElementImpl(quant, replacement, options);
		},
		replaceFlags(replacement, options) {
			if (options?.dependsOn) {
				// we depend on some elements, so let's just replace the whole literal
				return {
					loc: locOfRegexFlags(regexNode),
					fix: fixer => replaceFlags(fixer, regexNode, replacement),
				};
			} else {
				return {
					loc: locOfRegexFlags(regexNode),
					fix: replaceLiteralImpl(regexNode.regex.pattern, replacement).fix,
				};
			}
		},

		removeElement(element, options) {
			const parent = element.parent;

			if (parent && parent.type === "Alternative" && parent.elements.length === 1) {
				// this element is the only element
				const pattern = parent.parent;
				if (pattern.type === "Pattern" && pattern.alternatives.length === 1) {
					// the whole pattern only has one alternative

					// if this element was removed, the pattern's source would be an empty string which
					// is invalid (//), so replace it with an empty non-capturing group instead.
					return replaceElementImpl(element, "(?:)", options);
				}
			}

			if (parent && parent.type === "Quantifier") {
				// if this element was removed, the quantifier will quantify the preceding element.
				return replaceElementImpl(element, "(?:)", options);
			}

			return replaceElementImpl(element, "", options);
		},

		parseExpression(expression) {
			return getPattern(expression, regexNode.regex.flags.indexOf("u") != -1);
		},
	};

	return listenerContext;
}

export function createRuleListener(listener: (context: RegexRuleListenerContext) => void): Rule.RuleListener {
	return {
		Literal(node) {
			const regexNode = node as RegExpLiteral;
			if (typeof regexNode.regex === "object") {
				const listenerContext = createListenerContext(regexNode);
				if (listenerContext !== null) {
					listener.call(this, listenerContext);
				}
			}
		},
	};
}

/**
 * The location of a RegExpp element (all nodes except the flags).
 */
interface ElementLocation {
	start: number;
	end: number;
}
function elementLocUnion(array: readonly Readonly<ElementLocation>[]): ElementLocation | undefined {
	if (array.length === 0) {
		return undefined;
	} else {
		let start = array[0].start;
		let end = array[0].end;
		for (const item of array) {
			start = Math.min(start, item.start);
			end = Math.max(end, item.end);
		}
		return { start, end };
	}
}
function elementLocOfQuantifier(element: Readonly<Quantifier>): ElementLocation {
	return { start: element.element.end, end: element.end };
}

function copyLoc(loc: SourceLocation | undefined | null): SourceLocation {
	if (!loc) {
		throw new Error("The node does not include source location information!");
	}
	return {
		start: { ...loc.start },
		end: { ...loc.end },
	};
}
function locOfElement(node: RegExpLiteral, element: Readonly<ElementLocation>): SourceLocation {
	const loc = copyLoc(node.loc);
	const offset = loc.start.column + "/".length;
	loc.start.column = offset + element.start;
	loc.end.column = offset + element.end;
	return loc;
}
function locOfRegexFlags(node: RegExpLiteral): SourceLocation {
	const loc = copyLoc(node.loc);
	const flagCount = Math.max(1, node.regex.flags.length);
	loc.start.column = loc.end.column - flagCount;
	return loc;
}

function replaceElement(
	fixer: Rule.RuleFixer,
	node: RegExpLiteral,
	element: Readonly<ElementLocation>,
	replacement: string
): Rule.Fix {
	if (!node.range) {
		throw new Error("The given node does not have range information.");
	}

	const offset = node.range[0] + "/".length;
	return fixer.replaceTextRange([offset + element.start, offset + element.end], replacement);
}
/**
 * Replaces the flags of the given regex literal with the given string.
 */
function replaceFlags(fixer: Rule.RuleFixer, node: RegExpLiteral, replacement: string): Rule.Fix {
	if (!node.range) {
		throw new Error("The given node does not have range information.");
	}

	const start = node.range[1] - node.regex.flags.length;
	return fixer.replaceTextRange([start, node.range[1]], replacement);
}

function toArray<T>(value: T | readonly T[] | undefined): readonly T[] {
	if (Array.isArray(value)) {
		return value;
	} else if (value === undefined) {
		return [];
	} else {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return [value as any];
	}
}

export const repoTreeRoot = "https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master";

/**
 * Returns the rule name of the rule behind the given filename of a rule.
 *
 * @param filename The filename of path of a rule.
 */
export function filenameToRule(filename: string): string {
	const rule = (/([-\w]+)\.[jt]s$/.exec(filename) || [undefined, undefined])[1];
	if (!rule) {
		throw new Error(`Invalid rule filename: ${filename}`);
	}
	return rule;
}

/**
 * Returns the URL of the doc of the given rule.
 */
export function getDocUrl(rule: string): string {
	return `${repoTreeRoot}/docs/rules/${rule}.md`;
}

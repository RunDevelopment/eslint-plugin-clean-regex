import type { Rule } from "eslint";
import type { RegExpLiteral, SourceLocation } from "estree";
import { RegExpParser, visitRegExpAST } from "regexpp";
import { Flags, Node, Pattern, Quantifier } from "regexpp/ast";
import { RegExpVisitor } from "regexpp/visitor";
import { toRegExpString } from "./format";

export type CleanRegexRule = Rule.RuleModule & {
	meta: Rule.RuleMetaData & {
		type: "problem" | "suggestion" | "layout";
		docs: {
			description: string;
			url: string;
		};
	};
};

export interface RegexRuleListenerContext {
	readonly pattern: Pattern;
	readonly flags: Flags;
	readonly visitAST: (handlers: RegExpVisitor.Handlers) => void;
	readonly reportElement: (element: Node) => ReportProps;
	readonly reportQuantifier: (element: Quantifier) => ReportProps;
	readonly reportFlags: () => ReportProps;
	readonly reportElements: (elements: readonly Node[]) => ReportProps;
	readonly replaceLiteral: (patternReplacement: string, flagsReplacement: string) => ReplaceProps;
	readonly replaceElement: (element: Node, replacement: string) => ReplaceProps;
	readonly replaceQuantifier: (element: Quantifier, replacement: string) => ReplaceProps;
	readonly replaceFlags: (replacement: string) => ReplaceProps;
	readonly removeElement: (element: Node) => ReplaceProps;
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
			return { loc: locOfQuantifier(regexNode, element) };
		},
		reportFlags() {
			return { loc: locOfRegexFlags(regexNode) };
		},

		reportElements(elements) {
			if (elements.length === 0) {
				throw new Error("There has to be at least one element to report!");
			}

			const locs = elements.map(e => locOfElement(regexNode, e));
			let min = locs[0].start;
			let max = locs[0].end;

			for (const { start, end } of locs) {
				if (start.line < min.line || (start.line === min.line && start.column <= min.column)) {
					min = start;
				}
				if (end.line > max.line || (end.line === max.line && end.column >= max.column)) {
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
				loc: copyLoc(regexNode.loc),
				fix(fixer) {
					return fixer.replaceTextRange(
						range,
						toRegExpString({
							source: patternReplacement,
							flags: flagsReplacement,
						})
					);
				},
			};
		},
		replaceElement(element, replacement) {
			return {
				loc: locOfElement(regexNode, element),
				fix(fixer) {
					return replaceElement(fixer, regexNode, element, replacement);
				},
			};
		},
		replaceQuantifier(element, replacement) {
			return {
				loc: locOfQuantifier(regexNode, element),
				fix(fixer) {
					return replaceQuantifier(fixer, regexNode, element, replacement);
				},
			};
		},
		replaceFlags(replacement) {
			return {
				loc: locOfRegexFlags(regexNode),
				fix(fixer) {
					return replaceFlags(fixer, regexNode, replacement);
				},
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

export function copyLoc(loc: SourceLocation | undefined | null): SourceLocation {
	if (!loc) {
		throw new Error("The node does not include source location information!");
	}
	return {
		start: { ...loc.start },
		end: { ...loc.end },
	};
}
export function locOfRegexFlags(node: RegExpLiteral): SourceLocation {
	const loc = copyLoc(node.loc);
	const flagCount = Math.max(1, node.regex.flags.length);
	loc.start.column = loc.end.column - flagCount;
	return loc;
}
export function locOfElement(node: RegExpLiteral, element: Node): SourceLocation {
	const loc = copyLoc(node.loc);
	const offset = loc.start.column + "/".length;
	loc.start.column = offset + element.start;
	loc.end.column = offset + element.end;
	return loc;
}
export function locOfQuantifier(node: RegExpLiteral, element: Quantifier): SourceLocation {
	const loc = copyLoc(node.loc);
	const offset = loc.start.column + "/".length;
	loc.start.column = offset + element.element.end;
	loc.end.column = offset + element.end;
	return loc;
}

export function replaceElement(
	fixer: Rule.RuleFixer,
	node: RegExpLiteral,
	element: Node,
	replacement: string
): Rule.Fix {
	if (!node.range) {
		throw new Error("The given node does not have range information.");
	}

	const offset = node.range[0] + "/".length;
	return fixer.replaceTextRange([offset + element.start, offset + element.end], replacement);
}
export function replaceQuantifier(
	fixer: Rule.RuleFixer,
	node: RegExpLiteral,
	element: Quantifier,
	replacement: string
): Rule.Fix {
	if (!node.range) {
		throw new Error("The given node does not have range information.");
	}

	const offset = node.range[0] + "/".length;
	return fixer.replaceTextRange([offset + element.element.end, offset + element.end], replacement);
}
/**
 * Replaces the flags of the given regex literal with the given string.
 *
 * This will actually replace the whole literal as well because the flags affect the whole pattern.
 */
export function replaceFlags(fixer: Rule.RuleFixer, node: RegExpLiteral, replacement: string): Rule.Fix {
	if (!node.range) {
		throw new Error("The given node does not have range information.");
	}

	const raw = `/${node.regex.pattern}/${replacement}`;
	return fixer.replaceTextRange(node.range, raw);
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

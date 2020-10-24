import { RegExpParser } from "regexpp";
import { Character, CharacterClass, CharacterSet, Flags } from "regexpp/ast";
import { mentionCharElement } from "../format";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { toCharSet } from "../util";

type LiteralEscapeMode = "require" | "disallow" | "allow";
type LiteralContext = "inside" | "outside" | "all";
interface LiteralEscape {
	context: LiteralContext;
	matches: (character: number) => boolean;
	escape: LiteralEscapeMode;
	name: string | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processLiteralEscapeOption(literalOptions: readonly any[]): LiteralEscape[] {
	const escapes: LiteralEscape[] = [];

	const parser = new RegExpParser({ ecmaVersion: 2020 });
	const flags: Partial<Flags> = { unicode: true };

	for (let index = 0; index < literalOptions.length; index++) {
		const element = literalOptions[index];

		const characterClassRaw = element["characters"];
		const errorMessage = `The characters pattern ${JSON.stringify(characterClassRaw)} of ${
			element.name
		} is not a valid character, character class, or character set.`;

		let ast;
		try {
			ast = parser.parsePattern(characterClassRaw, undefined, undefined, true);
		} catch (error) {
			throw new SyntaxError(errorMessage);
		}

		let char: undefined | Character | CharacterClass | CharacterSet = undefined;
		if (ast.alternatives.length === 1) {
			const alt = ast.alternatives[0];
			if (alt.elements.length === 1) {
				const e = alt.elements[0];
				if (e.type === "CharacterClass" || e.type === "Character" || e.type === "CharacterSet") {
					char = e;
				}
			}
		}
		if (char === undefined) {
			throw new Error(errorMessage);
		}

		const set = char.type === "CharacterClass" ? toCharSet(char, flags) : toCharSet([char], flags);

		let matches: (character: number) => boolean;
		if (set.isEmpty) {
			matches = () => false;
		} else if (set.isAll) {
			matches = () => true;
		} else if (set.ranges.length === 1) {
			const { min, max } = set.ranges[0];
			matches = c => min <= c && c <= max;
		} else {
			matches = c => set.has(c);
		}

		escapes.push({
			matches,
			context: element.context || "all",
			escape: element.escape,
			name: element.name || `rules[${index}]`,
		});
	}

	return escapes;
}

function isFirstInCharClass(char: Character): boolean {
	const parent = char.parent;
	switch (parent.type) {
		case "CharacterClass":
			return parent.elements[0] === char;

		case "CharacterClassRange":
			if (parent.min !== char) {
				return false;
			}
			return parent.parent.elements[0] === parent;

		default:
			throw new Error("The given character is not part of a character class.");
	}
}
function isLastInCharClass(char: Character): boolean {
	const parent = char.parent;
	switch (parent.type) {
		case "CharacterClass":
			return parent.elements[parent.elements.length - 1] === char;

		case "CharacterClassRange":
			if (parent.max !== char) {
				return false;
			}
			return parent.parent.elements[parent.parent.elements.length - 1] === parent;

		default:
			throw new Error("The given character is not part of a character class.");
	}
}

// https://tc39.es/ecma262/#prod-SyntaxCharacter
const SYNTAX_CHARACTERS: ReadonlySet<string> = new Set([..."^$\\.*+?()[]{}|"]);

/**
 * Returns whether the character can be escaped and unescaped at will without changing the meaning of the pattern.
 */
function canToggleLiteralEscape(char: Character, flags: Flags): boolean {
	const inside = char.parent.type === "CharacterClass" || char.parent.type === "CharacterClassRange";
	const { unicode } = flags;

	if (char.raw === "\\") {
		// this happens if there is an incorrect control escape sequence.
		// E.g. /\c/; both `\` and `c` are character literals.
		return false;
	}

	// The basic assumption here is that there aren't any incomplete escape sequences.
	// Example: There isn't a pattern like /\x0\e/. Removing the \e from the e will complete the
	// sequence.

	if (char.raw.startsWith("\\")) {
		const charString = char.raw.substr(1);

		if (charString === "\\") {
			// we can't toggle \\
			return false;
		}

		if (charString === String.fromCodePoint(char.value)) {
			// The node is written as `\X` where `X` is the string representation of the Unicode
			// code point represented by the character.

			// Now, can we remove that `\` given the context of the character?

			if (inside) {
				// There are only 3 characters we have to be careful above: ], ^, and -
				// \] can't be toggled. \^ can only be toggled if it's not the first characters. \- and
				// only be toggled if it's the first or the last character. All other characters that
				// map to themselves are up for the taking.
				// https://tc39.es/ecma262/#prod-ClassEscape
				if (char.value === "]".charCodeAt(0)) {
					return false;
				} else if (char.value === "-".charCodeAt(0)) {
					return isFirstInCharClass(char) || isLastInCharClass(char);
				} else if (char.value === "^".charCodeAt(0)) {
					return !isFirstInCharClass(char);
				} else {
					return true;
				}
			} else {
				if (unicode) {
					// outside of character classes, only syntax characters can be escaped
					// https://tc39.es/ecma262/#prod-IdentityEscape
					return false;
				}

				if (charString === "/") {
					// Forward slashes are technically allowed, but we only handle regex literals and there they always
					// have to be escaped outside of character classes.
					return false;
				}

				// Outside of character classes, it's more complicated.
				if (SYNTAX_CHARACTERS.has(charString)) {
					// It's a special character that always has to be escaped.
					// `{` and `}` might now have to be escaped but the check whether it can be
					// unescaped is complicated, so let's just play it safe.
					return false;
				} else {
					// everything else is safe
					return true;
				}
			}
		} else {
			// we can't toggle escape sequences like \xFF
			return false;
		}
	} else {
		// The character is not escaped.
		// Now, can we add a backslash and still get parsed as the same Unicode code point?

		if (unicode) {
			// only syntax characters can optionally be escaped inside character classes. Outside character classes,
			// they are required to be escaped.
			if (inside && (SYNTAX_CHARACTERS.has(char.raw) || char.raw === "/")) {
				return true;
			} else {
				return false;
			}
		} else {
			if (/^[a-zA-Z0-9]$/.test(char.raw)) {
				// It's generally not safe to escape any alphanumeric characters.
				return false;
			} else {
				// everything else is safe
				return true;
			}
		}
	}
}

function charsOf(string: string): (character: number) => boolean {
	const chars = [...string].map(s => {
		const cp = s.codePointAt(0);
		if (cp === undefined) {
			throw new Error();
		}
		return cp;
	});

	if (chars.length === 0) {
		return () => false;
	} else if (chars.length === 1) {
		const char = chars[0];
		return c => c == char;
	} else {
		const set = new Set(chars);
		return c => set.has(c);
	}
}

const standardRules: readonly LiteralEscape[] = [
	{
		name: "standard:opening-square-bracket",
		escape: "require",
		context: "inside",
		matches: charsOf("["),
	},
	{
		name: "standard:closing-square-bracket",
		escape: "require",
		context: "outside",
		matches: charsOf("]"),
	},
	{
		name: "standard:curly-braces",
		escape: "require",
		context: "outside",
		matches: charsOf("{}"),
	},
	{
		name: "standard:all",
		escape: "disallow",
		context: "all",
		matches: () => true,
	},
];

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "How to handle identity escapes.",
			url: getDocUrl(/* #GENERATED */ "identity-escape"),
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					rules: {
						type: "array",
						items: {
							type: "object",
							properties: {
								name: {
									type: "string",
								},
								escape: {
									type: "string",
									enum: ["require", "disallow", "allow"],
								},
								context: {
									type: "string",
									enum: ["inside", "outside", "all"],
								},
								characters: {
									type: "string",
								},
							},
							required: ["escape", "characters"],
							additionalProperties: false,
						},
					},
				},
				additionalProperties: false,
			},
		],
	},

	create(context) {
		const options = context.options[0] || {};

		const literalEscaped: LiteralEscape[] = [];

		// add custom rules
		literalEscaped.push(...processLiteralEscapeOption(options["rules"] || []));

		// add default rules
		literalEscaped.push(...standardRules);

		return createRuleListener(({ visitAST, flags, replaceElement }) => {
			visitAST({
				onCharacterEnter(node) {
					if (!canToggleLiteralEscape(node, flags)) {
						// if we can't toggle it, there's nothing to do here
						return;
					}

					const inside = node.parent.type === "CharacterClass" || node.parent.type === "CharacterClassRange";
					const isEscaped = node.raw.startsWith("\\");
					const toggled = isEscaped ? node.raw.substr(1) : "\\" + node.raw;

					for (const escapeRule of literalEscaped) {
						if (
							(escapeRule.context === "inside" && !inside) ||
							(escapeRule.context === "outside" && inside)
						) {
							// the inside-character-class context doesn't match
							continue;
						}

						if (escapeRule.matches(node.value)) {
							// it's a match!

							const causedBy = escapeRule.name ? ` (${escapeRule.name})` : "";

							switch (escapeRule.escape) {
								case "allow":
									// that's the don't-care option
									return;

								case "disallow":
									if (isEscaped) {
										context.report({
											message: `The character ${mentionCharElement(
												node
											)} should be unescaped${causedBy}.`,
											...replaceElement(node, toggled),
										});
									}
									return;

								case "require":
									if (!isEscaped) {
										context.report({
											message: `The character ${mentionCharElement(
												node
											)} should be escaped${causedBy}.`,
											...replaceElement(node, toggled),
										});
									}
									return;

								default:
									throw new Error(`Invalid escape option "${escapeRule.escape}".`);
							}
						}
					}
				},
			});
		});
	},
} as CleanRegexRule;

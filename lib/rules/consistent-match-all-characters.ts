import { AnyCharacterSet, CharacterClass, Flags, Node } from "regexpp/ast";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { many, mention } from "../format";
import { assertNever } from "../util";
import { isMatchAll } from "../char-util";

function removeDescendantNodes<T extends { node: Node }>(nodes: (T & { node: Node })[]): T[] {
	// this is a O(n^2) implementation
	// by sorting the nodes and using binary search, this can be implemented in O(n * log(n))

	return nodes.filter(({ node }) => {
		return !nodes.some(({ node: n }) => n != node && n.start <= node.start && n.end >= node.end);
	});
}

type Mode = "dot" | "dot-if-dotAll" | "char-class";
const modes: Mode[] = ["dot", "dot-if-dotAll", "char-class"];

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Use one character class consistently whenever all characters have to be matched.",
			url: getDocUrl(/* #GENERATED */ "consistent-match-all-characters"),
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					mode: {
						type: "string",
						enum: modes,
					},
					charClass: {
						type: "string",
					},
				},
				additionalProperties: false,
			},
		],
	},

	create(context) {
		const options = context.options[0] || {};
		const mode: Mode = options.mode || "dot-if-dotAll";
		const charClass: string = options.charClass || "[\\s\\S]";

		function getReplacement(flags: Readonly<Flags>): string {
			switch (mode) {
				case "dot":
					return ".";

				case "dot-if-dotAll":
					if (flags.dotAll) {
						return ".";
					} else {
						return charClass;
					}

				case "char-class":
					return charClass;

				default:
					throw assertNever(mode);
			}
		}

		return createRuleListener(({ visitAST, pattern, flags, replaceElement, replaceLiteral }) => {
			const replacement = getReplacement(flags);

			let nodesToReplace: { node: CharacterClass | AnyCharacterSet; message: string; replacement: string }[] = [];

			visitAST({
				onCharacterClassEnter(node) {
					if (node.raw !== replacement && isMatchAll(node, flags)) {
						nodesToReplace.push({
							node,
							message: `Replace this character class with ${mention(replacement)}.`,
							replacement,
						});
					}
				},
				onCharacterSetEnter(node) {
					if ("." !== replacement && node.kind === "any" && flags.dotAll) {
						nodesToReplace.push({
							node,
							message: `Replace this dot with ${mention(replacement)}.`,
							replacement,
						});
					}
				},
			});

			// remove nodes contained by other nodes
			nodesToReplace = removeDescendantNodes(nodesToReplace);

			// nothing to report
			if (nodesToReplace.length === 0) {
				return;
			}

			if ((replacement === ".") === flags.dotAll) {
				// we don't need to change the flags, so just report all
				nodesToReplace.forEach(({ node, message, replacement }) => {
					context.report({
						message: message,
						...replaceElement(node, replacement, { dependsOnFlags: true }),
					});
				});
			} else {
				let newFlags;
				if (replacement === ".") {
					// add s flag
					newFlags = flags.raw + "s";
					// This is a bit trickier because the sorted-flags rule. If the flags are sorted, we will insert s
					// at the correct position, but if they aren't, we will just append the s.
					if (flags.raw === [...flags.raw].sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0)).join("")) {
						// sorted
						newFlags = [...newFlags].sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0)).join("");
					}
				} else {
					// remove s flag
					newFlags = flags.raw.replace(/s/, "");
				}

				// sort replacements
				nodesToReplace.sort((a, b) => a.node.start - b.node.start);

				// create new pattern
				const oldPattern = pattern.raw;
				let lastEndIndex = 0;
				let newPattern = "";

				for (const { node, replacement } of nodesToReplace) {
					newPattern += oldPattern.substr(lastEndIndex, node.start);
					newPattern += replacement;
					lastEndIndex = node.end;
				}
				newPattern += oldPattern.substr(lastEndIndex);

				const manyElements = many(nodesToReplace.length, "element");
				context.report({
					message:
						`${manyElements} in the pattern will be replaced with ${mention(replacement)}` +
						` and the s flag will be ${replacement === "." ? "added" : "removed"}.`,
					...replaceLiteral(newPattern, newFlags),
				});
			}
		});
	},
} as CleanRegexRule;

import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { isOctalEscapeSequence } from "../ast-util";

export default {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow octal escapes outside of character classes.",
			url: getDocUrl(/* #GENERATED */ "no-octal-escape"),
		},
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {
			visitAST({
				onCharacterEnter(node) {
					if (node.parent.type === "CharacterClass" || node.parent.type === "CharacterClassRange") {
						// inside character classes, octal escapes are fine
						return;
					}

					if (node.value > 0 && isOctalEscapeSequence(node)) {
						context.report({
							message: "Do not use octal escapes because they might be confused with backreferences.",
							...reportElement(node),
						});
					}
				},
			});
		});
	},
} as CleanRegexRule;

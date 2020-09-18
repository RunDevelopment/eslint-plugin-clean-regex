import fs from "fs";
import { assert } from "chai";
import { rules } from "../../lib";

// a test to verify that all rules are mark as fixable iff they use fixers

describe("Rules", function () {
	const fixerFunctions = /\b(?:replace|remove)(?:Element|Quantifier|Flags|Literal)\b/;

	const rulesDir = `${__dirname}/../../lib/rules`;
	const ruleNames = Object.keys(rules);

	for (const ruleName of ruleNames) {
		// is fixable?
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const fixable = require("../../lib/rules/" + ruleName).default.meta.fixable === "code";
		const sourceCode = fs.readFileSync(`${rulesDir}/${ruleName}.ts`, "utf8");

		describe(ruleName, function () {
			it(`should${fixable ? "" : " not"} use fixers`, function () {
				if (fixable) {
					assert.match(sourceCode, fixerFunctions);
				} else {
					assert.notMatch(sourceCode, fixerFunctions);
				}
			});
		});
	}
});

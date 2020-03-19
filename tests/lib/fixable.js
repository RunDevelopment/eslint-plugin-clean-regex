"use strict";

const fs = require("fs");
const { assert } = require("chai");
const { rules, configs } = require("../../lib");

// a test to verify that all rules are mark as fixable iff they use fixers

describe("Rules", function () {

	const fixerFunctions = /\b(?:replace|remove)(?:Element|Quantifier|Flags|Literal)\b/;

	const rulesDir = `${__dirname}/../../lib/rules`;
	const ruleNames = fs.readdirSync(rulesDir);

	for (const ruleName of ruleNames) {
		// is fixable?
		const fixable = require("../../lib/rules/" + ruleName).meta.fixable === "code";
		const sourceCode = fs.readFileSync(`${rulesDir}/${ruleName}`, "utf8");

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

	it("should be marked as fixable if the use fixers", function () {
		Object.keys(rules).map(r => "clean-regex/" + r).forEach(r => {
			assert.property(configs.recommended.rules, r);
		});
	});

	it("should contain no other rules", function () {
		const unknown = Object.keys(configs.recommended.rules).filter(r => {
			if (!/^clean-regex\//.test(r)) {
				// not a clean-regex rule
				return false;
			}
			return !(r.substr("clean-regex/".length) in rules);
		});

		if (unknown.length) {
			assert.fail(`Unknown rules: ${unknown.join(", ")}`);
		}
	});

});

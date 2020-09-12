const fs = require("fs");
const { assert } = require("chai");

/**
 * @param {string} path
 * @returns {boolean}
 */
function relevantFile(path) {
	return /\.(?:js|md|json)$/.test(path);
}

describe("Project", () => {
	const rules = fs.readdirSync(`${__dirname}/../lib/rules`).filter(relevantFile);
	const ruleTests = fs.readdirSync(`${__dirname}/../tests/lib/rules`).filter(relevantFile);
	const ruleDocs = fs.readdirSync(`${__dirname}/../docs/rules`).filter(relevantFile);

	it("should have test files for every rule", () => {
		assert.sameMembers(rules, ruleTests);
	});

	it("should have doc files for every rule", () => {
		assert.sameMembers(
			rules,
			ruleDocs.map(f => f.replace(/.md$/, ".js"))
		);
	});
});

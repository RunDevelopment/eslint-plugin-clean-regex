const fs = require("fs");
const { assert } = require("chai");

describe("Project", () => {

	const rules = fs.readdirSync(`${__dirname}/../lib/rules`);
	const ruleTests = fs.readdirSync(`${__dirname}/../tests/lib/rules`);
	const ruleDocs = fs.readdirSync(`${__dirname}/../docs/rules`);

	it("should have test files for every rule", () => {
		assert.sameMembers(rules, ruleTests);
	});

	it("should have doc files for every rule", () => {
		assert.sameMembers(rules, ruleDocs.map(f => f.replace(/.md$/, ".js")));
	});

});

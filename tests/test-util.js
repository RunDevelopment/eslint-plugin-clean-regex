"use strict";

const { RuleTester } = require("eslint");
const { filenameToRule } = require("../lib/util");


module.exports = {

	/**
	 *
	 * @param {string} testFilename
	 * @param {any} config
	 * @param {{ valid?: Array<string | ValidTestCase>; invalid?: InvalidTestCase[]; }} tests
	 *
	 * @typedef {import("eslint").RuleTester.ValidTestCase} ValidTestCase
	 * @typedef {import("eslint").RuleTester.InvalidTestCase} InvalidTestCase
	 */
	testRule(testFilename, config, tests) {
		const ruleName = filenameToRule(testFilename);
		const rule = require("../lib/rules/" + ruleName);
		const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 }, ...(config || {}) });

		ruleTester.run(ruleName, rule, tests);
	}

};

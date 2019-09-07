"use strict";

const { RuleTester } = require("eslint");

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
		const ruleName = (/([-\w]+)\.js$/.exec(testFilename) || [undefined, undefined])[1];
		if (!ruleName) {
			throw new Error(`Invalid rule test filename: ${testFilename}`);
		}

		const rule = require("../lib/rules/" + ruleName);

		const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 }, ...(config || {}) });

		ruleTester.run(ruleName, rule, tests);
	}

};

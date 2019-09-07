"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-constant-capturing-groups");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run("no-constant-capturing-groups", rule, {
	valid: [
		String(/(a*)/),
		String(/(a{2,3})/),
		String(/(a|b)/),
		String(/(a)/i),
		String(/(a|A)/),
		{ code: String(/(a)/), options: [{ allowNonEmpty: true }] },
	],
	invalid: [
		{ code: String(/()/), errors: [{ message: "Empty capturing group" }] },
		{ code: String(/()/), options: [{ allowNonEmpty: true }], errors: [{ message: "Empty capturing group" }] },
		{ code: String(/(\b)/), errors: [{ message: "The capturing group (\\b) can only capture the empty string." }] },
		{ code: String(/(\b)/), options: [{ allowNonEmpty: true }], errors: [{ message: "The capturing group (\\b) can only capture the empty string." }] },
		{ code: String(/(^\b|(?!b))/), errors: [{ message: "The capturing group (^\\b|(?!b)) can only capture the empty string." }] },
		{ code: String(/(a|a|a)/), errors: [{ message: "The capturing group (a|a|a) can only capture one word which is \"a\"." }] },
		{ code: String(/(,)/i), errors: [{ message: "The capturing group (,) can only capture one word which is \",\"." }] },
		{ code: String(/(\b(?:ab){3}$)/), errors: [{ message: "The capturing group (\\b(?:ab){3}$) can only capture one word which is \"ababab\"." }] },
	]
});

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-unnecessary-groups");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

const errors = [{ message: "Unnecessary non-capturing group." }];

ruleTester.run("no-unnecessary-groups", rule, {
	valid: [
		String(/(?:a|b)/),
		String(/(?:a{2})+/),
		String(/{(?:2)}/),
		String(/{(?:2,)}/),
		String(/{(?:2,5)}/),
		String(/{2,(?:5)}/),
		String(/a{(?:5})/),
		String(/\u{(?:41)}/),
		String(/(.)\1(?:2\s)/),
		String(/\0(?:2)/),
		String(/\x4(?:1)*/),
		String(/\x4(?:1)/),
		String(/\x(?:4)1/),
		String(/\x(?:41\w+)/),
		String(/\u004(?:1)/),
		String(/\u00(?:4)1/),
		String(/\u0(?:0)41/),
		String(/\u(?:0)041/),
		String(/\c(?:A)/),
		String(/(?:)/)
	],
	invalid: [
		{ code: String(/(?:)a/), output: String(/a/), errors },
		{ code: String(/(?:a)/), output: String(/a/), errors },
		{ code: String(/(?:(?:a|b))/), output: String(/(?:a|b)/), errors },
		{ code: String(/(?:a)+/), output: String(/a+/), errors },
		{ code: String(/(?:\w)/), output: String(/\w/), errors },
		{ code: String(/(?:[abc])*/), output: String(/[abc]*/), errors },
		{ code: String(/foo(?:[abc]*)bar/), output: String(/foo[abc]*bar/), errors },
		{ code: String(/foo(?:bar)/), output: String(/foobar/), errors },
	]
});

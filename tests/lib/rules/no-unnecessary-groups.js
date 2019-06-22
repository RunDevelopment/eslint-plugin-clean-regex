/**
 * @fileoverview Disallow unnecessary non-capturing groups
 * @author Michael Schmidt
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-unnecessary-groups");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run("no-unnecessary-groups", rule, {
	valid: [
		String(/(?:a|b)/),
		String(/(?:a{2})+/),
		String(/{(?:2)}/),
		String(/{(?:2,)}/),
		String(/{(?:2,5)}/),
		String(/{2,(?:5)}/),
		String(/{(?:5})/),
		String(/\u{(?:41)}/),
		String(/\u{4(?:1)}/),
		String(/\u{F(?:F)}/),
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
	],
	invalid: [
		{ code: String(/(?:)/), errors: [{ message: "Empty non-capturing group." }] },
		{ code: String(/(?:a)/), errors: [{ message: "The non-capturing group around a is unnecessary." }] },
		{ code: String(/(?:(?:a|b))/), errors: [{ message: "The non-capturing group around (?:a|b) is unnecessary." }] },
		{ code: String(/(?:a)+/), errors: [{ message: "The non-capturing group around a is unnecessary." }] },
		{ code: String(/(?:\w)/), errors: [{ message: "The non-capturing group around \\w is unnecessary." }] },
		{ code: String(/(?:[abc])*/), errors: [{ message: "The non-capturing group around [abc] is unnecessary." }] },
		{ code: String(/foo(?:[abc]*)bar/), errors: [{ message: "The non-capturing group (?:[abc]*) has neither quantifiers nor does it contain alternations and this therefore unnecessary." }] },
	]
});

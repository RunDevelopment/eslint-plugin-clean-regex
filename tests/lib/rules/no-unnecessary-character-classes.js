"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-unnecessary-character-classes");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

const errors = [{ message: /[\s\S]*/ }];

ruleTester.run("no-unnecessary-character-classes", rule, {
	valid: [
		String(/\c1/),
		String(/[^]/),
		String(/[$]/),
		String(/[\b]/),
		String(/[\B]/),
		String(/[a-f]/),
		String(/[^a]/),
		String(/{[2]}/),
		String(/(.)\1[2]/),
		{ code: String(/[.][*][+][?][{][}][(][)][[][\]][/][\^][$]/), options: [{ avoidEscape: true }] },
	],
	invalid: [
		//{ code: String(/[a]/), errors: [{ message: "" }] },
		{ code: String(/[\w]/), output: String(/\w/), errors },
		{ code: String(/[\W]/), output: String(/\W/), errors },
		{ code: String(/[\s]/), output: String(/\s/), errors },
		{ code: String(/[\S]/), output: String(/\S/), errors },
		{ code: String(/[^\s]/), output: String(/\S/), errors },
		{ code: String(/[^\S]/), output: String(/\s/), errors },
	]
});

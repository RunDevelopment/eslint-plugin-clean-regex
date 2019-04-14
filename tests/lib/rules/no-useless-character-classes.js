/**
 * @fileoverview Disallow useless character classes
 * @author Michael Schmidt
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-useless-character-classes");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run("no-useless-character-classes", rule, {
	valid: [
		String(/\c1/),
		String(/[^]/),
		String(/[\b]/),
		String(/[a-f]/),
		String(/[^a]/),
		String(/{[2]}/),
		String(/(.)\1[2]/),
		{ code: String(/[.][*][+][?][{][}][(][)][[][\]][/][\^][$]/), options: [{ avoidEscape: true }] },
	],
	invalid: [
		//{ code: String(/[a]/), errors: [{ message: "" }] },
		{ code: String(/[\w]/), errors: [{ message: "" }] },
		{ code: String(/[\S]/), errors: [{ message: "" }] },
		{ code: String(/[^\s]/), errors: [{ message: "" }] },
	]
});

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-unnecessary-capturing-groups");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

const errors = [{
	message: "This capturing is inside another capturing and has no references to it. " +
		"Consider replacing it with a non-capturing group."
}];

ruleTester.run("no-unnecessary-capturing-groups", rule, {
	valid: [
		String(/(foo)\s*(bar)/),
		String(/(.(.).)\2./),
		String(/((\w)\2)/),
		String(/((?<foo>\w)\k<foo>)/),
		String(/(foo(?=(.*))\W)/),
	],
	invalid: [
		{ code: String(/(())/), errors },
		{ code: String(/(foo(bar))/), errors },
	]
});

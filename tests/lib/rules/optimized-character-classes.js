/**
 * @fileoverview Optimized character classes
 * @author Michael Schmidt
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/optimized-character-classes");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run("optimized-character-classes", rule, {
	valid: [
		String(/[a-fA-F]/),
	],
	invalid: [
		{ code: String(/[\wa]/), errors: [{ message: "Optimized character class: a (\\x61) is already included by \\w." }] },
		{ code: String(/[a\w]/), errors: [{ message: "Optimized character class: a (\\x61) is already included by \\w." }] },
		{ code: String(/[a-zh]/), errors: [{ message: "Optimized character class: h (\\x68) is already included by a-z." }] },
		{ code: String(/[\x41A]/), errors: [{ message: "Optimized character class: A (\\x41) is already included by \\x41." }] },
		{ code: String(/[hH]/i), errors: [{ message: "Optimized character class: H (\\x48) is already included by h." }] },
		{ code: String(/[a-zH]/i), errors: [{ message: "Optimized character class: H (\\x48) is already included by a-z." }] },

		{ code: String(/[a-za-f]/), errors: [{ message: "Optimized character class: a-f (\\x61-\\x66) is already included by a-z." }] },
		{ code: String(/[a-fa-f]/), errors: [{ message: "Optimized character class: a-f (\\x61-\\x66) is already included by a-f." }] },
		{ code: String(/[\wa-f]/), errors: [{ message: "Optimized character class: a-f (\\x61-\\x66) is already included by \\w." }] },
		{ code: String(/[a-fA-F]/i), errors: [{ message: "Optimized character class: A-F (\\x41-\\x46) is already included by a-f." }] },
		{ code: String(/[0-9\w]/i), errors: [{ message: "Optimized character class: 0-9 (\\x30-\\x39) is already included by \\w." }] },
		{ code: String(/[a-f\D]/i), errors: [{ message: "Optimized character class: a-f (\\x61-\\x66) is already included by \\D." }] },

		{ code: String(/[\w\d]/i), errors: [{ message: "Optimized character class: \\d is already included by \\w." }] },
	]
});

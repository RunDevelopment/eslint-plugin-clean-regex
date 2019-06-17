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
		{ code: String(/[\wa]/), output: String(/[\w]/), errors: [{ message: "Optimized character class: a (\\x61) is already included by \\w." }] },
		{ code: String(/[a\w]/), output: String(/[\w]/), errors: [{ message: "Optimized character class: a (\\x61) is already included by \\w." }] },
		{ code: String(/[a-zh]/), output: String(/[a-z]/), errors: [{ message: "Optimized character class: h (\\x68) is already included by a-z." }] },
		{ code: String(/[\x41A]/), output: String(/[\x41]/), errors: [{ message: "Optimized character class: A (\\x41) is already included by \\x41." }] },
		{ code: String(/[hH]/i), output: String(/[h]/i), errors: [{ message: "Optimized character class: H (\\x48) is already included by h." }] },
		{ code: String(/[a-zH]/i), output: String(/[a-z]/i), errors: [{ message: "Optimized character class: H (\\x48) is already included by a-z." }] },

		{ code: String(/[a-za-f]/), output: String(/[a-z]/), errors: [{ message: "Optimized character class: a-f (\\x61-\\x66) is already included by a-z." }] },
		{ code: String(/[a-fa-f]/), output: String(/[a-f]/), errors: [{ message: "Optimized character class: a-f (\\x61-\\x66) is already included by a-f." }] },
		{ code: String(/[\wa-f]/), output: String(/[\w]/), errors: [{ message: "Optimized character class: a-f (\\x61-\\x66) is already included by \\w." }] },
		{ code: String(/[a-fA-F]/i), output: String(/[a-f]/i), errors: [{ message: "Optimized character class: A-F (\\x41-\\x46) is already included by a-f." }] },
		{ code: String(/[0-9\w]/i), output: String(/[\w]/i), errors: [{ message: "Optimized character class: 0-9 (\\x30-\\x39) is already included by \\w." }] },
		{ code: String(/[a-f\D]/i), output: String(/[\D]/i), errors: [{ message: "Optimized character class: a-f (\\x61-\\x66) is already included by \\D." }] },

		{ code: String(/[\w\d]/i), output: String(/[\w]/i), errors: [{ message: "Optimized character class: \\d is already included by \\w." }] },
	]
});

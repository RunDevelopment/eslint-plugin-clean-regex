"use strict";

const { testRule } = require("../../test-util");

testRule(__filename, undefined, {
	valid: [
		String(/(?=(a*))\w+\1/),
		String(/(?<=a{4})/)
	],
	invalid: [
		{
			code: String(/(?=ba*)/),
			errors: [{ message: "The quantified expression a* at the end of the expression tree should only be matched a constant number of times. The expression can be removed without affecting the lookaround." }]
		},
		{
			code: String(/(?=(?:a|b|abc*))/),
			errors: [{ message: "The quantified expression c* at the end of the expression tree should only be matched a constant number of times. The expression can be removed without affecting the lookaround." }]
		},
		{
			code: String(/(?=(?:a|b|abc+))/),
			errors: [{ message: "The quantified expression c+ at the end of the expression tree should only be matched a constant number of times. The expression can be replaced with c (no quantifier) without affecting the lookaround." }]
		},
		{
			code: String(/(?=(?:a|b|abc{4,9}))/),
			errors: [{ message: "The quantified expression c{4,9} at the end of the expression tree should only be matched a constant number of times. The expression can be replaced with c{4} without affecting the lookaround." }]
		},
		{
			code: String(/(?<=[a-c]*)/),
			errors: [{ message: "The quantified expression [a-c]* at the start of the expression tree should only be matched a constant number of times. The expression can be removed without affecting the lookaround." }]
		},
		{
			code: String(/(?<=(c)*ab)/),
			errors: [{ message: "The quantified expression (c)* at the start of the expression tree should only be matched a constant number of times. The expression can be removed without affecting the lookaround." }]
		},
	]
});

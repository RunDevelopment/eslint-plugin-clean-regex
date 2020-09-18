import { testRule } from "../../test-util";

testRule(__filename, undefined, {
	valid: [
		// i
		String(/foo/i),
		String(/BAR/i),
		String(/\x41/i),
		String(/[a-zA-Z]/i), // in that case you should use the i flag instead of removing it

		// m
		String(/^foo/m),
		String(/foo$/m),
		String(/^foo$/m),

		// s
		String(/./s),

		// ignore
		{ code: String(/\w/i), options: [{ ignore: ["i"] }] },
		{ code: String(/\w/m), options: [{ ignore: ["m"] }] },
		{ code: String(/\w/s), options: [{ ignore: ["s"] }] },
	],
	invalid: [
		// i
		{ code: String(/\w/i), output: String(/\w/), errors: [{ message: "The i flags is unnecessary because the pattern does not contain case-variant characters." }] },

		// m
		{ code: String(/\w/m), output: String(/\w/), errors: [{ message: "The m flags is unnecessary because the pattern does not contain start (^) or end ($) assertions." }] },

		// s
		{ code: String(/\w/s), output: String(/\w/), errors: [{ message: "The s flags is unnecessary because the pattern does not contain dots (.)." }] },

		// all flags
		{
			code: String(/\w/ims),
			output: String(/\w/),
			errors: [
				{ message: "The flags ims are unnecessary because the pattern [i] does not contain case-variant characters, [m] does not contain start (^) or end ($) assertions, [s] does not contain dots (.)" },
			]
		},
	]
});

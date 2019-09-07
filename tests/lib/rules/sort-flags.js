"use strict";

const { testRule } = require("../../test-util");

testRule(__filename, undefined, {
	valid: [
		String.raw`/\w/i`,
		String.raw`/\w/im`,
		String.raw`/\w/gi`,
		String.raw`/\w/gimsuy`,
	],
	invalid: [
		{
			code: String.raw`/\w/yusimg`,
			output: String.raw`/\w/gimsuy`,
			errors: [{ message: "The flags yusimg should in the order gimsuy." }]
		},
	]
});

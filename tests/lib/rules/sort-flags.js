"use strict";

const { testRule } = require("../../test-util");

testRule(__filename, undefined, {
	valid: [
		String.raw`/\w/i`,
		String.raw`/\w/im`,
		String.raw`/\w/gi`,
		String.raw`/\w/gimsuy`,
		{ code: String.raw`/\w/yusimg`, options: [{ order: "yusimg" }] },
	],
	invalid: [
		{
			code: String.raw`/\w/yusimg`,
			output: String.raw`/\w/gimsuy`,
			errors: [{ message: "The flags yusimg should in the order gimsuy." }]
		},
		{
			code: String.raw`/\w/gimsuy`,
			output: String.raw`/\w/yusimg`,
			options: [{ order: "yusimg" }],
			errors: [{ message: "The flags gimsuy should in the order yusimg." }]
		},
		{
			code: String.raw`/\w/gimu`,
			options: [{ order: "gim" }],
			errors: [{ message: "Unknown flag u." }]
		},
	]
});

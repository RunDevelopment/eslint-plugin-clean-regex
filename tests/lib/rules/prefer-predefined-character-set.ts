import { testRule } from "../../test-util";

testRule(__filename, undefined, {
	valid: [
		String(/\w+/),
		String(/[\w]+/),
		String(/[\d]+/),
		String(/./),
		String(/[1-9]/),
		String(/[a-zA-Z\d]/),
		String(/[\S]/),

		String(/[0-9a-f]/),
		{ code: String(/[0-9a-f]/), options: [{ allowDigitRange: true }] }
	],
	invalid: [
		{ code: String(/[0-9]/), output: String(/[\d]/), errors: 1 },
		{ code: String(/[1234567890]/), output: String(/[\d]/), errors: 1 },
		{ code: String(/[^1234567890]/), output: String(/[^\d]/), errors: 1 },
		{ code: String(/[-\da-zA-Z_]/), output: String(/[-\w]/), errors: 1 },
		{ code: String(/[\da-z_-]/i), output: String(/[\w-]/i), errors: 1 },
		{ code: String(/[-0-9a-zA-Z_]/), output: String(/[-\w]/), errors: 1 },
		{ code: String(/[0-9a-z_-]/i), output: String(/[\w-]/i), errors: 1 },
		{ code: String(/[0-9a-hd-z_-]/i), output: String(/[\w-]/i), errors: 1 },

		{
			code: String(/[0-9a-f]/),
			options: [{ allowDigitRange: false }],
			output: String(/[\da-f]/),
			errors: 1
		},
	]
});

"use strict";

const { testRule } = require("../../test-util");

testRule(__filename, undefined, {
	valid: [
		String(/[]/),
		String(/[^]/),
		String(/[a]/),
		String(/[abc]/),
		String(/[\s\w]/),
		String(/[a-fA-F]/),
		String(/[a-c]/),
	],
	invalid: [
		{ code: String(/[\wa]/), output: String(/[\w]/), errors: [{ message: "a (\\x61) is already included by \\w." }] },
		{ code: String(/[a\w]/), output: String(/[\w]/), errors: [{ message: "a (\\x61) is already included by \\w." }] },
		{ code: String(/[a-zh]/), output: String(/[a-z]/), errors: [{ message: "h (\\x68) is already included by a-z (\\x61-\\x7a)." }] },
		{ code: String(/[\x41A]/), output: String(/[\x41]/), errors: [{ message: "A (\\x41) is already included by \\x41 (\\x41)." }] },
		{ code: String(/[hH]/i), output: String(/[h]/i), errors: [{ message: "H (\\x48) is already included by h (\\x68)." }] },
		{ code: String(/[a-zH]/i), output: String(/[a-z]/i), errors: [{ message: "H (\\x48) is already included by a-z (\\x61-\\x7a)." }] },

		{ code: String(/[a-a]/), output: String(/[a]/), errors: [{ message: "a-a (\\x61-\\x61) contains only a single value." }] },
		{ code: String(/[a-b]/), output: String(/[ab]/), errors: [{ message: "a-b (\\x61-\\x62) contains only its two ends." }] },
		{ code: String(/[---]/), output: String(/[\-]/), errors: [{ message: "--- (\\x2d-\\x2d) contains only a single value." }] },

		{ code: String(/[a-za-f]/), output: String(/[a-z]/), errors: [{ message: "a-f (\\x61-\\x66) is already included by a-z (\\x61-\\x7a)." }] },
		{ code: String(/[a-fa-f]/), output: String(/[a-f]/), errors: [{ message: "a-f (\\x61-\\x66) is already included by a-f (\\x61-\\x66)." }] },
		{ code: String(/[\wa-f]/), output: String(/[\w]/), errors: [{ message: "a-f (\\x61-\\x66) is already included by \\w." }] },
		{ code: String(/[a-fA-F]/i), output: String(/[a-f]/i), errors: [{ message: "A-F (\\x41-\\x46) is already included by a-f (\\x61-\\x66)." }] },
		{ code: String(/[0-9\w]/i), output: String(/[\w]/i), errors: [{ message: "0-9 (\\x30-\\x39) is already included by \\w." }] },
		{ code: String(/[a-f\D]/i), output: String(/[\D]/i), errors: [{ message: "a-f (\\x61-\\x66) is already included by \\D." }] },

		{ code: String(/[\w\d]/i), output: String(/[\w]/i), errors: [{ message: "\\d is already included by \\w." }] },
		{ code: String(/[\s\s]/), output: String(/[\s]/), errors: [{ message: "\\s is already included by \\s." }] },

		{ code: String(/[\s\n]/), output: String(/[\s]/), errors: [{ message: "\\n (\\x0a) is already included by \\s." }] },

		{ code: String(/[\S\d]/), output: String(/[\S]/), errors: [{ message: "\\d is already included by \\S." }] },

		{ code: String(/[a-cd-fb-e]/), output: String(/[a-cd-f]/), errors: [{ message: "b-e (\\x62-\\x65) is already included by some combination of other elements." }] },

		{ code: String(/[\w\p{ASCII}]/u), output: String(/[\p{ASCII}]/u), errors: [{ message: "\\w is already included by \\p{ASCII}." }] },
	]
});

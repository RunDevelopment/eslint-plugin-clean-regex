"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /[\s\S]*/ }];

testRule(__filename, undefined, {
	valid: [
		String(/\c1/),
		String(/[^]/),
		String(/[a-f]/),
		String(/[^a]/),
		String(/[^\n]/),
		String(/{[2]}/),
		String(/(.)\1[2]/),
		{ code: String(/[\b]/), options: [{ avoidEscape: true }] },
		{ code: String(/[.][*][+][?][{][}][(][)][[][/][$]/), options: [{ avoidEscape: true }] },
		String(/[\4]/), // octal escape
		String(/(?<foo>a*)[\k]<foo>/),
	],
	invalid: [
		// character sets
		{ code: String(/[\w]/), output: String(/\w/), errors },
		{ code: String(/[\W]/), output: String(/\W/), errors },
		{ code: String(/[\s]/), output: String(/\s/), errors },
		{ code: String(/[\S]/), output: String(/\S/), errors },
		{ code: String(/[\d]/), output: String(/\d/), errors },
		{ code: String(/[\p{Script_Extensions=Greek}]/u), output: String(/\p{Script_Extensions=Greek}/u), errors },
		{ code: String(/[^\s]/), output: String(/\S/), errors },
		{ code: String(/[^\S]/), output: String(/\s/), errors },
		{ code: String(/[^\p{Script_Extensions=Greek}]/u), output: String(/\P{Script_Extensions=Greek}/u), errors },

		// special characters
		{ code: String(/[.]/), output: String(/\./), errors },
		{ code: String(/[*]/), output: String(/\*/), errors },
		{ code: String(/[+]/), output: String(/\+/), errors },
		{ code: String(/[?]/), output: String(/\?/), errors },
		{ code: String(/[{]/), output: String(/\{/), errors },
		{ code: String(/[}]/), output: String(/\}/), errors },
		{ code: String(/[(]/), output: String(/\(/), errors },
		{ code: String(/[)]/), output: String(/\)/), errors },
		{ code: String(/[[]/), output: String(/\[/), errors },
		{ code: String(/[/]/), output: String(/\//), errors },
		{ code: String(/[$]/), output: String(/\$/), errors },

		// backspace
		{ code: String(/[\b]/), output: String(/\x08/), errors },

		// escape sequences
		{ code: String(/[\0]/), output: String(/\0/), errors },
		{ code: String(/[\x02]/), output: String(/\x02/), errors },
		{ code: String(/[\uFFFF]/), output: String(/\uFFFF/), errors },
		{ code: String(/[\u{10FFFF}]/u), output: String(/\u{10FFFF}/u), errors },
		{ code: String(/[\cI]/), output: String(/\cI/), errors },
		{ code: String(/[\f]/), output: String(/\f/), errors },
		{ code: String(/[\n]/), output: String(/\n/), errors },
		{ code: String(/[\r]/), output: String(/\r/), errors },
		{ code: String(/[\t]/), output: String(/\t/), errors },
		{ code: String(/[\v]/), output: String(/\v/), errors },

		// literals
		{ code: String(/[a]/), output: String(/a/), errors },
		{ code: String(/[a]/i), output: String(/a/i), errors },
		{ code: String(/[H]/), output: String(/H/), errors },
		{ code: String(/[%]/), output: String(/%/), errors },

		// escaped literals
		{ code: String(/[\a]/), output: String(/\a/), errors },
		{ code: String(/[\g]/), output: String(/\g/), errors },
		{ code: String(/[\H]/), output: String(/\H/), errors },
		{ code: String(/[\"]/), output: String(/\"/), errors },
		{ code: String(/[\\]/), output: String(/\\/), errors },
		{ code: String(/[\-]/), output: String(/\-/), errors },
		{ code: String(/[\]]/), output: String(/\]/), errors },
		{ code: String(/[\^]/), output: String(/\^/), errors },
		{ code: String(/[\/]/), output: String(/\//), errors },
		{ code: String(/[\%]/), output: String(/\%/), errors },

	]
});

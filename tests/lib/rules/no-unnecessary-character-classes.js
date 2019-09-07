"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /[\s\S]*/ }];

testRule(__filename, undefined, {
	valid: [
		String(/\c1/),
		String(/[^]/),
		String(/[$]/),
		String(/[\b]/),
		String(/[\B]/),
		String(/[a-f]/),
		String(/[^a]/),
		String(/{[2]}/),
		String(/(.)\1[2]/),
		{ code: String(/[.][*][+][?][{][}][(][)][[][\]][/][\^][$]/), options: [{ avoidEscape: true }] },
	],
	invalid: [
		//{ code: String(/[a]/), errors: [{ message: "" }] },
		{ code: String(/[\w]/), output: String(/\w/), errors },
		{ code: String(/[\W]/), output: String(/\W/), errors },
		{ code: String(/[\s]/), output: String(/\s/), errors },
		{ code: String(/[\S]/), output: String(/\S/), errors },
		{ code: String(/[^\s]/), output: String(/\S/), errors },
		{ code: String(/[^\S]/), output: String(/\s/), errors },
	]
});

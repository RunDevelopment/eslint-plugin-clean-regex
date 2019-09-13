"use strict";

const { assert } = require("chai");
const { rules, configs } = require("../../lib");


describe("Recommended config", function () {

	it("should contain all rules", function () {
		Object.keys(rules).map(r => "clean-regex/" + r).forEach(r => {
			assert.property(configs.recommended.rules, r);
		});
	});

	it("should contain no other rules", function () {
		const unknown = Object.keys(configs.recommended.rules).filter(r => {
			if (!/^clean-regex\//.test(r)) {
				// not a clean-regex rule
				return false;
			}
			return !(r.substr("clean-regex/".length) in rules);
		});

		if (unknown.length) {
			assert.fail(`Unknown rules: ${unknown.join(", ")}`);
		}
	});

});

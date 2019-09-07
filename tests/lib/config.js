"use strict";

const { assert } = require("chai");
const { rules, configs } = require("../../lib");


describe("Recommended config", function () {

	it("should contain all rules", function () {
		Object.keys(rules).map(r => "clean-regex/" + r).forEach(r => {
			assert.property(configs.recommended.rules, r);
		});
	});

});

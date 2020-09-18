import { assert } from "chai";
import { rules, configs } from "../../lib";

describe("Recommended config", function () {
	it("should contain all rules", function () {
		Object.keys(rules)
			.map(r => "clean-regex/" + r)
			.forEach(r => {
				assert.property(configs.recommended.rules, r);
			});
	});

	it("should contain no other rules", function () {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const unknown = Object.keys(configs.recommended.rules!).filter(r => {
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

"use strict";

const requireIndex = require("requireindex");

module.exports = {
	rules: requireIndex(__dirname + "/rules"),

	configs: {
		recommended: {
			plugins: ["clean-regex"],
			rules: {
				"clean-regex/no-constant-capturing-group": "warn",
				"clean-regex/no-empty-lookaround": "error",
				"clean-regex/no-nested-capturing-group": "warn",
				"clean-regex/no-trivially-nested-lookaround": "error",
				"clean-regex/no-unnecessary-character-class": "error",
				"clean-regex/no-unnecessary-flag": "error",
				"clean-regex/no-unnecessary-group": "error",
				"clean-regex/no-unnecessary-quantifier": "error",
				"clean-regex/optimal-lookaround-quantifier": "error",
				"clean-regex/optimized-character-class": "error",
				"clean-regex/sort-flags": "error",
			}
		}
	}
};

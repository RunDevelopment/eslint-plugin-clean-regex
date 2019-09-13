"use strict";

const requireIndex = require("requireindex");

module.exports = {
	rules: requireIndex(__dirname + "/rules"),

	configs: {
		recommended: {
			plugins: ["clean-regex"],
			rules: {
				"clean-regex/no-constant-capturing-group": "warn",
				"clean-regex/no-early-backreference": "error",
				"clean-regex/no-empty-lookaround": "error",
				"clean-regex/no-trivially-nested-lookaround": "warn",
				"clean-regex/no-unnecessary-character-class": "warn",
				"clean-regex/no-unnecessary-flag": "warn",
				"clean-regex/no-unnecessary-group": "warn",
				"clean-regex/no-unnecessary-quantifier": "warn",
				"clean-regex/optimal-lookaround-quantifier": "error",
				"clean-regex/optimized-character-class": "warn",
				"clean-regex/sort-flags": "warn",
			}
		}
	}
};

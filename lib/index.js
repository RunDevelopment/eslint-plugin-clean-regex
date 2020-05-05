"use strict";

const requireIndex = require("requireindex");

module.exports = {
	rules: requireIndex(__dirname + "/rules"),

	configs: {
		recommended: {
			plugins: ["clean-regex"],
			rules: {
				"clean-regex/confusing-quantifier": "warn",
				"clean-regex/consistent-match-all-characters": "warn",
				"clean-regex/no-constant-capturing-group": "warn",
				"clean-regex/no-empty-backreference": "error",
				"clean-regex/no-empty-lookaround": "error",
				"clean-regex/no-lazy-ends": "warn",
				"clean-regex/no-obscure-range": "error",
				"clean-regex/no-octal-escape": "error",
				"clean-regex/no-optional-assertion": "error",
				"clean-regex/no-potentially-empty-backreference": "warn",
				"clean-regex/no-trivially-nested-lookaround": "warn",
				"clean-regex/no-lone-square-bracket": "warn",
				"clean-regex/no-unnecessary-assertions": "error",
				"clean-regex/no-unnecessary-character-class": "warn",
				"clean-regex/no-unnecessary-flag": "warn",
				"clean-regex/no-unnecessary-group": "warn",
				"clean-regex/no-unnecessary-lazy": "warn",
				"clean-regex/no-unnecessary-quantifier": "warn",
				"clean-regex/no-zero-quantifier": "error",
				"clean-regex/optimal-concatenation-quantifier": "warn",
				"clean-regex/optimal-lookaround-quantifier": "warn",
				"clean-regex/optimized-character-class": "warn",
				"clean-regex/prefer-character-class": "warn",
				"clean-regex/prefer-predefined-character-set": "warn",
				"clean-regex/prefer-predefined-quantifiers": "warn",
				"clean-regex/simple-constant-quantifier": "warn",
				"clean-regex/sort-flags": "warn",
			}
		}
	}
};

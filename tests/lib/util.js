"use strict";

const { assert } = require("chai");
const { RegExpParser } = require("regexpp");

const { getConstant } = require("../../lib/util");


const parser = new RegExpParser({ ecmaVersion: 2018 });

describe("getConstant", function () {
	const tests = {
		constant: [
			/abc/,
			/(?:abc)/,
			/(abc)/,
			/(?:(?:(?:(?:a)b)c)d)/,
			/(?:ab){2}c{4}/,
			/\babc$/,
			/(?<=^|\W)abc(?=\n)/,
			/b|b/,
			/[a-a]/,
			/[aaa]/,
			/[a-aa-aaa]/,
			/(a\1)/, // can handle recursive back references
		],
		notConstant: [
			/a*/,
			/b+/,
			/b?/,
			/b{1,2}/,
			/b|B/,
			/a|b/,
			/[ab]/,
			/[\w]/,
			/\s/,
			/[a-b]/,
			/[A-a]/i,
			/[^]/,
			/[\s\S]/,
			/[^\s\S]/,
			/b/i,
			/[b]/i,
		]
	};

	/**
	 * Runs a new test for each of the given regexes with the given test function.
	 * @param {string} name
	 * @param {(node: import("regexpp/ast").Node, flags: import("regexpp/ast").Flags) => void} testFn
	 * @param {readonly RegExp[]} patterns
	 */
	function testPatterns(name, testFn, patterns) {
		describe(name, function () {
			for (const regex of patterns) {
				it(regex.source, function () {
					testFn(parser.parsePattern(regex.source), parser.parseFlags(regex.flags));
				});
			}
		});
	}

	testPatterns("constant", (node, flags) => assert.isObject(getConstant(node, flags)), tests.constant);
	testPatterns("not constant", (node, flags) => assert.isFalse(getConstant(node, flags)), tests.notConstant);

});

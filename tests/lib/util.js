/**
 * @fileoverview Tests for utility functions.
 * @author Michael Schmidt
 */

"use strict";

const { assert } = require("chai");
const { RegExpParser } = require("regexpp");

const { isConstant } = require("../../lib/util");


const parser = new RegExpParser({ ecmaVersion: 2018 });

describe("isConstant", function () {
	const tests = {
		constant: [
			/abc/,
			/(?:abc)/,
			/(abc)/,
			/(?:(?:(?:(?:a)b)c)d)/,
			/(?:ab){2}c{4}/,
			/\babc$/,
			/(?<=^|\W)abc(?=\n)/,
		],
		notConstant: [
			/a*/,
			/b+/,
			/b?/,
			/b{1,2}/,
			/b|b/,
		]
	};

	/**
	 * Runs a new test for each of the given regexes with the given test function.
	 * @param {string} name
	 * @param {(elements: import("regexpp/ast").Element[]) => void} testFn
	 * @param {readonly RegExp[]} patterns
	 */
	function testPatterns(name, testFn, patterns) {
		describe(name, function () {
			for (const regex of patterns) {
				it(regex.source, function () {
					const ast = parser.parsePattern(`(?:${regex.source})`);
					testFn(ast.alternatives[0].elements);
				});
			}
		});
	}

	testPatterns("constant", elements => assert.isTrue(isConstant(elements)), tests.constant);
	testPatterns("not constant", elements => assert.isFalse(isConstant(elements)), tests.notConstant);

});

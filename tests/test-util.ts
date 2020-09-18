import { RuleTester } from "eslint";
import { filenameToRule } from "../lib/rules-util";

interface Test {
	valid?: Array<string | RuleTester.ValidTestCase>;
	invalid?: RuleTester.InvalidTestCase[];
}

export function testRule(testFilename: string, config: any, tests: Test): void {
	const ruleName = filenameToRule(testFilename);
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const rule = require("../lib/rules/" + ruleName).default;
	const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 }, ...(config || {}) });

	ruleTester.run(ruleName, rule, tests);
}

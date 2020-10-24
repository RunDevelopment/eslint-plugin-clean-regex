const { series } = require("gulp");
const fs = require("fs").promises;
require('ts-node').register({ transpileOnly: true });
const { repoTreeRoot, filenameToRule } = require("./lib/rules-util");
const configs = require("./lib/configs").default;
const eslint = require("eslint");


/**
 * @param {Record<string, T>} obj
 * @returns {T[]}
 * @template T
 */
function values(obj) {
	return Object.keys(obj).map(k => obj[k]);
}

/**
 * Applies all ESLint fixes of this plugin to the given code.
 *
 * @param {string} code
 * @returns {string}
 */
function fixCode(code) {
	const linter = new eslint.Linter();

	const rules = require("./lib/index").rules;
	for (const name in rules) {
		if (rules.hasOwnProperty(name)) {
			linter.defineRule("clean-regex/" + name, rules[name]);
		}
	}

	return linter.verifyAndFix(code, {
		parserOptions: {
			ecmaVersion: 2019,
			sourceType: "script"
		},
		...configs.recommended
	}).output;
}

/**
 * @typedef RuleMeta
 * @property {string} name
 * @property {"problem" | "suggestion" | "layout"} type
 * @property {string} description
 * @property {string} docUrl
 * @property {boolean} fixable
 * @property {"off" | "error" | "warn"} recommendedConfig
 * @property {RuleMetaFiles} files
 *
 * @typedef RuleMetaFiles
 * @property {string} source
 * @property {string} test
 * @property {string} doc
 */
async function getRules() {
	/** @type {Record<string, RuleMeta>} */
	const rules = {};
	const files = (await fs.readdir(__dirname + "/lib/rules")).filter(p => /\.ts$/i.test(p));

	for (const file of files) {
		const rule = filenameToRule(file);

		/** @type {import("eslint").Rule.RuleModule["meta"]} */
		const meta = require("./lib/rules/" + file).default.meta;
		if (!meta || !meta.docs || !meta.type || !meta.docs.description || !meta.docs.url) {
			console.dir(meta);
			throw new Error("Incomplete meta data for rule " + rule);
		}

		rules[rule] = {
			name: rule,
			type: meta.type,
			description: meta.docs.description,
			docUrl: meta.docs.url,
			fixable: meta.fixable === "code",
			recommendedConfig: /** @type {any} */(configs.recommended.rules["clean-regex/" + rule]),
			files: {
				source: `lib/rules/${rule}.ts`,
				test: `tests/lib/rules/${rule}.ts`,
				doc: `docs/rules/${rule}.md`,
			},
		};
	}
	return rules;
}

async function readme() {
	const rules = await getRules();
	const ruleNames = Object.keys(rules).sort();

	const generatedMd = ["problem", "suggestion", "layout"]
		.map(type => {
			let mdTable = [
				`### ${type === "layout" ? "Layout" : type.substr(0, 1).toUpperCase() + type.substr(1) + "s"}\n`,
				"\n",
				"| | Rule | Description |\n",
				"| :--- | :--- | :--- |\n",
			].join("");

			let ruleCounter = 0;
			for (const rule of ruleNames) {
				const meta = rules[rule];
				if (meta.type !== type) {
					continue;
				}
				const mdColumns = [meta.fixable ? ":wrench:" : "", `[${rule}](${meta.docUrl})`, meta.description];

				mdTable += `| ${mdColumns.join(" | ")} |\n`;
				ruleCounter++;
			}

			if (ruleCounter === 0) {
				return "";
			} else {
				return mdTable;
			}
		})
		.filter(Boolean)
		.join("\n");

	let readme = await fs.readFile("./README.md", "utf8");

	// insert the rule table
	readme = readme.replace(
		/(^<!-- BEGIN RULES -->)[\s\S]*?(?=^<!-- END RULES -->)/m,
		"$1\n" + generatedMd.trim() + "\n"
	);

	// simplify the examples
	readme = readme.replace(/^Before:\s*^```js($[\s\S]+?)^```\s*^After:\s*^```js$[\s\S]+?^```/gm, (_, b) => {
		const before = String(b).trim().split(/\r?\n/g);
		const after = before.map(c => fixCode(c));

		return [
			"Before:",
			"",
			"```js",
			...before,
			"```",
			"",
			"After:",
			"",
			"```js",
			...after,
			"```",
		].join("\n");
	});

	await fs.writeFile("./README.md", readme, "utf8");
}

async function generateDocFiles() {
	const rules = await getRules();

	for (const rule in rules) {
		await generateDocFile(rules[rule]);
	}
}
/**
 * @param {RuleMeta} meta
 */
async function generateDocFile(meta) {
	let content = await fs.readFile("./" + meta.files.doc, "utf8").catch(() => "## Description\n\nTODO");
	let overview =
		[
			`# \`${meta.name}\`${meta.fixable ? " :wrench:" : ""}`,
			"",
			"> " + meta.description,
			"",
			`configuration in \`plugin:clean-regex/recommended\`: \`"${meta.recommendedConfig}"\``,
			"",
			"<!-- prettier-ignore -->",
			`[Source file](${repoTreeRoot}/${meta.files.source}) <br> [Test file](${repoTreeRoot}/${meta.files.test})`,
		].join("\n") + "\n\n";
	content = content.replace(/[\s\S]*?(?=^## Description)/m, overview);

	await fs.writeFile("./" + meta.files.doc, content, "utf8");
}

async function generateIndex() {
	const rules = Object.keys(await getRules());

	function toVar(ruleName = "") {
		return ruleName.replace(/-(\w)/g, (_, letter) => String(letter).toUpperCase());
	}

	const code = `// THIS IS GENERATED CODE
// DO NOT EDIT

import _configs from "./configs";

${rules.map(name => `import ${toVar(name)} from "./rules/${name}";`).join("\n")}

export const configs = _configs;
export const rules = {
	${rules.map(name => `"${name}": ${toVar(name)},`).join("\n\t")}
};
`;

	await fs.writeFile("./lib/index.ts", code, "utf-8");
}

async function insertRuleName() {
	const rules = await getRules();

	for (const rule of values(rules)) {
		const file = "./" + rule.files.source;
		let code = await fs.readFile(file, "utf-8");
		code = code.replace(/\bgetDocUrl\([^()]*\)/g, () => {
			return `getDocUrl(/* #GENERATED */ ${JSON.stringify(rule.name)})`;
		});
		await fs.writeFile(file, code, "utf-8");
	}
}

module.exports = {
	doc: series(readme, generateDocFiles),
	updateSourceFile: series(generateIndex, insertRuleName),
};

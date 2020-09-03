const { series } = require("gulp");
const fs = require("fs").promises;
const { rules, configs } = require("./lib");
const { repoTreeRoot } = require("./lib/util");


/**
 *
 * @param {string} rule
 * @returns {RuleMeta}
 *
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
function getRuleMeta(rule) {
	/*
	 * Looks like this:
	 *
	 * {
	 *     type: "problem",
	 *     docs: {
	 *         description: "disallow duplicate alternatives",
	 *         category: "Possible Errors",
	 *         url: getDocUrl(__filename)
	 *     },
	 *     fixable: "code",
	 *     schema: []
	 * }
	 */

	/** @type {import("eslint").Rule.RuleModule["meta"]} */
	const meta = rules[rule].meta;
	if (!meta || !meta.docs || !meta.type || !meta.docs.description || !meta.docs.url) {
		throw new Error("Incomplete meta data for rule " + rule);
	}

	return {
		name: rule,
		type: meta.type,
		description: meta.docs.description,
		docUrl: meta.docs.url,
		fixable: meta.fixable === "code",
		recommendedConfig: configs.recommended.rules["clean-regex/" + rule],
		files: {
			source: `lib/rules/${rule}.js`,
			test: `tests/lib/rules/${rule}.js`,
			doc: `docs/rules/${rule}.md`,
		}
	};
}


async function readme() {
	const ruleNames = Object.keys(rules).sort();

	const generatedMd = ["problem", "suggestion", "layout"].map(type => {
		let mdTable = [
			`### ${type === "layout" ? "Layout" : type.substr(0, 1).toUpperCase() + type.substr(1) + "s"}\n`,
			"\n",
			"| Rule | Description |\n",
			"| :--- | :--- |\n",
		].join("");

		let ruleCounter = 0;
		for (const rule of ruleNames) {
			const meta = getRuleMeta(rule);
			if (meta.type !== type) {
				continue;
			}
			const mdColumns = [];

			mdColumns[0] = `[${rule}](${meta.docUrl})${meta.fixable ? " :wrench:" : ""}`;
			mdColumns[1] = meta.description;

			mdTable += `| ${mdColumns.join(" | ")} |\n`;
			ruleCounter++;
		}

		if (ruleCounter === 0) {
			return "";
		} else {
			return mdTable;
		}
	}).filter(Boolean).join("\n");

	let readme = await fs.readFile("./README.md", "utf8");
	readme = readme.replace(/(^<!-- BEGIN RULES -->)[\s\S]*?(?=^<!-- END RULES -->)/m, "$1\n" + generatedMd.trim() + "\n");

	await fs.writeFile("./README.md", readme, "utf8");
}

async function generateDocFiles() {
	for (const rule in rules) {
		await generateDocFile(rule);
	}
}

async function generateDocFile(rule) {
	const meta = getRuleMeta(rule);

	let content = await fs.readFile("./" + meta.files.doc, "utf8").catch(() => "## Description\n\nTODO");
	let overview = [
		`# \`${rule}\`${meta.fixable ? " :wrench:" : ""}`,
		"",
		"> " + meta.description,
		"",
		`configuration in \`plugin:clean-regex/recommended\`: \`"${meta.recommendedConfig}"\``,
		"",
		"<!-- prettier-ignore -->",
		`[Source file](${repoTreeRoot}/${meta.files.source}) <br> [Test file](${repoTreeRoot}/${meta.files.test})`
	].join("\n") + "\n\n";
	content = content.replace(/[\s\S]*?(?=^## Description)/m, overview);

	await fs.writeFile("./" + meta.files.doc, content, "utf8");
}

module.exports = {
	doc: series(readme, generateDocFiles)
};

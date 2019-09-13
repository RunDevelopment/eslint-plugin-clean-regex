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
	const meta = rules[rule].meta;

	return {
		name: rule,
		description: meta.docs.description,
		docUrl: meta.docs.url,
		fixable: meta.fixable === "code",
		recommendedConfig: configs.recommended.rules["clean-regex/" + rule],
		files: {
			source: `lib/rules/${rule}.js`,
			test: `test/lib/rules/${rule}.js`,
			doc: `docs/rules/${rule}.md`,
		}
	};
}


async function readme() {
	const ruleNames = Object.keys(rules).sort();

	let mdTable = "| Rule | Fix | Rec | Description |\n" +
		"| :--- | :--: | :--: | :--- |\n";

	const recIcon = {
		"off": "",
		"warn": ":warning:",
		"error": ":heavy_exclamation_mark:"
	};

	for (const rule of ruleNames) {
		const meta = getRuleMeta(rule);
		const mdColumns = [];

		mdColumns[0] = `[${rule}](${meta.docUrl})`;
		mdColumns[1] = meta.fixable ? ":wrench:" : "";
		mdColumns[2] = recIcon[meta.recommendedConfig];
		mdColumns[3] = meta.description;

		mdTable += `| ${mdColumns.join(" | ")} |\n`;
	}

	let readme = await fs.readFile("./README.md", "utf8");
	readme = readme.replace(/(# Supported Rules\s+)(?:^\|.+$\n?)*/m, "$1" + mdTable);

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
		"# `" + rule + "`",
		"",
		meta.description,
		"",
		`Fixable: \`${meta.fixable ? "yes" : "no"}\` <br> Recommended configuration: \`"${meta.recommendedConfig}"\``,
		"",
		`[Source file](${repoTreeRoot}/${meta.files.source}) <br> [Test file](${repoTreeRoot}/${meta.files.test})`
	].join("\n") + "\n\n\n";
	content = content.replace(/[\s\S]*?(?=## Description)/, overview);

	await fs.writeFile("./" + meta.files.doc, content, "utf8");
}

module.exports = {
	doc: series(readme, generateDocFiles)
};

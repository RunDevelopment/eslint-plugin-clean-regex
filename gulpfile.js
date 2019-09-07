const fs = require("fs");
const { rules, configs } = require("./lib");


async function doc() {
	const ruleNames = Object.keys(rules).sort();

	let mdTable = "| Rule | Fixable | Recommended | Description |\n" +
		"| --- | --- | --- | --- |\n";
	for (const rule of ruleNames) {
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
		const recConfig = configs.recommended.rules["clean-regex/" + rule];
		const mdColumns = [];

		mdColumns[0] = `[${rule}](${meta.docs.url})`;
		mdColumns[1] = meta.fixable === "code" ? ":wrench:" : "";
		mdColumns[2] = recConfig === "warn" ? ":warning:" : recConfig === "error" ? ":heavy_exclamation_mark:" : "";
		mdColumns[3] = meta.docs.description;

		mdTable += `| ${mdColumns.join(" | ")} |\n`;
	}

	let readme = fs.readFileSync("./README.md", "utf-8");
	readme = readme.replace(/(# Supported Rules\s+)[\s\S]*/, "$1" + mdTable);

	fs.writeFileSync("./README.md", readme, "utf-8");
}

module.exports = {
	doc
};

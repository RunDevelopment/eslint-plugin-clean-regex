# `no-empty-alternative`

> Disallow alternatives without elements.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-empty-alternative.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-empty-alternative.ts)

## Description

While (re-)writing long regular expressions, it can happen that one forgets to
remove the `|` character of a former alternative. This rule tries to point out
these potential mistakes by reporting all empty alternatives.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/(?:)/
/a+|b*/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/a+|b+|/
/\|\||\|||\|\|\|/
/a(?:a|bc|def|h||ij|k)/
```

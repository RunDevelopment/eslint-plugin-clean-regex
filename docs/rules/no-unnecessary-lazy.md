# `no-unnecessary-lazy`

> Disallow unnecessarily lazy quantifiers.

Fixable: `yes` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-unnecessary-lazy.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-unnecessary-lazy.js)

## Description

Being lazy doesn't change constant quantifiers.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/ab+?c/
/a\w??c/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/ab{3}?c/
/b{2,2}?/
```

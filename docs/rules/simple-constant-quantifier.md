# `simple-constant-quantifier` :wrench:

> Prefer simple constant quantifiers over the range form.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/simple-constant-quantifier.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/simple-constant-quantifier.ts)

## Description

This rule enforces the usage from simple constant quantifiers (e.g. `a{2}`)
instead of their more verbose range form (e.g. `a{2,2}`).

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/a+b*c?/
/a{2,}b{2,6}c{2}/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/a{2,2}/
/a{100,100}?/
```

# `prefer-predefined-quantifiers` :wrench:

> Prefer predefined quantifiers (+\*?) instead of their more verbose form.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/prefer-predefined-quantifiers.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/prefer-predefined-quantifiers.ts)

## Description

Prefer predefined quantifiers over general quantifiers. E.g. `?` instead of
`{0,1}`, `*` instead of `{0,}`, and `+` instead of `{1,}`.

Predefined use less characters than their verbose counterparts and are therefore
easier to read.

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
/a{1,}/
/a{0,}/
/a{0,1}/
```

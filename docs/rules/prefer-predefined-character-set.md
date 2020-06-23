# `prefer-predefined-character-set`

> Prefer predefined character sets instead of their more verbose form.

Fixable: `yes` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/prefer-predefined-character-set.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/prefer-predefined-character-set.js)

## Description

This will replace the verbose character class elements version of of the `\d`
and `\w` character sets with their character set representation.

Note: This will not remove any character classes. Use the
`no-unnecessary-character-class` rule for that.

#### Examples

<!-- prettier-ignore -->
```js
/[0-9]/      -> /[\d]/
/[0-9a-z_-]/ -> /[\w-]/
```

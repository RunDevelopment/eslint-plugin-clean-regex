# `optimized-character-class` :wrench:

> Disallows unnecessary elements in character classes.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/optimized-character-class.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/optimized-character-class.ts)

## Description

This will will provide fixes to remove unnecessary characters, character ranges,
and character sets from character classes.

### Examples

<!-- prettier-ignore -->
```js
/[a-zf]/   -> /[a-z]/
/[a-z\w]/  -> /[\w]/
/[\s\r\n]/ -> /[\s]/
/[a-zH]/i  -> /[a-z]/
```

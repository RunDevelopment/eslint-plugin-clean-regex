# `optimized-character-class`

Disallows unnecessary elements in character classes.

Fixable: `yes` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/optimized-character-class.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/optimized-character-class.js)


## Description

This will will provide fixes to remove unnecessary characters, character ranges, and character sets from character classes.

### Examples

```
/[a-zf]/ -> /[a-z]/
/[a-z\w]/ -> /[\w]/
/[\s\r\n]/ -> /[\s]/
/[a-zH]/i -> /[a-z]/
```

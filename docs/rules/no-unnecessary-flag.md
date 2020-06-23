# `no-unnecessary-flag`

> Disallow unnecessary regex flags.

Fixable: `yes` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-unnecessary-flag.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-unnecessary-flag.js)

## Description

This will point out present regex flags that do not change the pattern.

The `i` flag is only necessary if the pattern contains any characters with case
variations. If no such characters are part of the pattern, the flag is
unnecessary. E.g. `/\.{3}/i`

The `m` flag changes the meaning of the `^` and `$` anchors, so if the pattern
doesn't contain these anchors, it's unnecessary. E.g. `/foo|[^\r\n]*/m`

The `s` flag makes the dot (`.`) match all characters instead of the usually
non-line-terminator characters, so if the pattern doesn't contain a dot
character set, it will be unnecessary. E.g. `/[.:]/s`

No other flags will be checked.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/a|b/i
/^foo$/m
/a.*?b/s
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/\w+/i
/a|b/m
/^foo$/s
```

# `no-octal-escape`

> Disallow octal escapes outside of character classes.

configuration in `plugin:clean-regex/recommended`: `"error"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-octal-escape.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-octal-escape.ts)

## Description

Octal escapes can easily be confused with backreferences because the same
character sequence (e.g. `\3`) can either be used to escape a character or to
reference a capturing group depending on the number of capturing groups in the
pattern.

This can be a problem when refactoring regular expressions because an octal
escape can become a backreference or wise versa.

To prevent this issue, this rule disallows all octal escapes outside of
character classes.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/\x10\0/
/(a)\1/
/[\1]/   // allowed because backreferences cannot be in character classes
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/(a)\2/ // warns about `\2`
```

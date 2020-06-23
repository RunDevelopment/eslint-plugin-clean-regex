# `no-unnecessary-assertions`

> Disallow always accepting or rejecting assertions.

Fixable: `no` <br> Recommended configuration: `"error"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-unnecessary-assertions.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-unnecessary-assertions.js)

## Description

Some assertion are unnecessary because the rest of the pattern forces them to
always be accept (or reject).

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/\bfoo\b/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/#\bfoo/    // \b will always accept
/foo\bbar/  // \b will always reject
/$foo/      // $ will always reject
/(?=\w)\d+/ // (?=\w) will always accept
```

## Limitations

Right now, this rule is implemented by only looking a single character ahead and
behind. This is enough to determine whether the builtin assertions (`\b`, `\B`,
`^`, `$`) trivially reject or accept but it is not enough for all lookarounds.
The algorithm determining the characters ahead and behind is very conservative
which can lead to false negatives.

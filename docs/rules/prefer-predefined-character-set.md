# `prefer-predefined-character-set` :wrench:

> Prefer predefined character sets instead of their more verbose form.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/prefer-predefined-character-set.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/prefer-predefined-character-set.ts)

## Description

This will replace the verbose character class elements version of of the `\d`
and `\w` character sets with their character set representation.

Note: This will not remove any character classes. Use the
`no-unnecessary-character-class` rule for that.

### `allowDigitRange: boolean`

This option determines whether a digit range (`0-9`) is allowed or whether it
should be replaced with `\d`. Note that if the digit range is the whole
character class is equivalent to `\d`, then a digit range will always be
replaced with `\d`. The value defaults to `true`.

### Examples

<!-- prettier-ignore -->
```js
/[0-9]/      // -> /[\d]/
/[0-9a-z_-]/ // -> /[\w-]/
/[0-9a-f]/   // -> /[\da-f]/ with `allowDigitRange: false`
/[0-9a-f]/   // unchanged with `allowDigitRange: true` (default)
```

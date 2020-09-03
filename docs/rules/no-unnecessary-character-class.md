# `no-unnecessary-character-class` :wrench:

> Disallow unnecessary character classes.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-unnecessary-character-class.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-unnecessary-character-class.js)

## Description

Unnecessary character classes contain only one character and can be trivially
removed. E.g. `[a]`, `[\x61]`, `[\?]`.

### `avoidEscape`

Sometimes characters have to be escaped, in order to remove the character class
(e.g. `a[+]` -> `a\+`). The automatic escaping can be disabled by using
`{ avoidEscape: true }` in the rule configuration.

Note: This option does not affect characters already escaped in the character
class (e.g. `a[\+]` -> `a\+`).

Note: `\b` means backspace (`\x08`) inside of character classes but it will
interpreted as a boundary assertion anywhere else, so it will be escaped as
`\x08`.

#### With `avoidEscape: false`

<!-- prettier-ignore -->
```js
/a[+]/ -> /a\+/
/a[.]/ -> /a\./
/[\b]/ -> /\x08/

/a[\s]/ -> /a\s/
/a[\+]/ -> /a\+/
```

#### With `avoidEscape: true`

<!-- prettier-ignore -->
```js
/a[+]/ -> /a[+]/
/a[.]/ -> /a[.]/
/[\b]/ -> /[\b]/

/a[\s]/ -> /a\s/
/a[\+]/ -> /a\+/
```

# `no-unnecessary-character-class`

Disallow unnecessary character classes.

Fixable: `yes` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-unnecessary-character-class.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-unnecessary-character-class.js)


## Description

Unnecessary character classes contain only one character and can be trivially removed.
E.g. `[a]`, `[\x61]`, `[\?]`.

### `avoidEscape`

Sometimes characters have to be escaped, in order to remove the character class (e.g. `a[+]` -> `a\+`). The automatic escaping can be disabled by using `{ avoidEscape: true }` in the rule configuration.

Note that this option does not affect characters already escaped in the character class (e.g. `a[\+]` -> `a\+`).

#### Without `avoidEscape: true`

```
/a[+]/ -> /a\+/
/a[.]/ -> /a\./

/a[\s]/ -> /a\s/
/a[\+]/ -> /a\+/
```

#### With `avoidEscape: true`

```
/a[+]/ -> /a[+]/
/a[.]/ -> /a[.]/

/a[\s]/ -> /a\s/
/a[\+]/ -> /a\+/
```

### `\b` (backspace)

`\b` means backspace (`\x08`) inside of character classes but it will interpreted as a boundary assertion anywhere else. You can use `avoidEscape` to change how `[\b]` will handled.

#### Without `avoidEscape: true`

```
/[\b]/ -> /\x08/
```

#### With `avoidEscape: true`

```
/[\b]/ -> /[\b]/
```


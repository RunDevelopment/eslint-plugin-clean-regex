# `no-constant-capturing-group`

> Disallow capturing groups that can match only one word.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-constant-capturing-group.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-constant-capturing-group.ts)

## Description

Constant capturing groups can only match one word.

Because they can only match one word, they should be replaced with the constant
string they capture for better performance. This is especially the case if the
capturing groups only matches the empty word.

E.g. `/(foo)/`, `a()b`, `a(\b)`

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/(a)/i
/(a|b)/
/(a*)/
/(a)/  // constant but it doesn't match the empty word
```

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/()/   // warn about `()`
/(\b)/ // warn about `(\b)`
```

### `ignoreNonEmpty: boolean`

If this option is get to `true`, the rule will ignore capturing groups that can
match non-empty words. This option is `true` by default.

#### `ignoreNonEmpty: false`

Examples of **valid** code for this rule with `ignoreNonEmpty: false`:

<!-- prettier-ignore -->
```js
/(a)/i
/(a|b)/
/(a*)/
```

Examples of **invalid** code for this rule with `ignoreNonEmpty: false`:

<!-- prettier-ignore -->
```js
/(a)/  // warn about `(a)`
/()/   // warn about `()`
/(\b)/ // warn about `(\b)`
```

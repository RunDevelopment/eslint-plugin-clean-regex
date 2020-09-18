# `no-unnecessary-group` :wrench:

> Disallow unnecessary non-capturing groups.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-unnecessary-group.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-unnecessary-group.ts)

## Description

Non-capturing groups which can be removed without changing the meaning of the
pattern are unnecessary. E.g. `a(?:bc)d` == `abcd` and `a(?:b)*c` == `ab*c`

Capturing groups will not be reported or removed.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/(?:a|b)c/
/(?:a{2})+/

// will not be removed because...
/(.)\1(?:2\s)/ // ...it would changed the backreference
/\x4(?:1)/     // ...it would complete the hexadecimal escape
/(?:)/         // `//` is not a valid RegExp literal
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/(?:)a/
/(?:a)/
/(?:a)+/
/a|(?:b|c)/
/foo(?:[abc]*)bar/
```

### `allowTop: true`

It's sometimes useful to wrap your whole pattern in a non-capturing group (e.g.
if the pattern is used as a building block to construct more complex patterns).
With this option you can allow top-level non-capturing groups.

Examples of **valid** code for this rule with `allowTop: true`:

<!-- prettier-ignore -->
```js
/(?:ab)/
```

Examples of **invalid** code for this rule with `allowTop: true`:

<!-- prettier-ignore -->
```js
/(?:a)b/
```

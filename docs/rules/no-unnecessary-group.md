# `no-unnecessary-group`

Disallow unnecessary non-capturing groups.

Fixable: `yes` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-unnecessary-group.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-unnecessary-group.js)


## Description

Non-capturing groups which can be removed without changing the meaning of the pattern are unnecessary.
E.g. `a(?:bc)d` == `abcd` and `a(?:b)*c` == `ab*c`

Capturing groups will not be reported or removed.

### Examples

Examples of __valid__ code for this rule:

```js
/(?:a|b)c/
/(?:a{2})+/

// will not be removed because...
/(.)\1(?:2\s)/ // ...it would changed the backreference
/\x4(?:1)/     // ...it would complete the hexadecimal escape
/(?:)/         // `//` is not a valid RegExp literal
```

Examples of __invalid__ code for this rule:

```js
/(?:)a/
/(?:a)/
/(?:a)+/
/a|(?:b|c)/
/foo(?:[abc]*)bar/
```

### `allowTop: true`

It's sometimes useful to wrap your whole pattern in a non-capturing group (e.g. if the pattern is used as a building block to construct more complex patterns).
With this option you can allow top-level non-capturing groups.


Examples of __valid__ code for this rule with `allowTop: true`:

```js
/(?:ab)/
```

Examples of __invalid__ code for this rule with `allowTop: true`:

```js
/(?:a)b/
```

# `sort-flags`

> Requires the flags of regular expressions to be sorted.

Fixable: `yes` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/sort-flags.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/sort-flags.js)

## Description

The flags of JavaScript regular expressions should be sorted alphabetically
because the flags of the `.flags` property of `RegExp` objects are always
sorted. Not sorting flags in regex literals misleads readers into thinking that
the order may have some purpose which it doesn't.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/abc/
/abc/iu
/abc/gimsuy
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/abc/mi
/abc/us
```

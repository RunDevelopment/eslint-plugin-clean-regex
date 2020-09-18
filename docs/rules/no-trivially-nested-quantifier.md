# `no-trivially-nested-quantifier` :wrench:

> Disallow nested quantifiers that can be rewritten as one quantifier.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-trivially-nested-quantifier.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-trivially-nested-quantifier.ts)

## Description

In some cases, nested quantifiers can be rewritten as one quantifier (e.g.
`(?:a{1,2}){3}` -> `a{3,6}`).

The rewritten form is simpler and cannot cause exponential backtracking (e.g.
`(?:a{1,2})+` -> `a+`).

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/(a{1,2})+/  // the rule won't touch capturing groups
/(?:a{2})+/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/(?:a{1,2})+/     // == /a+/
/(?:a{1,2}){3,4}/ // == /a{3,8}/
/(?:a{4,}){5}/    // == /a{20,}/
```

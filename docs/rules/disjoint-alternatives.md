# `disjoint-alternatives`

> Disallow different alternatives that can match the same words.

Fixable: `no` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/disjoint-alternatives.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/disjoint-alternatives.js)

## Description

This rule will point out alternatives that share at least one (non-empty) word.

Non-disjoint alternatives usually indicate some kind of problem and are usually
harder to reason about. Examples of non-disjoint alternatives include:

-   **Duplicate alternatives**

    Example: `/foo|bar|foo/`

    Any duplicates can be removed without changing the meaning of the pattern.

-   **Subset alternatives**

    Example: `/\w+|Foo/`

    Any alternative that matches a subset of a previous alternative can be
    removed without affecting the pattern.

-   **Superset alternatives**

    Example: `/(Foo|\w+)\b/`

    For any alternative that matches a superset of a previous alternative, the
    other alternative might be unnecessary. It has to be decided on a
    case-to-case basis whether the previous subset alternative can be removed.

    (In the above example, the `Foo` alternative can be removed but only because
    of the `\b`.)

However, there are valid use-cases for non-disjoint alternatives, so sometimes
it's ok to use a comment to disable this rule on certain regular expressions.
But be careful because even those valid use-cases can still potentially cause
exponential backtracking.

### Exponential backtracking

Non-disjoint alternatives inside `*` or `+` quantifiers almost always cause
exponential backtracking.

Example: `/(?:\w|\d)+-/`<br> The `\d` and `\w` alternatives are not disjoint and
because they are quantified using `+`, they will cause exponential backtracking.
This example is easy to fix because `\d` is a subset of `\w`,so removing the
`\d` alternative will fix the exponential backtracking. An example string
showing the exponential runtime of the unfixed pattern is `01234567890123456789`
(add more digits to increase the time it takes to reject the string).

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/a+|b*/
/a(?:\w+|[+-]\d+)+/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/\w+|\d+/
/[a-z]+|FOO/i
/\w+(?:\s+(?:\S+|"[^"]*"))*/
```

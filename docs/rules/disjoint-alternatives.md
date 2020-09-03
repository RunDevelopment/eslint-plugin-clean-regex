# `disjoint-alternatives`

> Disallow different alternatives that can match the same words.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/disjoint-alternatives.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/disjoint-alternatives.js)

## Description

This rule will point out alternatives that share at least one (non-empty) word.

Non-disjoint alternatives usually indicate some kind of problem and are usually
harder to reason about. Examples of non-disjoint alternatives include:

-   **Duplicate alternatives**

    Example: `/foo|bar|foo/`

    Any duplicates can be removed without changing the behavior of the pattern.

-   **Subset alternatives**

    Example: `/\w+|Foo/`

    Any alternative that matches a subset of a previous alternative can be
    removed without changing the behavior of the pattern.

-   **Superset alternatives**

    Example: `/(Foo|\w+)\b/`

    If an alternative is a superset of a previous alternative, the previous
    alternative might be unnecessary. This has to be decided on a case-by-case
    basis whether the previous subset alternative can be removed.

    (In the above example, the `Foo` alternative can be removed but only because
    of the `\b`.)

However, there are valid use-cases for non-disjoint alternatives, so sometimes
it's ok to use a comment to disable this rule on certain regular expressions.
But be careful because even those valid use-cases can still potentially cause
exponential backtracking.

### Making alternatives disjoint

This is generally a non-trivial task. If the alternative is a duplicate or
subset of previous alternatives, then the alternative won't change the behavior
of the pattern and can be removed (careful with capturing groups). However, in
all other cases, it's not so simple.

One of the main problems when trying to make alternatives disjoint is that the
order of alternatives matters. Whether alternatives can be prefixes of each
other, lookarounds, and assertions all have to be taken into account also.

#### Example 1

Let's look at the patterns `/\w+|Foo/` and `/Foo|\w+/`. While similar, they
behave differently and that difference is reflected in the warnings for the
patterns:

```
/\w+|Foo/
     ^~~
This alternative is a subset of `\w+` and can be removed.
```

The warning says that `Foo` is a subset of `\w+` which is true. It also states
that the `Foo` alternative can be removed. That is because `Foo` comes _after_
`\w+` meaning that if the input is `"Foo"` then `\w+` will already have matched
it before the `Foo` alternative and if the input can't be matched by `\w+` then
it must also be rejected by `Foo`. Therefore the `Foo` alternative is
essentially dead code.

```
/Foo|\w+/
     ^~~
This alternative is a superset of `Foo`.
```

The reason the warning is different is that `Foo` comes _before_ `\w+`. Because
the order of alternatives matters, we cannot easily remove `Foo`. I.e. for the
input string `"Foobar"` the pattern `/Foo|\w+/` will match `"Foo"` while `/\w+/`
will match the whole string.

Where the behavior of the pattern is intentional or not has to be decided by the
programmer. This rule only points out potential mistakes.

Assuming that the pattern behaves correctly, a equivalent version with disjoint
alternatives can be obtained using a lookahead like this: `/Foo|(?!Foo)\w+/`. An
equivalent pattern without lookaheads is
`/F(?:o(?:o|[\dA-Za-np-z_]\w*)?|[\dA-Za-np-z_]\w*)?|[\dA-EG-Za-z_]\w*/`.

**Note:** Because of the limitations of this rule, alternatives containing
lookaheads cannot be analyzed. This means that almost any lookahead will prevent
the warning simply because the patterns cannot be analyzed.

#### Example 2

A pattern to match number of like `123`, `.123`, `123.`, and `123.456` might
written like this: `/(?<![\d.])(?:\d*\.\d+|\d+\.\d*|\d+)(?![\d.])/`. For this
pattern, we'll get the following warning:

```
/(?<![\d.])(?:\d*\.\d+|\d+\.\d*|\d+)(?![\d.])/
                       ^~~~~~~~
This alternative is not disjoint with `\d*\.\d+`. The shared language is /\d+\.\d+/i.
```

As warning points out, all numbers of the form `/\d+\.\d+/i` (e.g. `123.456`)
can be matched by both the `\d*\.\d+` alternative and the `\d+\.\d*`
alternative.

While the alternatives aren't disjoint, it isn't necessarily a problem. The
pattern is guarded by lookarounds, so we don't have to worry about the order of
alternatives and only a prefix of the input string being matched (see example
1). Since the pattern behaves correctly, the programmer might choose to either
disable this rule of the pattern or to rewrite the pattern to make the
alternatives disjoint. The latter option should be preferred to get warnings
should the pattern change in the future.

One way to make alternatives disjoint is to make sure that the first character
of all alternatives is different.

In this example, the first character has to be either a dot (`\.`) or a digit
(`\d`). Let's focus on the dot alternative first. Since the number starts with a
dot, we know that it has to be of the `.123` type, so the full dot alternative
has to be `\.\d+`. Now the digit alternative. The `123`, `123.`, and `123.456`
types all start with many digits, so let's write it as `\d+(?:\.|\.\d+)?` which
can be simplified to `\d+(?:\.\d*)?`.

Putting it all together, the full pattern with disjoint alternatives is
`/(?<![\d.])(?:\.\d+|\d+(?:\.\d*)?)(?![\d.])/`.

### Exponential backtracking

Non-disjoint alternatives inside `*` or `+` quantifiers almost always cause
exponential backtracking.

Example: `/(?:\w|\d)+-/`<br> The `\d` and `\w` alternatives are not disjoint and
because they are quantified using `+`, they will cause exponential backtracking.
This example is easy to fix because `\d` is a subset of `\w`, so removing the
`\d` alternative will fix the exponential backtracking. An example string
showing the exponential runtime of the unfixed pattern is `01234567890123456789`
(add more digits to increase the time it takes to reject the string).

### Limitations

This rule is usually unable to analyze alternatives that contain assertions,
lookarounds, or backreferences causing false negatives.

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

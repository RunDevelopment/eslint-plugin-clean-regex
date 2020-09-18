# `prefer-predefined-assertion` :wrench:

> Prefer predefined assertions over equivalent lookarounds.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/prefer-predefined-assertion.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/prefer-predefined-assertion.ts)

## Description

All predefined assertions (`\b`, `\B`, `^`, and `$`) can be expressed as
lookaheads and lookbehinds. E.g. `/a$/` is the same as `/a(?![^])/`.

In most cases, it's better to use the predefined assertions because they are
more well known.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/a(?=\W)/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/a(?![^])/            -> /a$/
/a(?!\w)/             -> /a\b/
/a+(?!\w)(?:\s|bc+)+/ -> /a+\b(?:\s|bc+)+/
```

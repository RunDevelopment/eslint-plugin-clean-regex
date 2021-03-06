# `consistent-match-all-characters` :wrench:

> Use one character class consistently whenever all characters have to be
> matched.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/consistent-match-all-characters.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/consistent-match-all-characters.ts)

## Description

There are multiple ways to create a character class which matches all
characters. This rule can be used to enforce one consistent way to do that.

#### Example

<!-- prettier-ignore -->
```js
/[\s\S]/      -> /[\s\S]/
/[\d\D]/      -> /[\s\S]/
/[\D\w]/      -> /[\s\S]/
/[^]/         -> /[\s\S]/
/[\0-\uFFFF]/ -> /[\s\S]/
```

### `charClass: string`

By default all match-all character classes will be replaced with `[\s\S]`. To
change that you can set the `charClass` option to the replacement string.

#### `charClass: "[^]"`

<!-- prettier-ignore -->
```js
/[\s\S]/      -> /[^]/
/[\d\D]/      -> /[^]/
/[\D\w]/      -> /[^]/
/[^]/         -> /[^]/
/[\0-\uFFFF]/ -> /[^]/
```

### Replacement modes

The replacement mode will determine how this rule will replace match-all
character classes and sets.

#### `mode: "dot-if-dotAll"`

This is the default mode. It will replace all match-all character classes with
`charClass` if the `s` flag is not present. If the `s` flag is present, all
match-all character classes will be replaced with a dot.

<!-- prettier-ignore -->
```js
// (with charClass: "[^]")
/[\s\S]/  -> /[^]/
/[\s\S]/s -> /./s
/./s      -> /./s
```

#### `mode: "char-class"`

In this mode, all match-all character classes and sets will be replaced with
`charClass`.

If the `s` flag is present, it will be removed.

<!-- prettier-ignore -->
```js
// (with charClass: "[^]")
/[\s\S]/  -> /[^]/
/[\s\S]/s -> /[^]/
/./s      -> /[^]/
```

#### `mode: "dot"`

In this mode, all match-all character classes and sets will be replaced with a
dot. (The `charClass` options won't be used.)

If the `s` flag is not present, it will be added.

<!-- prettier-ignore -->
```js
/[\s\S]/  -> /./s
/[\s\S]/s -> /./s
/./s      -> /./s
```

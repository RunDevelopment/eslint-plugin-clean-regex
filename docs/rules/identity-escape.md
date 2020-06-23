# `identity-escape`

> How to handle identity escapes.

Fixable: `yes` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/identity-escape.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/identity-escape.js)

## Description

This rule allows you to configure where identity escapes are allowed,
disallowed, or even required.

Identity escapes are escape sequences where the escaped character is equal to
the escape sequence. Examples: `\(`, `\+`, `\\`, `\/`, `\m` (not in unicode
mode)

## Rules

### How to define rules

The `identity-escape` rule is completely configurable via its own ruleset. To
define a rule, add this to the `identity-escape` rule options:

```json
"clean-regex/identity-escape": ["warn", {
    "rules": [
        // rules
    ]
}]
```

Each rule is an object like this:

```json
{
    "name": "<name>",
    "escape": "allow",
    "context": "inside",
    "characters": "/"
}
```

#### `characters`

The `characters` property determines for which characters this rule applies. The
string is regex pattern that is either a single character (e.g. `"a"`), a single
character set (e.g. `"\w"`), or a single character class (e.g. `"[^a-zA-Z]"`).
This pattern will be interpreted in unicode-mode (`u` flag enabled), so
`"[\0-\u{10FFFF}]"` can be used to create a rule that applies to all characters.

#### `escape`

The `escape` property determines how the characters the rule applies to have to
be escaped. `escape` has to be set one of the following three values:

-   `"require"`: All characters the rule applies to have to be escaped.
-   `"disallow"`: All characters the rule applies to must not be escaped.
-   `"allow"`: All characters the rule applies to can be escaped or unescaped.
    (This is the "don't care"-option.)

#### `context`

The `context` property is an additional requirement that has to be met for the
rule to apply. It determines whether the rule applies to characters inside
character classes, outside or both. Possible values are:

-   `"inside"`: The rule only applies to characters inside character classes.
-   `"outside"`: The rule only applies to characters outside character classes.
-   `"all"`: The rule applies to all characters.

This property is set to `"all"` by default.

#### `name`

This optional property can be used to give a rule a name. The name of a rule
will be included in the message for characters/escapes it changes.

### Evaluation

If a character or identity escape can be turned into the other without changing
the meaning of the pattern, `identity-escape` will check all rules. The escape
option of the first rule that applies to the character or identity escape will
be enforced. Rules are checked in the order in which they are defined with
standard rules being checked last.

This means that it is possible for rules to overshadow each other. This can be
used to overwrite the standard behavior of `identity-escape`.

### Standard rules

There are a few standard rules that are always active but may be overshadowed by
custom rules. They are defined as follows:

```json
[
    {
        "name": "standard:opening-square-bracket",
        "escape": "require",
        "context": "inside",
        "characters": "\\["
    },
    {
        "name": "standard:closing-square-bracket",
        "escape": "require",
        "context": "outside",
        "characters": "\\]"
    },
    {
        "name": "standard:curly-braces",
        "escape": "require",
        "context": "outside",
        "characters": "[{}]"
    },
    {
        "name": "standard:all",
        "escape": "disallow",
        "context": "all",
        "characters": "[^]"
    }
]
```

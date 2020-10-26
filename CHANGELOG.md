# Changelog


## 0.5.0 (2020-10-26)

I ❤️ Typescript + Prettier! <br>
The whole project is now implemented in Typescript and uses Prettier for formatting.

### Added

- `no-obscure-range`: A new rule to report most likely unintended ranges in character classes due to unescaped `-`s.
- `no-empty-alternative`: A new rule to detect empty alternatives in groups and patterns that are likely a mistake.
- `prefer-predefined-assertion`: This will suggest predefined assertions (`\b\B^$`) if a lookaround behaves like one.
- `disjoint-alternatives`: A new rule to report disjoint alternatives to prevent mistakes and exponential backtracking.
- `no-trivially-nested-quantifier`: A new rule to fix trivially quantifiers.

### Changed

- `no-unnecessary-group`: New option to allow non-capturing groups that wrap the whole regex.
- `prefer-character-class`: The rule is now also active inside lookarounds, will reorder alternatives, and more aggressively merge into existing character classes.
- `no-unnecessary-lazy`: It can now analyse single-character quantifiers.
- `prefer-predefined-character-set`: It will now leave `0-9` as is.
- `optimal-concatenation-quantifier`: It can now merge characters and quantifiers.
- New rules table in README.
- Better error messages for a lot of rules.

### Fixed

- `no-empty-lookaround` didn't handle backreferences correctly.
- Many, many typos and other mistakes in the docs.


## 0.4.0 (2020-05-05)

Clean regex now uses [refa](https://github.com/RunDevelopment/refa), a library for NFA and DFA operations and converting JS RegExp to NFA.
Right now, this plugin only really uses the `CharSet` API but implementing more complex rules is now possible!

### Added

- `no-unnecessary-assertions`: A new rule to report trivially accepting/rejecting assertions.
- `simple-constant-quantifier`: A new rule to simplify constant quantifiers with use the range syntax (e.g. `a{2,2}`).
- Added changelog.

### Changed

- `optimized-character-class`: Improved reporting and fixing thanks to a new implementation based on refa's character sets.


## 0.3.0 (2020-04-05)

### Added

- `no-lazy-ends`: A new rule to report lazy quantifiers at the end of the expression tree.
- `no-unnecessary-lazy`: A new rule to report and fix unnecessary lazy modifiers.
- `no-empty-backreference`: A new rule to report backreferences that will always be replaced with the empty string.
- `no-potentially-empty-backreference`: A new rule to report backreferences that might be replaced with the empty string only sometimes.

### Fixed

- `no-empty-backreference` didn't handle lookbehinds correctly ([#17](https://github.com/RunDevelopment/eslint-plugin-clean-regex/issues/17))

### Removed

- `no-early-backreference`: Use `no-empty-backreference` instead.


## 0.2.2 (2020-04-01)

### Fixed

- Fixed examples in `README.md`.


## 0.2.1 (2020-04-01)

### Fixed

- Fixed examples in `README.md`.


## 0.2.0 (2020-04-01)

### Changed

- `no-constant-capturing-group` will now ignore non-empty constant capturing groups by default.
- Added more documentation to almost every rule. All rules are now documented.
- `README.md` now includes a small "Highlights" section.


## 0.1.0 (2020-03-22)

Initial release

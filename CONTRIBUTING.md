# Contributing

Thank you so much for contributing!

You can contribute to the project in a number of ways:

-   Open bug reports.

    This might be a rule over-reporting, under-reporting, crashing, or providing
    incorrect fixes, suggestions, or messages.

-   Suggest new rules and rule options.

    If you have a good idea for a new rule, by all means, please share! This
    might be anything from stylistic suggestions to reporting potential bugs in
    regular expressions.

    You can also suggest new options to further customize existing rules.

-   Open pull requests.

    This might be anything from fixing typos to implementing new rules.

    Before you make a PR for a new rule, consider opening an issue first and say
    that you consider to or are already implementing it. Maybe there's someone
    already working on something similar or the project owner might be able to
    give some advice.

# Naming conventions

The names of rules and rule options are part of the API of the ESLint plugin and
have to be stable. Once the name of a rule has been chosen, it can't be (easily)
changed anymore. Choose names carefully.

## Rules

-   Use lower snake-case (e.g. `identity-escape`).
-   Use singular (e.g. `no-unnecessary-flag`).
-   Only use plural if the rule is explicitly about the relationship of at least
    two parts of the pattern (e.g. `disjoint-alternatives`).
-   Don't use abbreviations or contractions (e.g. "don't").
-   Keep it short (< 5 words).

## Rule options

-   Use lower camel case (e.g. `noTop`).
-   Don't use abbreviations or contractions (e.g. "don't").
-   Keep it short (< 5 words).

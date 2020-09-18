// THIS IS GENERATED CODE
// DO NOT EDIT

import _configs from "./configs";

import confusingQuantifier from "./rules/confusing-quantifier";
import consistentMatchAllCharacters from "./rules/consistent-match-all-characters";
import disjointAlternatives from "./rules/disjoint-alternatives";
import identityEscape from "./rules/identity-escape";
import noConstantCapturingGroup from "./rules/no-constant-capturing-group";
import noEmptyAlternative from "./rules/no-empty-alternative";
import noEmptyBackreference from "./rules/no-empty-backreference";
import noEmptyLookaround from "./rules/no-empty-lookaround";
import noLazyEnds from "./rules/no-lazy-ends";
import noObscureRange from "./rules/no-obscure-range";
import noOctalEscape from "./rules/no-octal-escape";
import noOptionalAssertion from "./rules/no-optional-assertion";
import noPotentiallyEmptyBackreference from "./rules/no-potentially-empty-backreference";
import noTriviallyNestedLookaround from "./rules/no-trivially-nested-lookaround";
import noTriviallyNestedQuantifier from "./rules/no-trivially-nested-quantifier";
import noUnnecessaryAssertions from "./rules/no-unnecessary-assertions";
import noUnnecessaryCharacterClass from "./rules/no-unnecessary-character-class";
import noUnnecessaryFlag from "./rules/no-unnecessary-flag";
import noUnnecessaryGroup from "./rules/no-unnecessary-group";
import noUnnecessaryLazy from "./rules/no-unnecessary-lazy";
import noUnnecessaryQuantifier from "./rules/no-unnecessary-quantifier";
import noZeroQuantifier from "./rules/no-zero-quantifier";
import optimalConcatenationQuantifier from "./rules/optimal-concatenation-quantifier";
import optimalLookaroundQuantifier from "./rules/optimal-lookaround-quantifier";
import optimizedCharacterClass from "./rules/optimized-character-class";
import preferCharacterClass from "./rules/prefer-character-class";
import preferPredefinedAssertion from "./rules/prefer-predefined-assertion";
import preferPredefinedCharacterSet from "./rules/prefer-predefined-character-set";
import preferPredefinedQuantifiers from "./rules/prefer-predefined-quantifiers";
import simpleConstantQuantifier from "./rules/simple-constant-quantifier";
import sortFlags from "./rules/sort-flags";

export const configs = _configs;
export const rules = {
	"confusing-quantifier": confusingQuantifier,
	"consistent-match-all-characters": consistentMatchAllCharacters,
	"disjoint-alternatives": disjointAlternatives,
	"identity-escape": identityEscape,
	"no-constant-capturing-group": noConstantCapturingGroup,
	"no-empty-alternative": noEmptyAlternative,
	"no-empty-backreference": noEmptyBackreference,
	"no-empty-lookaround": noEmptyLookaround,
	"no-lazy-ends": noLazyEnds,
	"no-obscure-range": noObscureRange,
	"no-octal-escape": noOctalEscape,
	"no-optional-assertion": noOptionalAssertion,
	"no-potentially-empty-backreference": noPotentiallyEmptyBackreference,
	"no-trivially-nested-lookaround": noTriviallyNestedLookaround,
	"no-trivially-nested-quantifier": noTriviallyNestedQuantifier,
	"no-unnecessary-assertions": noUnnecessaryAssertions,
	"no-unnecessary-character-class": noUnnecessaryCharacterClass,
	"no-unnecessary-flag": noUnnecessaryFlag,
	"no-unnecessary-group": noUnnecessaryGroup,
	"no-unnecessary-lazy": noUnnecessaryLazy,
	"no-unnecessary-quantifier": noUnnecessaryQuantifier,
	"no-zero-quantifier": noZeroQuantifier,
	"optimal-concatenation-quantifier": optimalConcatenationQuantifier,
	"optimal-lookaround-quantifier": optimalLookaroundQuantifier,
	"optimized-character-class": optimizedCharacterClass,
	"prefer-character-class": preferCharacterClass,
	"prefer-predefined-assertion": preferPredefinedAssertion,
	"prefer-predefined-character-set": preferPredefinedCharacterSet,
	"prefer-predefined-quantifiers": preferPredefinedQuantifiers,
	"simple-constant-quantifier": simpleConstantQuantifier,
	"sort-flags": sortFlags,
};

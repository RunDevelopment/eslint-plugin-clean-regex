import { CharSet } from "refa";
import { AST } from "regexpp";
import { Character, CharacterClass, CharacterClassElement, CharacterSet } from "regexpp/ast";
import * as RAA from "regexp-ast-analysis";

type Flags = Partial<Readonly<AST.Flags>>;

export function toCharSet(
	elements: (CharacterClassElement | CharacterSet)[] | CharacterClass | CharacterSet | Character,
	flags: Flags
): CharSet {
	return RAA.toCharSet(elements, flags);
}

export function emptyCharSet(flags: Flags): CharSet {
	return RAA.Predefined.empty(flags);
}
export function wordCharSet(flags: Flags): CharSet {
	return RAA.Predefined.word(flags);
}
export function isMatchAll(char: CharacterClass | CharacterSet, flags: Flags): boolean {
	return RAA.matchesAllCharacters(char, flags);
}

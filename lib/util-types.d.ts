import {
	Node,
	Alternative,
	Character,
	Element,
	CharacterClass,
	CharacterClassRange,
	CharacterClassElement,
	RegExpLiteral,
	Flags,
	Pattern,
	Group,
	CapturingGroup,
	LookaroundAssertion,
	Quantifier,
	UnicodePropertyCharacterSet,
	AnyCharacterSet,
	EscapeCharacterSet,
} from "regexpp/ast";
import type { CharSet } from "refa";

export declare type Descendants<T> = T | (T extends Node ? RealDescendants<T> : never);

type RealDescendants<T extends Node> = T extends
	| Alternative
	| CapturingGroup
	| Group
	| LookaroundAssertion
	| Quantifier
	| Pattern
	? Element | CharacterClassElement
	: never | T extends CharacterClass
	? CharacterClassElement
	: never | T extends CharacterClassRange
	? Character
	: never | T extends RegExpLiteral
	? Flags | Pattern | Element | CharacterClassElement
	: never;

type SimpleImpl<T> = Omit<T, "parent" | "start" | "end">;

export type Simple<T extends CharacterClassElement> = T extends Character
	? SimpleImpl<Character>
	: never | T extends UnicodePropertyCharacterSet
	? SimpleImpl<UnicodePropertyCharacterSet>
	: never | T extends AnyCharacterSet
	? SimpleImpl<AnyCharacterSet>
	: never | T extends EscapeCharacterSet
	? SimpleImpl<EscapeCharacterSet>
	: never | T extends CharacterClassRange
	? {
			type: "CharacterClassRange";
			min: Simple<Character>;
			max: Simple<Character>;
			raw: string;
	  }
	: never;

export interface FirstChar {
	/**
	 * A super set of the first character.
	 *
	 * We can usually only guarantee a super set because lookaround in the pattern may narrow down the actual character
	 * set.
	 */
	char: CharSet;
	/**
	 * If `false`, then the first character also includes the empty word.
	 */
	nonEmpty: boolean;
	/**
	 * If `true`, then `char` is guaranteed to be exactly the first character and not just a super set of it.
	 */
	exact: boolean;
}

import { Node, Alternative, Character, Element, CharacterClass, CharacterClassRange, CharacterClassElement, RegExpLiteral, Flags, Pattern, Group, CapturingGroup, LookaroundAssertion, Quantifier, UnicodePropertyCharacterSet, EscapeCharacterSet } from "regexpp/ast";

export declare type Descendants<T> = T | (T extends Node ? RealDescendants<T> : never);

type RealDescendants<T extends Node> =
	T extends (Alternative | CapturingGroup | Group | LookaroundAssertion | Quantifier | Pattern) ? Element | CharacterClassElement : never |

	T extends CharacterClass ? CharacterClassElement : never |
	T extends CharacterClassRange ? Character : never |

	T extends RegExpLiteral ? Flags | Pattern | Element | CharacterClassElement : never;

type SimpleImpl<T> = Omit<T, "parent" | "start" | "end">;

export type Simple<T extends CharacterClassElement> =
	T extends Character ? SimpleImpl<Character> : never |
	T extends UnicodePropertyCharacterSet ? SimpleImpl<UnicodePropertyCharacterSet> : never |
	T extends EscapeCharacterSet ? SimpleImpl<EscapeCharacterSet> : never |
	T extends CharacterClassRange ? {
		type: "CharacterClassRange";
		min: Simple<Character>;
		max: Simple<Character>;
		raw: string
	} : never;


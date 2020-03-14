import { Node, Alternative, Character, Element, CharacterClass, CharacterClassRange, CharacterClassElement, RegExpLiteral, Flags, Pattern, Group, CapturingGroup, LookaroundAssertion, Quantifier, BranchNode } from "regexpp/ast";

export declare type Descendants<T> = T | (T extends Node ? RealDescendants<T> : never);

type RealDescendants<T extends Node> =
	T extends (Alternative | CapturingGroup | Group | LookaroundAssertion | Quantifier | Pattern) ? Element | CharacterClassElement : never |

	T extends CharacterClass ? CharacterClassElement : never |
	T extends CharacterClassRange ? Character : never |

	T extends RegExpLiteral ? Flags | Pattern | Element | CharacterClassElement : never;

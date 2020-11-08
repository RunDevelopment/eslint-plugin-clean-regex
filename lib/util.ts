import {
	Character,
	CharacterClassElement,
	EscapeCharacterSet,
	UnicodePropertyCharacterSet,
	CharacterClassRange,
	AnyCharacterSet,
} from "regexpp/ast";

/**
 * Throws an error when invoked.
 */
export function assertNever(value: never): never {
	throw new Error(`This part of the code should never be reached but ${value} made it through.`);
}

export function findIndex<T>(arr: readonly T[], condFn: (item: T, index: number) => boolean): number {
	return arr.findIndex(condFn);
}
export function findLastIndex<T>(arr: readonly T[], condFn: (item: T, index: number) => boolean): number {
	for (let i = arr.length - 1; i >= 0; i--) {
		if (condFn(arr[i], i)) {
			return i;
		}
	}
	return -1;
}

type SimpleImpl<T> = Omit<T, "parent" | "start" | "end">;
export type Simple<T extends CharacterClassElement | AnyCharacterSet> = T extends Character
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

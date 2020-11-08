import { CharSet, DFA, NFA, ReadonlyNFA } from "refa";

/**
 * Returns whether the languages of the given NFA are equal.
 *
 * This assumes that both NFA do not have unreachable or trap states.
 */
export function nfaEquals(a: ReadonlyNFA, b: ReadonlyNFA): boolean {
	if (a.isEmpty || b.isEmpty) {
		return a.isEmpty === b.isEmpty;
	}
	if (a.options.maxCharacter !== b.options.maxCharacter) {
		return false;
	}

	const { maxCharacter } = a.options;
	const x = a.nodes;
	const y = b.nodes;

	if (x.finals.has(x.initial) !== y.finals.has(y.initial)) {
		// one accepts the empty word, the other one doesn't
		return false;
	}

	function unionAll(iter: Iterable<CharSet>): CharSet {
		let total: CharSet | undefined = undefined;

		for (const item of iter) {
			if (total === undefined) {
				total = item;
			} else {
				total = total.union(item);
			}
		}

		return total || CharSet.empty(maxCharacter);
	}

	if (!unionAll(x.initial.out.values()).equals(unionAll(y.initial.out.values()))) {
		// first characters of the accepted languages are different
		return false;
	}

	const aDfa = DFA.fromFA(a);
	aDfa.minimize();
	const bDfa = DFA.fromFA(b);
	bDfa.minimize();

	return aDfa.structurallyEqual(bDfa);
}
export function nfaIsSupersetOf(superset: ReadonlyNFA, subset: ReadonlyNFA): boolean {
	const union = superset.copy();
	union.union(subset);
	return nfaEquals(union, superset);
}
export function nfaIsSubsetOf(subset: ReadonlyNFA, superset: ReadonlyNFA): boolean {
	return nfaIsSupersetOf(superset, subset);
}
export function nfaUnionAll(nfas: Iterable<ReadonlyNFA>, options: Readonly<NFA.Options>): NFA {
	const total = NFA.empty(options);
	for (const nfa of nfas) {
		total.union(nfa);
	}
	return total;
}

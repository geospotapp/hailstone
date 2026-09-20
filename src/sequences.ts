import { MAX_START, MAX_STEPS } from './hailstone'

const SAFE = Number.MAX_SAFE_INTEGER

export type SequenceKind = 'seed' | 'count'

export type SequenceRun = {
  values: number[]
  truncated: boolean
  halt: string
  rules: string[]
}

export type SequenceDef = {
  id: string
  name: string
  group: 'Halting maps' | 'Open-ended'
  kind: SequenceKind
  blurb: string
  inputLabel: string
  defaultInput: number
  examples: number[]
  caption: string
  generate: (n: number) => SequenceRun
}

function reverseDigits(n: number): number {
  return Number(String(n).split('').reverse().join(''))
}

function isPalindrome(n: number): boolean {
  const s = String(n)
  return s === [...s].reverse().join('')
}

function digitSquareSum(n: number): number {
  let s = 0
  let x = n
  while (x > 0) {
    const d = x % 10
    s += d * d
    x = Math.floor(x / 10)
  }
  return s
}

function properDivisorSum(n: number): number {
  if (n <= 1) return 0
  let sum = 1
  const limit = Math.sqrt(n)
  for (let i = 2; i <= limit; i++) {
    if (n % i === 0) {
      sum += i
      const q = n / i
      if (q !== i && q !== n) sum += q
    }
  }
  return sum
}

function kaprekarNext(n: number): number {
  const raw = String(n)
  const width = Math.max(raw.length, 2)
  const digits = raw.padStart(width, '0').split('')
  const hi = Number([...digits].sort().reverse().join(''))
  const lo = Number([...digits].sort().join(''))
  return hi - lo
}

function lookAndSay(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; ) {
    let j = i
    while (j < s.length && s[j] === s[i]) j += 1
    out += String(j - i) + s[i]
    i = j
  }
  return out
}

function firstPrimes(count: number): number[] {
  const n = Math.max(1, count)
  let limit = Math.max(20, Math.ceil(n * (Math.log(n) + 3) * 1.4))
  for (;;) {
    const sieve = new Uint8Array(limit + 1)
    const primes: number[] = []
    for (let i = 2; i <= limit; i++) {
      if (sieve[i]) continue
      primes.push(i)
      if (primes.length >= n) return primes
      for (let j = i * i; j <= limit; j += i) sieve[j] = 1
    }
    limit *= 2
  }
}

function iterateMap(
  start: number,
  nextOf: (n: number) => { next: number; rule: string },
  done: (n: number, seen: Set<number>) => string | null,
  startRule: string,
): SequenceRun {
  const values = [start]
  const rules = [startRule]
  const seen = new Set([start])
  while (values.length < MAX_STEPS) {
    const halt = done(values[values.length - 1], seen)
    if (halt) return { values, truncated: false, halt, rules }
    const { next, rule } = nextOf(values[values.length - 1])
    if (next > SAFE) {
      return { values, truncated: true, halt: 'overflow', rules }
    }
    if (seen.has(next)) {
      values.push(next)
      rules.push(rule)
      return {
        values,
        truncated: false,
        halt: next === values[0] && values.length === 2 ? 'fixed point' : 'cycle',
        rules,
      }
    }
    values.push(next)
    rules.push(rule)
    seen.add(next)
  }
  return { values, truncated: true, halt: `stopped at ${MAX_STEPS} steps`, rules }
}

function linear(
  count: number,
  first: number[],
  term: (prev: number[], i: number) => { next: number; rule: string },
  halt: string,
): SequenceRun {
  const n = Math.max(1, count)
  const values = first.slice(0, n)
  const rules: string[] = values.map((_, i) => (i === 0 ? 'start' : 'seed'))
  for (let i = values.length; i < n; i++) {
    const { next, rule } = term(values, i)
    if (next > SAFE) {
      return { values, truncated: true, halt: 'overflow', rules }
    }
    values.push(next)
    rules.push(rule)
  }
  return { values, truncated: false, halt, rules }
}

export const SEQUENCES: SequenceDef[] = [
  {
    id: 'collatz',
    name: 'Collatz 3n+1',
    group: 'Halting maps',
    kind: 'seed',
    blurb: 'Even → n/2, odd → 3n+1. Conjectured to reach 1 from every positive integer.',
    inputLabel: 'Start n',
    defaultInput: 601,
    examples: [6, 27, 601, 703],
    caption: 'even → n/2, odd → 3n+1 · stops at 1',
    generate: (start) =>
      iterateMap(
        start,
        (n) =>
          n % 2 === 0
            ? { next: n / 2, rule: 'even → n/2' }
            : { next: 3 * n + 1, rule: 'odd → 3n+1' },
        (n) => (n === 1 ? 'reached 1' : null),
        'start',
      ),
  },
  {
    id: 'juggler',
    name: 'Juggler',
    group: 'Halting maps',
    kind: 'seed',
    blurb: 'Even → floor(√n), odd → floor(n^1.5). Also conjectured to fall to 1.',
    inputLabel: 'Start n',
    defaultInput: 37,
    examples: [9, 37, 77, 113],
    caption: 'even → ⌊√n⌋, odd → ⌊n^3/2⌋ · stops at 1',
    generate: (start) =>
      iterateMap(
        start,
        (n) =>
          n % 2 === 0
            ? { next: Math.floor(Math.sqrt(n)), rule: 'even → ⌊√n⌋' }
            : {
                next: Math.floor(Math.pow(n, 1.5)),
                rule: 'odd → ⌊n^3/2⌋',
              },
        (n) => (n === 1 ? 'reached 1' : null),
        'start',
      ),
  },
  {
    id: 'happy',
    name: 'Happy numbers',
    group: 'Halting maps',
    kind: 'seed',
    blurb: 'Replace n by the sum of the squares of its digits. Happy numbers reach 1; others fall into the 4-cycle.',
    inputLabel: 'Start n',
    defaultInput: 7,
    examples: [7, 19, 44, 139],
    caption: 'n → sum of squares of digits · 1 or a cycle',
    generate: (start) =>
      iterateMap(
        start,
        (n) => ({ next: digitSquareSum(n), rule: 'digit² sum' }),
        (n) => (n === 1 ? 'reached 1 (happy)' : null),
        'start',
      ),
  },
  {
    id: 'aliquot',
    name: 'Aliquot',
    group: 'Halting maps',
    kind: 'seed',
    blurb: 'n → sum of proper divisors. Many chains reach 0; some loop (perfect, amicable, sociable). A few are still open.',
    inputLabel: 'Start n',
    defaultInput: 95,
    examples: [6, 25, 95, 220],
    caption: 'n → σ(n) − n · 0, a cycle, or still open',
    generate: (start) =>
      iterateMap(
        start,
        (n) => ({ next: properDivisorSum(n), rule: 'proper divisor sum' }),
        (n) => (n === 0 ? 'reached 0' : null),
        'start',
      ),
  },
  {
    id: 'kaprekar',
    name: 'Kaprekar',
    group: 'Halting maps',
    kind: 'seed',
    blurb: 'Largest digit arrangement minus the smallest. Four-digit seeds reach 6174; three-digit seeds reach 495.',
    inputLabel: 'Start n',
    defaultInput: 314,
    examples: [123, 314, 2016, 6174],
    caption: 'max digits − min digits · 6174, 495, or 0',
    generate: (start) =>
      iterateMap(
        start,
        (n) => ({ next: kaprekarNext(n), rule: 'max − min digits' }),
        (n) =>
          n === 6174 ? 'Kaprekar 6174' : n === 495 ? 'Kaprekar 495' : n === 0 ? 'reached 0' : null,
        'start',
      ),
  },
  {
    id: 'lychrel',
    name: 'Reverse-and-add',
    group: 'Halting maps',
    kind: 'seed',
    blurb: 'Add n to its digit reverse until a palindrome. Most halt; 196 is the famous unsolved Lychrel candidate.',
    inputLabel: 'Start n',
    defaultInput: 89,
    examples: [89, 196, 295, 879],
    caption: 'n → n + reverse(n) · palindrome, or unknown (196)',
    generate: (start) => {
      const values = [start]
      const rules: string[] = ['start']
      if (isPalindrome(start)) {
        return { values, truncated: false, halt: 'already a palindrome', rules }
      }
      while (values.length < MAX_STEPS) {
        const n = values[values.length - 1]
        const next = n + reverseDigits(n)
        if (next > SAFE) return { values, truncated: true, halt: 'overflow', rules }
        values.push(next)
        rules.push('n + reverse(n)')
        if (isPalindrome(next)) {
          return { values, truncated: false, halt: 'palindrome', rules }
        }
      }
      return { values, truncated: true, halt: `no palindrome in ${MAX_STEPS} steps`, rules }
    },
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci',
    group: 'Open-ended',
    kind: 'count',
    blurb: '1, 1, 2, 3, 5, … Each term is the sum of the previous two. Grows without bound; we stop after N terms.',
    inputLabel: 'Terms',
    defaultInput: 40,
    examples: [15, 25, 40, 70],
    caption: 'F_n = F_{n−1} + F_{n−2} · first N terms',
    generate: (count) =>
      linear(count, [1, 1], (prev) => ({
        next: prev[prev.length - 1] + prev[prev.length - 2],
        rule: 'sum of previous two',
      }), `${Math.max(1, count)} terms`),
  },
  {
    id: 'lucas',
    name: 'Lucas',
    group: 'Open-ended',
    kind: 'count',
    blurb: '2, 1, 3, 4, 7, … Same recurrence as Fibonacci, different seeds.',
    inputLabel: 'Terms',
    defaultInput: 40,
    examples: [15, 25, 40, 70],
    caption: 'L_n = L_{n−1} + L_{n−2} with 2, 1 · first N terms',
    generate: (count) =>
      linear(count, [2, 1], (prev) => ({
        next: prev[prev.length - 1] + prev[prev.length - 2],
        rule: 'sum of previous two',
      }), `${Math.max(1, count)} terms`),
  },
  {
    id: 'pell',
    name: 'Pell',
    group: 'Open-ended',
    kind: 'count',
    blurb: '1, 2, 5, 12, 29, … P_n = 2 P_{n−1} + P_{n−2}. Related to √2 approximations.',
    inputLabel: 'Terms',
    defaultInput: 25,
    examples: [10, 18, 25, 40],
    caption: 'P_n = 2P_{n−1} + P_{n−2} · first N terms',
    generate: (count) =>
      linear(count, [1, 2], (prev) => ({
        next: 2 * prev[prev.length - 1] + prev[prev.length - 2],
        rule: '2·prev + prev2',
      }), `${Math.max(1, count)} terms`),
  },
  {
    id: 'padovan',
    name: 'Padovan',
    group: 'Open-ended',
    kind: 'count',
    blurb: '1, 1, 1, 2, 2, 3, 4, 5, 7, … P_n = P_{n−2} + P_{n−3}. The plastic-number cousin of Fibonacci.',
    inputLabel: 'Terms',
    defaultInput: 40,
    examples: [20, 30, 40, 60],
    caption: 'P_n = P_{n−2} + P_{n−3} · first N terms',
    generate: (count) =>
      linear(count, [1, 1, 1], (prev) => ({
        next: prev[prev.length - 2] + prev[prev.length - 3],
        rule: 'P_{n−2}+P_{n−3}',
      }), `${Math.max(1, count)} terms`),
  },
  {
    id: 'recaman',
    name: 'Recamán',
    group: 'Open-ended',
    kind: 'count',
    blurb: 'a_0 = 0. Then subtract n if that landing is positive and new, otherwise add n. Famous for its irregular jumps.',
    inputLabel: 'Terms',
    defaultInput: 70,
    examples: [20, 40, 70, 120],
    caption: 'a_n = a_{n−1}−n if new and > 0, else a_{n−1}+n',
    generate: (count) => {
      const n = Math.max(1, count)
      const values = [0]
      const rules: string[] = ['start']
      const used = new Set([0])
      for (let i = 1; i < n; i++) {
        const prev = values[i - 1]
        const back = prev - i
        const next = back > 0 && !used.has(back) ? back : prev + i
        if (next > SAFE) {
          return { values, truncated: true, halt: 'overflow', rules }
        }
        values.push(next)
        rules.push(back > 0 && !used.has(back) ? '−n (new)' : '+n')
        used.add(next)
      }
      return { values, truncated: false, halt: `${n} terms`, rules }
    },
  },
  {
    id: 'hofstadter-q',
    name: 'Hofstadter Q',
    group: 'Open-ended',
    kind: 'count',
    blurb: 'Q(1)=Q(2)=1, Q(n)=Q(n−Q(n−1))+Q(n−Q(n−2)). Chaotic “meta-Fibonacci.”',
    inputLabel: 'Terms',
    defaultInput: 60,
    examples: [20, 40, 60, 100],
    caption: 'Q(n)=Q(n−Q(n−1))+Q(n−Q(n−2)) · first N terms',
    generate: (count) => {
      const n = Math.max(1, count)
      const values = [1, 1].slice(0, n)
      const rules: string[] = values.map((_, i) => (i === 0 ? 'start' : 'seed'))
      for (let i = values.length; i < n; i++) {
        const a = values[i - 1]
        const b = values[i - 2]
        const ia = i - a
        const ib = i - b
        if (ia < 0 || ib < 0 || ia >= values.length || ib >= values.length) {
          return { values, truncated: true, halt: 'undefined term', rules }
        }
        const next = values[ia] + values[ib]
        if (next > SAFE) return { values, truncated: true, halt: 'overflow', rules }
        values.push(next)
        rules.push('Q(n−Q(n−1))+Q(n−Q(n−2))')
      }
      return { values, truncated: false, halt: `${n} terms`, rules }
    },
  },
  {
    id: 'primes',
    name: 'Primes',
    group: 'Open-ended',
    kind: 'count',
    blurb: 'The sequence of prime numbers. Does not converge; we plot the first N primes.',
    inputLabel: 'Terms',
    defaultInput: 50,
    examples: [15, 30, 50, 100],
    caption: '2, 3, 5, 7, … · first N primes',
    generate: (count) => {
      const values = firstPrimes(Math.max(1, count))
      const rules: string[] = values.map((_, i) => (i === 0 ? 'start' : 'next prime'))
      return { values, truncated: false, halt: `${values.length} primes`, rules }
    },
  },
  {
    id: 'triangular',
    name: 'Triangular',
    group: 'Open-ended',
    kind: 'count',
    blurb: '1, 3, 6, 10, 15, … T_k = k(k+1)/2. Partial sums of 1, 2, 3, …',
    inputLabel: 'Terms',
    defaultInput: 40,
    examples: [12, 24, 40, 80],
    caption: 'T_k = k(k+1)/2 · first N terms',
    generate: (count) => {
      const n = Math.max(1, count)
      const values: number[] = []
      const rules: string[] = []
      for (let k = 1; k <= n; k++) {
        const next = (k * (k + 1)) / 2
        if (next > SAFE) {
          return { values, truncated: true, halt: 'overflow', rules }
        }
        values.push(next)
        rules.push(k === 1 ? 'start' : 'k(k+1)/2')
      }
      return { values, truncated: false, halt: `${n} terms`, rules }
    },
  },
  {
    id: 'look-and-say',
    name: 'Look-and-say',
    group: 'Open-ended',
    kind: 'count',
    blurb: 'Conway’s constant: 1 → 11 → 21 → 1211 → 111221 → … Read off runs of digits. Grows exponentially.',
    inputLabel: 'Terms',
    defaultInput: 12,
    examples: [8, 10, 12, 15],
    caption: 'read off consecutive digit runs · first N terms',
    generate: (count) => {
      const n = Math.max(1, count)
      const values = [1]
      const rules: string[] = ['start']
      let token = '1'
      for (let i = 1; i < n; i++) {
        token = lookAndSay(token)
        const next = Number(token)
        if (!Number.isSafeInteger(next)) {
          return { values, truncated: true, halt: 'overflow', rules }
        }
        values.push(next)
        rules.push('look-and-say')
      }
      return { values, truncated: false, halt: `${values.length} terms`, rules }
    },
  },
]

export const SEQUENCE_BY_ID = Object.fromEntries(SEQUENCES.map((s) => [s.id, s]))

export function sequenceById(id: string): SequenceDef {
  return SEQUENCE_BY_ID[id] ?? SEQUENCES[0]
}

export function parseInput(raw: string, def: SequenceDef): number {
  const n = Number.parseInt(raw.replace(/[,_\s]/g, ''), 10)
  if (!Number.isFinite(n) || n < 1) return def.defaultInput
  if (def.kind === 'count') return Math.min(Math.floor(n), 400)
  return Math.min(Math.floor(n), MAX_START)
}

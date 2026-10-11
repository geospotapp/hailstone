import { MAX_START, MAX_STEPS } from './hailstone'

const SAFE = Number.MAX_SAFE_INTEGER

export type SequenceKind = 'seed' | 'count'

export type SequenceRun = {
  values: number[]
  labels?: string[]
  log10?: number[]
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
  history: string
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

const MAX_LOOK_DIGITS = 20_000

function log10Token(token: string): number {
  const headLen = Math.min(15, token.length)
  const head = Number(token.slice(0, headLen))
  if (head <= 0) return 0
  return token.length - headLen + Math.log10(head)
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

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const t = x % y
    x = y
    y = t
  }
  return x
}

function leastPrimeFactor(n: number): number {
  if (n % 2 === 0) return 2
  if (n % 3 === 0) return 3
  const limit = Math.sqrt(n)
  for (let i = 5; i <= limit; i += 6) {
    if (n % i === 0) return i
    if ((i + 2) <= limit && n % (i + 2) === 0) return i + 2
  }
  return n
}

function subprimeReduce(sum: number): number {
  if (sum < 4) return sum
  const p = leastPrimeFactor(sum)
  return p < sum ? sum / p : sum
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
    blurb:
      'If n is even, replace it with n/2. If n is odd, replace it with 3n+1. Repeat. Every start that has been tried reaches the cycle 4 → 2 → 1, and the conjecture says they all do.',
    history:
      'Lothar Collatz posed the problem in 1937, while he was a student. The paths rise and fall, which is why they are called hailstone sequences. It is still unproved.',
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
    id: 'collatz-5n1',
    name: '5n+1',
    group: 'Halting maps',
    kind: 'seed',
    blurb:
      'If n is even, replace it with n/2. If n is odd, replace it with 5n+1. Some seeds fall into a cycle, including the loop through 1. Others keep growing until the step cap.',
    history:
      'This is the Collatz map with 5 in place of 3. The change matters: reaching a cycle is no longer expected for every start, and some small seeds climb for a long time.',
    inputLabel: 'Start n',
    defaultInput: 7,
    examples: [1, 7, 13, 27],
    caption: 'even → n/2, odd → 5n+1 · cycle, or the step cap',
    generate: (start) =>
      iterateMap(
        start,
        (n) =>
          n % 2 === 0
            ? { next: n / 2, rule: 'even → n/2' }
            : { next: 5 * n + 1, rule: 'odd → 5n+1' },
        () => null,
        'start',
      ),
  },
  {
    id: 'juggler',
    name: 'Juggler',
    group: 'Halting maps',
    kind: 'seed',
    blurb:
      'If n is even, replace it with the floor of √n, which drops. If n is odd, replace it with the floor of n^(3/2), which usually jumps up. The conjecture is that every start reaches 1.',
    history:
      'Clifford Pickover introduced these sequences in the early 1990s. The name comes from the way an odd step tosses the value up and the following even steps bring it back down.',
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
    blurb:
      'Replace n by the sum of the squares of its digits, and repeat. Reaching 1 means the start is happy. Otherwise the path falls into the cycle 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4.',
    history:
      'The puzzle came out of school arithmetic and was passed on by Reg Allenby. Only the digits matter, so a huge start shrinks to a small value in a few steps.',
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
    blurb:
      'Replace n by the sum of its proper divisors, every divisor except n itself. Perfect numbers stay fixed (6 → 6). Amicable numbers swap (220 → 284 → 220). Many chains hit a prime and then 0.',
    history:
      'Catalan conjectured in 1888 that every aliquot sequence ends. The pair 220 and 284 was already known in antiquity. Some starts, including 276, are still unresolved.',
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
    blurb:
      'Sort the digits high to low, sort them low to high, and subtract. Four-digit seeds reach 6174 and stay there (7641 − 1467 = 6174). Three-digit seeds reach 495. A number made of one repeated digit goes to 0. Other lengths often enter a short cycle.',
    history:
      'D. R. Kaprekar, a schoolteacher in India, described the 6174 routine in 1949. Any four-digit number that does not use one digit four times reaches 6174 in at most seven steps.',
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
    blurb:
      'Add n to the number formed by reversing its digits. Stop when the result reads the same forward and backward. 89 becomes a palindrome in 24 steps. 196 has been carried for millions of digits without one.',
    history:
      '196 is the smallest seed nobody has proved will or will not reach a palindrome. Wade Van Landingham called these stubborn seeds Lychrel numbers, roughly the letters of his name reversed.',
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
    blurb:
      'Start from 1, 1. Each next term is the sum of the two before it: 1, 1, 2, 3, 5, 8, 13, … Successive ratios approach the golden ratio, about 1.618. The Terms box chooses how many to draw.',
    history:
      'Leonardo of Pisa, known as Fibonacci, published the rabbit problem in Liber Abaci in 1202. The same recurrence was already used in Indian prosody, by Pingala and later Virahanka and Hemachandra.',
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
    id: 'subprime-fibonacci',
    name: 'Subprime Fibonacci',
    group: 'Open-ended',
    kind: 'count',
    blurb:
      'Start from 1, 1. Add the last two terms. If that sum is composite, divide it once by its smallest prime factor. 1, 1, 2, 3, 5, 4, 3, 7, 5, 6, …',
    history:
      'John Conway asked what happens if the Fibonacci rule is followed by that division. Many starting pairs fall into a cycle. Whether every pair does is still open.',
    inputLabel: 'Terms',
    defaultInput: 40,
    examples: [20, 40, 60, 80],
    caption: 'sum, then ÷ least prime factor if composite · first N terms',
    generate: (count) =>
      linear(count, [1, 1], (prev) => ({
        next: subprimeReduce(prev[prev.length - 1] + prev[prev.length - 2]),
        rule: 'sum, ÷ smallest prime factor if composite',
      }), `${Math.max(1, count)} terms`),
  },
  {
    id: 'lucas',
    name: 'Lucas',
    group: 'Open-ended',
    kind: 'count',
    blurb:
      'The same addition rule as Fibonacci, with seeds 2, 1: 2, 1, 3, 4, 7, 11, 18, … Successive ratios also approach the golden ratio.',
    history:
      'Édouard Lucas studied this companion sequence in the 19th century. Related Lucas sequences are part of his test for Mersenne primes.',
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
    blurb:
      'Start from 1, 2. Then each term is twice the previous one plus the one before that: 1, 2, 5, 12, 29, 70, … Consecutive ratios approach 1 + √2, and the terms are the whole-number approximations to √2.',
    history:
      'The sequence is tied to the equation x² − 2y² = ±1, studied by Brahmagupta and Bhāskara II. It was later named for John Pell, a 17th-century mathematician.',
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
    blurb:
      'Start from 1, 1, 1. Each term is the sum of the term three steps back and the term two steps back: 1, 1, 1, 2, 2, 3, 4, 5, 7, 9, … The growth rate is the plastic number, about 1.325.',
    history:
      'The architect Dom Hans van der Laan used this recurrence. Richard Padovan described the plastic number, the real root of x³ − x − 1 = 0, which plays the role the golden ratio plays for Fibonacci.',
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
    blurb:
      'Start at 0. At step n, jump backward by n when that landing is positive and still unused. Otherwise jump forward by n. Preferring unused spots behind the current value is what makes the path lurch.',
    history:
      'Bernardo Recamán Santos proposed the sequence to N. J. A. Sloane. It is OEIS A005132. The usual drawing is semicircles on a number line. It is still unknown whether every positive integer appears.',
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
    blurb:
      'Q(1) = Q(2) = 1, and Q(n) = Q(n − Q(n−1)) + Q(n − Q(n−2)). Each term adds two earlier terms, but which ones depends on the values just computed, so the sequence wobbles instead of following a fixed sum.',
    history:
      'Douglas Hofstadter introduced this meta-Fibonacci sequence in Gödel, Escher, Bach (1979). It fluctuates around n/2 even though the rule is exact.',
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
    blurb:
      'The prime numbers in order: 2, 3, 5, 7, 11, … A prime has no divisors other than 1 and itself. Each term is the next integer that has not been crossed off as a multiple.',
    history:
      'Euclid proved there are infinitely many primes. The prime-number theorem says the nth prime is about n log n, so the plot climbs faster than the triangular numbers and slower than Fibonacci.',
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
    blurb:
      'T_k = 1 + 2 + … + k = k(k+1)/2. The first terms are 1, 3, 6, 10, 15, 21, … Each term adds the next integer. These are the counts of dots that fill an equilateral triangle.',
    history:
      'The Pythagoreans studied these figurate numbers. The closed form is the shortcut Carl Friedrich Gauss is said to have used as a schoolboy to sum 1 through 100.',
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
    blurb:
      'Start at 1 and describe the previous term out loud. One 1 becomes 11, two 1s become 21, one 2 and one 1 become 1211, then 111221. The rule reads runs of digits; it does not do arithmetic on the value.',
    history:
      'John Conway studied this sequence in the mid-1980s. He proved the number of digits grows by about 1.303577 each step, Conway’s constant, by splitting every term into 92 common blocks he called atoms.',
    inputLabel: 'Terms',
    defaultInput: 12,
    examples: [8, 10, 12, 15],
    caption: 'read off consecutive digit runs · first N terms',
    generate: (count) => {
      const n = Math.max(1, count)
      const labels = ['1']
      const log10 = [0]
      const values = [1]
      const rules: string[] = ['start']
      let token = '1'
      for (let i = 1; i < n; i++) {
        token = lookAndSay(token)
        if (token.length > MAX_LOOK_DIGITS) {
          return {
            values,
            labels,
            log10,
            truncated: true,
            halt: `stopped at ${values.length} terms`,
            rules,
          }
        }
        labels.push(token)
        log10.push(log10Token(token))
        const asNum = Number(token)
        values.push(Number.isSafeInteger(asNum) ? asNum : 0)
        rules.push('look-and-say')
      }
      return { values, labels, log10, truncated: false, halt: `${values.length} terms`, rules }
    },
  },
  {
    id: 'yellowstone',
    name: 'Yellowstone',
    group: 'Open-ended',
    kind: 'count',
    blurb:
      'Start 1, 2, 3. Each next term is the smallest unused positive integer that shares a factor with the term two back and is coprime to the term just before it.',
    history:
      'The graph of the terms looks like the Yellowstone skyline, which is where the name comes from. David Applegate, Hans Havermann, and N. J. A. Sloane studied it. It is OEIS A098550, and every positive integer appears once.',
    inputLabel: 'Terms',
    defaultInput: 40,
    examples: [20, 40, 60, 100],
    caption: 'gcd(aₙ, aₙ₋₂) > 1 and gcd(aₙ, aₙ₋₁) = 1 · first N terms',
    generate: (count) => {
      const n = Math.max(1, count)
      const seeds = [1, 2, 3]
      const values = seeds.slice(0, n)
      const rules: string[] = values.map((_, i) => (i === 0 ? 'start' : 'seed'))
      const used = new Set(values)
      while (values.length < n) {
        const prev = values[values.length - 1]
        const prev2 = values[values.length - 2]
        let next = 0
        for (let x = 1; x < n * 20 + 100; x++) {
          if (used.has(x)) continue
          if (gcd(x, prev) !== 1) continue
          if (gcd(x, prev2) > 1) {
            next = x
            break
          }
        }
        if (!next || next > SAFE) {
          return { values, truncated: true, halt: 'overflow', rules }
        }
        values.push(next)
        rules.push('shares a factor with n−2, coprime to n−1')
        used.add(next)
      }
      return { values, truncated: false, halt: `${n} terms`, rules }
    },
  },
  {
    id: 'van-eck',
    name: 'Van Eck',
    group: 'Open-ended',
    kind: 'count',
    blurb:
      'Start at 0. If the latest term has appeared before, the next term is how far back that was. If it is new, the next term is 0. Most terms stay small, then a long gap throws a spike.',
    history:
      'Jan van Eck proposed the sequence in 2010. N. J. A. Sloane recorded it as OEIS A181391. The spikes are the interesting part: a quiet stretch ends in a ray whose length is the gap.',
    inputLabel: 'Terms',
    defaultInput: 60,
    examples: [30, 60, 100, 160],
    caption: 'gap since the previous same value, else 0 · first N terms',
    generate: (count) => {
      const n = Math.max(1, count)
      const values = [0]
      const rules = ['start']
      const last = new Map<number, number>()
      for (let i = 1; i < n; i++) {
        const prev = values[i - 1]
        const seenAt = last.get(prev)
        const next = seenAt === undefined ? 0 : i - 1 - seenAt
        last.set(prev, i - 1)
        values.push(next)
        rules.push(next === 0 ? 'new value → 0' : `seen ${next} steps back`)
      }
      return { values, truncated: false, halt: `${n} terms`, rules }
    },
  },
  {
    id: 'stern',
    name: 'Stern diatomic',
    group: 'Open-ended',
    kind: 'count',
    blurb:
      's(0) = 0, s(1) = 1. Even places copy an earlier term, s(2m) = s(m). Odd places add the neighbors, s(2m+1) = s(m) + s(m+1). The result is a fractal of peaks: 0, 1, 1, 2, 1, 3, 2, 3, 1, …',
    history:
      'Moritz Abraham Stern defined this diatomic sequence in 1858. Dijkstra later called the same function fusc. Neighboring terms are always coprime, and every positive rational number occurs once as a ratio of neighbors.',
    inputLabel: 'Terms',
    defaultInput: 64,
    examples: [32, 64, 128, 256],
    caption: 's(2m) = s(m), s(2m+1) = s(m)+s(m+1) · first N terms',
    generate: (count) => {
      const n = Math.max(1, count)
      const values = [0]
      const rules = ['start']
      if (n > 1) {
        values.push(1)
        rules.push('s(1) = 1')
      }
      for (let i = 2; i < n; i++) {
        if (i % 2 === 0) {
          values.push(values[i / 2])
          rules.push('s(2m) = s(m)')
        } else {
          const m = (i - 1) / 2
          values.push(values[m] + values[m + 1])
          rules.push('s(2m+1) = s(m)+s(m+1)')
        }
      }
      return { values, truncated: false, halt: `${n} terms`, rules }
    },
  },
  {
    id: 'ruler',
    name: 'Ruler',
    group: 'Open-ended',
    kind: 'count',
    blurb:
      'For each n = 1, 2, 3, …, take one more than the number of times 2 divides n. Odds are 1. Powers of 2 are the spikes: 1, 2, 1, 3, 1, 2, 1, 4, …',
    history:
      'This is the pattern of tick marks on a ruler: the mark at each halfway point is the longest. It is OEIS A001511, also called the ruler function.',
    inputLabel: 'Terms',
    defaultInput: 64,
    examples: [32, 64, 128, 256],
    caption: '1 + v₂(n) · first N terms',
    generate: (count) => {
      const n = Math.max(1, count)
      const values: number[] = []
      const rules: string[] = []
      for (let k = 1; k <= n; k++) {
        let x = k
        let v = 0
        while (x % 2 === 0) {
          x /= 2
          v += 1
        }
        values.push(v + 1)
        rules.push(k === 1 ? 'start' : `2^${v} divides ${k}`)
      }
      return { values, truncated: false, halt: `${n} terms`, rules }
    },
  },
  {
    id: 'golomb',
    name: 'Golomb',
    group: 'Open-ended',
    kind: 'count',
    blurb:
      'A self-describing sequence: the term at n says how many times n appears. It begins 1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, … Each value is held for a flat stretch, then the radius steps outward.',
    history:
      'Solomon Golomb described this sequence. It is OEIS A001462. The flat stretches are the point of the plot: one radius, held, then a step up.',
    inputLabel: 'Terms',
    defaultInput: 60,
    examples: [30, 60, 100, 160],
    caption: 'a(n) = how many times n appears · first N terms',
    generate: (count) => {
      const n = Math.max(1, count)
      const a = [0, 1]
      const rules = ['start']
      for (let i = 2; i <= n; i++) {
        const next = 1 + a[i - a[a[i - 1]]]
        if (next > SAFE) {
          return { values: a.slice(1), truncated: true, halt: 'overflow', rules }
        }
        a.push(next)
        rules.push('1 + a(n − a(a(n−1)))')
      }
      return { values: a.slice(1), truncated: false, halt: `${n} terms`, rules }
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
  if (def.kind === 'count') return Math.min(Math.floor(n), MAX_STEPS)
  return Math.min(Math.floor(n), MAX_START)
}

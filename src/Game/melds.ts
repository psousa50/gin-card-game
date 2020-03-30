import * as Cards from "../Cards/domain"
import { Card, suits } from "../Cards/model"
import { keys, sort, flatten } from "ramda"
import { calcCardsValue } from "../Cards/domain"
import { lj } from "../utils/misc"

type CardCount = {
  [k: string]: Card[]
}

type SuitCards = {
  [k: string]: Card[]
}

type MeldsAndDeadwood = {
  deadwood: Card[]
  sets: Card[][]
  runs: Card[][]
}

type MeldsAndDeadwoodWithValue = MeldsAndDeadwood & {
  deadwoodValue: number
}

const buildSequences = (sameSuitCards: Card[]): Card[][] => {
  const ordered = sort(Cards.orderBySuit, sameSuitCards)

  const seqs = ordered.reduce((acc, card) => {
    const l = acc.length
    const last = l > 0 ? acc[l - 1] : undefined
    return !last || card.faceValue === last[last.length - 1].faceValue + 1
      ? [...acc.slice(0, l - 1), [...(last || []), card]]
      : [...acc, [card]]
  }, [] as Card[][])

  return seqs.filter(s => s.length >= 3)
}

export const findAllPossibleMelds = (
  cards: Card[],
  cardsToBeOnRuns: Card[] | undefined = undefined,
  cardsOnToBeSets: Card[] | undefined = undefined,
) => {
  const cardsForRuns = cardsOnToBeSets ? cards.filter(Cards.notIn(cardsOnToBeSets)) : cards
  const cardsForSets = cardsToBeOnRuns ? cards.filter(Cards.notIn(cardsToBeOnRuns)) : cards

  const cardsHistogram = cardsForSets.reduce(
    (acc, card) => ({ ...acc, [card.faceValue]: [...(acc[card.faceValue] || []), card] }),
    {} as CardCount,
  )
  const sets = keys(cardsHistogram).reduce(
    (acc, k) => (cardsHistogram[k].length < 3 ? acc : [...acc, cardsHistogram[k]]),
    [] as Card[][],
  )

  const cardSuits = suits.reduce(
    (acc, cur) => ({ ...acc, [cur]: cardsForRuns.filter(Cards.isSuit(cur)) }),
    {} as SuitCards,
  )
  const runs = suits.reduce((acc, suit) => [...acc, ...buildSequences(cardSuits[suit])], [] as Card[][])

  const cardsOnRuns = flatten(runs)
  const cardsOnSets = flatten(sets)

  if (cardsOnToBeSets && cardsOnToBeSets.some(Cards.notIn(cardsOnSets))) {
    return undefined
  }
  if (cardsToBeOnRuns && cardsToBeOnRuns.some(Cards.notIn(cardsOnRuns))) {
    return undefined
  }

  const deadwood = cards.filter(Cards.notIn([...cardsOnRuns, ...cardsOnSets]))

  return {
    deadwood,
    sets,
    runs,
  }
}

const nextPermutation = (permutation: number[]): number[] =>
  permutation.length === 0 ? [1] : permutation[0] === 0 ? [1, ...permutation.slice(1)] : [0, ...nextPermutation(permutation.slice(1))]

export function* permutations (size: number) {
  let p = [] as number[]
  while (p.length <= size) {
    yield p
    p = nextPermutation(p)}
}

export const findMinimalDeadwood = (cards: Card[]) => {
  const { runs, sets } = findAllPossibleMelds(cards)!
  const cardsOnMelds = [...flatten(runs), ...flatten(sets)]
  const cardsOnBothRunsAndSets = cardsOnMelds.reduce(
    (acc, card, i) => (i !== cardsOnMelds.findIndex(Cards.equal(card)) ? [...acc, card] : acc),
    [] as Card[],
  )

  const size = cardsOnBothRunsAndSets.length
  const iterator = permutations(size)
  let allMelds = [] as MeldsAndDeadwoodWithValue[]
  for (const permutation of iterator) {
    const cardsToBeOnRuns = cardsOnBothRunsAndSets.filter((_, i) => (permutation[i] || 0) === 0)
    const cardsToBeOnSets = cardsOnBothRunsAndSets.filter((_, i) => (permutation[i] || 0) === 1)
    const melds = findAllPossibleMelds(cards, cardsToBeOnRuns, cardsToBeOnSets)
    if (melds)
      allMelds.push({ ...melds, deadwoodValue: calcCardsValue(melds.deadwood)})
  }

  const bestValue = allMelds.reduce((acc, meld) => {
    return meld.deadwoodValue < acc ? meld.deadwoodValue : acc
  }, Number.MAX_SAFE_INTEGER)

  return allMelds.filter(m => m.deadwoodValue === bestValue)[0]
}
